import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    // Listen on random available port for isolated testing
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => {
    server.close(resolve);
  });
});

// -------------------------------------------------------------
// 1. HEALTH & ROUTE SECURITY
// -------------------------------------------------------------
test('GET /api/health returns 200 with online status', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'success');
  assert.equal(json.message, 'BillSnap Backend API is running');
});

test('GET /unknown-endpoint returns 404 JSON (no stack trace, no HTML)', async () => {
  const res = await fetch(`${baseUrl}/api/non-existent-route-xyz`);
  assert.equal(res.status, 404);
  const json = await res.json();
  assert.equal(json.success, false);
  assert.match(json.error, /Cannot GET/);
});

// -------------------------------------------------------------
// 2. INVALID ID SAFETY (PREVENTS 500 CASTERRORS)
// -------------------------------------------------------------
test('GET /api/bills/:id with invalid ObjectId returns 400 Bad Request', async () => {
  const res = await fetch(`${baseUrl}/api/bills/invalid-id-123`);
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.success, false);
  assert.match(json.error, /Invalid bill ID format/);
});

test('PUT /api/bills/:id with invalid ObjectId returns 400 Bad Request', async () => {
  const res = await fetch(`${baseUrl}/api/bills/invalid-id-123`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerName: 'Test' }),
  });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.success, false);
  assert.match(json.error, /Invalid bill ID format/);
});

test('DELETE /api/bills/:id with invalid ObjectId returns 400 Bad Request', async () => {
  const res = await fetch(`${baseUrl}/api/bills/invalid-id-123`, {
    method: 'DELETE',
  });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.success, false);
  assert.match(json.error, /Invalid bill ID format/);
});

// -------------------------------------------------------------
// 3. INPUT VALIDATION & TOTAL INTEGRITY
// -------------------------------------------------------------
test('POST /api/bills rejects empty customerName with 400 Bad Request', async () => {
  const res = await fetch(`${baseUrl}/api/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: '',
      items: [{ name: 'Rice', quantity: 1, price: 100 }],
    }),
  });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.success, false);
  assert.match(json.error, /Customer or merchant name is required/);
});

test('POST /api/bills rejects empty items list with 400 Bad Request', async () => {
  const res = await fetch(`${baseUrl}/api/bills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Rohit Sharma',
      items: [],
    }),
  });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.success, false);
  assert.match(json.error, /at least one line item/);
});

// -------------------------------------------------------------
// 4. IMAGE UPLOAD SECURITY
// -------------------------------------------------------------
test('POST /api/bills/extract with no image returns 400 Bad Request', async () => {
  const res = await fetch(`${baseUrl}/api/bills/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.success, false);
  assert.match(json.error, /No bill image provided/);
});

test('POST /api/bills/extract with text file upload is rejected by multer filter', async () => {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="bill"; filename="malicious.txt"',
    'Content-Type: text/plain',
    '',
    'This is a text file, not an image.',
    `--${boundary}--`,
    '',
  ].join('\r\n');

  const res = await fetch(`${baseUrl}/api/bills/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.success, false);
  assert.match(json.error, /Unsupported file type/);
});

// -------------------------------------------------------------
// 5. AI EXTRACTION CONFIDENCE & RESILIENCE
// -------------------------------------------------------------
test('AI vision extraction returns structured schema with confidence fields', async () => {
  const { extractBillWithVision } = await import('../src/services/aiVisionService.js');
  // Small 1x1 test JPEG buffer
  const sampleBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
  
  const result = await extractBillWithVision(sampleBuffer, 'image/jpeg');
  assert.ok(result);
  assert.ok(result.items);
  assert.ok(Array.isArray(result.items));
  assert.ok(result.items.length > 0);
  
  // Verify field structure { value, confidence }
  const firstItem = result.items[0];
  assert.ok(firstItem.name);
  assert.ok(['high', 'medium', 'low'].includes(firstItem.name.confidence));
  assert.ok(firstItem.quantity);
  assert.ok(['high', 'medium', 'low'].includes(firstItem.quantity.confidence));
  assert.ok(firstItem.unitPrice);
  assert.ok(['high', 'medium', 'low'].includes(firstItem.unitPrice.confidence));
  assert.ok(firstItem.total);
  assert.ok(['high', 'medium', 'low'].includes(firstItem.total.confidence));
});

