import mongoose from 'mongoose';
import { preprocessBillImage } from '../services/imagePreprocessor.js';
import { extractBillWithVision } from '../services/aiVisionService.js';
import { Bill } from '../models/Bill.js';

/**
 * Normalizes field structure to { value, confidence }.
 */
function normalizeField(field, defaultValue = null, defaultConfidence = 'medium') {
  if (field && typeof field === 'object' && 'value' in field) {
    return {
      value: field.value !== undefined ? field.value : defaultValue,
      confidence: ['high', 'medium', 'low'].includes(field.confidence) ? field.confidence : defaultConfidence,
    };
  }
  return {
    value: field !== undefined ? field : defaultValue,
    confidence: defaultConfidence,
  };
}

/**
 * Controller to process bill images, extract handwritten details via Vision AI,
 * and programmatically audit calculations and field confidence.
 */
export async function extractBill(req, res) {
  try {
    let buffer;
    let mimetype = 'image/jpeg';
    let originalname = 'uploaded_bill.jpg';
    let size = 0;

    if (req.file) {
      buffer = req.file.buffer;
      mimetype = req.file.mimetype;
      originalname = req.file.originalname;
      size = req.file.size;
    } else if (req.body && (req.body.imageBase64 || req.body.image || req.body.bill)) {
      const rawData = req.body.imageBase64 || req.body.image || req.body.bill;
      if (typeof rawData === 'string' && rawData.startsWith('data:image/')) {
        const matches = rawData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimetype = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
          size = buffer.length;
        }
      } else if (typeof rawData === 'string' && rawData.length > 50) {
        buffer = Buffer.from(rawData, 'base64');
        size = buffer.length;
      }
    }

    if (!buffer) {
      return res.status(400).json({
        success: false,
        error: 'No bill image provided. Please upload an image using form field "bill" or "image".',
      });
    }

    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];
    if (!allowedMimeTypes.includes(mimetype.toLowerCase()) && !mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file type "${mimetype}". Please upload a JPEG, PNG, or WEBP image.`,
      });
    }

    console.log(`📥 Received bill image: ${originalname || 'unnamed'} (${(size / 1024).toFixed(1)} KB)`);

    // 1. Preprocess the image (orient, normalize contrast, sharpen, resize)
    const { processedBuffer, mimeType: processedMimeType } = await preprocessBillImage(buffer, mimetype);

    // 2. Call AI Vision service
    const rawExtraction = await extractBillWithVision(processedBuffer, processedMimeType);

    // 3. Mathematical validation and verification audit
    const verificationRequired = new Set();
    const inconsistencies = [];

    // Normalize top-level fields
    const dateField = normalizeField(rawExtraction.date, '', 'medium');
    const customerField = normalizeField(rawExtraction.customerName, '', 'medium');
    const billNumberField = normalizeField(rawExtraction.billNumber, '', 'medium');

    if (!dateField.value || dateField.confidence === 'low' || dateField.confidence === 'medium') {
      verificationRequired.add('date');
    }
    if (!customerField.value || customerField.confidence === 'low' || customerField.confidence === 'medium') {
      verificationRequired.add('customerName');
    }

    // Process & audit line items
    const rawItems = Array.isArray(rawExtraction.items) ? rawExtraction.items : [];
    const auditedItems = rawItems.map((item, index) => {
      const nameField = normalizeField(item.name, null, 'medium');
      const qtyField = normalizeField(item.quantity, null, 'medium');
      const unitPriceField = normalizeField(item.unitPrice, null, 'medium');
      const totalField = normalizeField(item.total, null, 'medium');

      // Convert numeric values safely
      const qtyNum = qtyField.value !== null ? parseFloat(qtyField.value) : null;
      const priceNum = unitPriceField.value !== null ? parseFloat(unitPriceField.value) : null;
      const totalNum = totalField.value !== null ? parseFloat(totalField.value) : null;

      let mathMismatch = false;

      // Check: quantity * unitPrice == total
      if (qtyNum !== null && priceNum !== null && totalNum !== null) {
        const expectedTotal = Math.round(qtyNum * priceNum * 100) / 100;
        const diff = Math.abs(expectedTotal - totalNum);

        if (diff > 0.05) {
          mathMismatch = true;
          const issueMsg = `Item "${nameField.value || index + 1}": written Qty (${qtyNum}) × Unit Price (₹${priceNum}) = ₹${expectedTotal}, but written Total is ₹${totalNum}.`;
          inconsistencies.push(issueMsg);
          console.warn(`⚠️ [Verification Warning] ${issueMsg}`);

          // Lower confidence when numbers don't add up
          qtyField.confidence = 'low';
          unitPriceField.confidence = 'low';
          totalField.confidence = 'medium';

          verificationRequired.add(`items[${index}].quantity`);
          verificationRequired.add(`items[${index}].unitPrice`);
          verificationRequired.add(`items[${index}].total`);
        }
      }

      // Check for unreadable / low confidence fields
      if (nameField.value === null || nameField.confidence === 'low' || nameField.confidence === 'medium') {
        verificationRequired.add(`items[${index}].name`);
      }
      if (qtyNum === null || qtyField.confidence === 'low' || qtyField.confidence === 'medium') {
        verificationRequired.add(`items[${index}].quantity`);
      }
      if (priceNum === null || unitPriceField.confidence === 'low' || unitPriceField.confidence === 'medium') {
        verificationRequired.add(`items[${index}].unitPrice`);
      }
      if (totalNum === null || totalField.confidence === 'low' || totalField.confidence === 'medium') {
        verificationRequired.add(`items[${index}].total`);
      }

      // If price is missing but total and qty are valid, auto-calculate
      let resolvedPrice = priceNum;
      if (resolvedPrice === null && totalNum !== null && qtyNum !== null && qtyNum > 0) {
        resolvedPrice = Math.round((totalNum / qtyNum) * 100) / 100;
        unitPriceField.value = resolvedPrice;
        unitPriceField.confidence = 'medium';
      }

      // If total is missing but price and qty are valid, auto-calculate
      let resolvedTotal = totalNum;
      if (resolvedTotal === null && resolvedPrice !== null && qtyNum !== null) {
        resolvedTotal = Math.round(qtyNum * resolvedPrice * 100) / 100;
        totalField.value = resolvedTotal;
        totalField.confidence = 'medium';
      }

      return {
        id: `item-${Date.now()}-${index}`,
        name: nameField,
        quantity: { ...qtyField, value: qtyNum !== null ? qtyNum : 1 },
        unitPrice: { ...unitPriceField, value: resolvedPrice !== null ? resolvedPrice : 0 },
        total: { ...totalField, value: resolvedTotal !== null ? resolvedTotal : 0 },
        // Flat compatibility helpers for frontend editing
        rawName: nameField.value || 'Item',
        rawQuantity: qtyNum !== null ? qtyNum : 1,
        rawPrice: resolvedPrice !== null ? resolvedPrice : 0,
        rawTotal: resolvedTotal !== null ? resolvedTotal : 0,
        mathMismatch,
      };
    });

    // Subtotal audit
    const computedSubtotal = auditedItems.reduce((acc, it) => acc + (it.total.value || 0), 0);
    const subtotalField = normalizeField(rawExtraction.subtotal, computedSubtotal, 'medium');
    const extractedSubtotal = subtotalField.value !== null ? parseFloat(subtotalField.value) : null;

    if (extractedSubtotal !== null && Math.abs(computedSubtotal - extractedSubtotal) > 0.05) {
      const subMsg = `Subtotal mismatch: Sum of item totals is ₹${computedSubtotal.toFixed(2)}, but written Subtotal is ₹${extractedSubtotal.toFixed(2)}.`;
      inconsistencies.push(subMsg);
      console.warn(`⚠️ [Verification Warning] ${subMsg}`);
      subtotalField.confidence = 'low';
      verificationRequired.add('subtotal');
    }

    // Taxes and Discounts
    const taxField = normalizeField(rawExtraction.tax, 0, 'high');
    const discountField = normalizeField(rawExtraction.discount, 0, 'high');
    const taxVal = taxField.value ? parseFloat(taxField.value) : 0;
    const discountVal = discountField.value ? parseFloat(discountField.value) : 0;

    // Grand total audit
    const baseSubtotal = extractedSubtotal !== null ? extractedSubtotal : computedSubtotal;
    const computedGrandTotal = Math.round((baseSubtotal + taxVal - discountVal) * 100) / 100;
    const grandTotalField = normalizeField(rawExtraction.grandTotal, computedGrandTotal, 'medium');
    const extractedGrandTotal = grandTotalField.value !== null ? parseFloat(grandTotalField.value) : null;

    if (extractedGrandTotal !== null && Math.abs(computedGrandTotal - extractedGrandTotal) > 0.05) {
      const grandMsg = `Grand Total mismatch: Calculated ₹${computedGrandTotal.toFixed(2)} (Subtotal ${baseSubtotal} + Tax ${taxVal} - Discount ${discountVal}), but written Grand Total is ₹${extractedGrandTotal.toFixed(2)}.`;
      inconsistencies.push(grandMsg);
      console.warn(`⚠️ [Verification Warning] ${grandMsg}`);
      grandTotalField.confidence = 'low';
      verificationRequired.add('grandTotal');
    }

    const structuredBill = {
      date: dateField,
      customerName: customerField,
      billNumber: billNumberField,
      items: auditedItems,
      subtotal: {
        value: Math.round((extractedSubtotal !== null ? extractedSubtotal : computedSubtotal) * 100) / 100,
        confidence: subtotalField.confidence,
      },
      tax: {
        value: Math.round(taxVal * 100) / 100,
        confidence: taxField.confidence,
      },
      discount: {
        value: Math.round(discountVal * 100) / 100,
        confidence: discountField.confidence,
      },
      grandTotal: {
        value: Math.round((extractedGrandTotal !== null ? extractedGrandTotal : computedGrandTotal) * 100) / 100,
        confidence: grandTotalField.confidence,
      },
      currency: rawExtraction.currency || 'INR',
      notes: rawExtraction.notes || null,
      // Flat properties for seamless frontend consumption:
      flat: {
        date: dateField.value || new Date().toISOString().split('T')[0],
        customerName: customerField.value || 'General Store',
        billNumber: billNumberField.value || `INV-${Date.now().toString().slice(-4)}`,
        subtotal: Math.round(computedSubtotal * 100) / 100,
        tax: taxVal,
        total: Math.round((extractedGrandTotal !== null ? extractedGrandTotal : computedGrandTotal) * 100) / 100,
      },
    };

    const verificationArray = Array.from(verificationRequired);

    console.log(`✅ Extracted ${auditedItems.length} items. Verification required on: [${verificationArray.join(', ') || 'none'}]`);

    return res.status(200).json({
      success: true,
      message: 'Bill extracted and verified successfully',
      data: structuredBill,
      verificationRequired: verificationArray,
      inconsistencies,
    });
  } catch (error) {
    console.error('❌ Error in extractBill controller:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract bill data from image.',
    });
  }
}

// -------------------------------------------------------------
// HELPER: Validate and Recalculate Totals on the Backend
// -------------------------------------------------------------
function sanitizeAndCalculateBillData(body) {
  const rawCustomer = String(body.customerName || '').trim();
  if (!rawCustomer) {
    throw new Error('Customer or merchant name is required.');
  }
  const customerName = rawCustomer.slice(0, 200);

  const date = String(body.date || new Date().toISOString().split('T')[0]).trim().slice(0, 50);
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 500) : [];

  if (rawItems.length === 0) {
    throw new Error('Bill must contain at least one line item.');
  }

  // Recalculate line items independently
  const items = rawItems.map((it, idx) => {
    const rawName = String(it.name || `Item ${idx + 1}`).trim();
    const name = rawName.slice(0, 200);
    const quantity = Math.min(1000000, Math.max(0.01, parseFloat(it.quantity) || 1));
    const unitPrice = Math.min(100000000, Math.max(0, parseFloat(it.price ?? it.unitPrice) || 0));
    const total = Math.round(quantity * unitPrice * 100) / 100;

    return {
      name,
      quantity,
      unitPrice,
      total,
    };
  });

  // Recalculate Subtotal
  const subtotal = Math.round(items.reduce((acc, it) => acc + it.total, 0) * 100) / 100;

  // Validate Tax and Discount
  const tax = Math.min(100000000, Math.max(0, parseFloat(body.tax) || 0));
  const discount = Math.min(100000000, Math.max(0, parseFloat(body.discount) || 0));

  // Recalculate Grand Total
  const grandTotal = Math.max(0, Math.round((subtotal + tax - discount) * 100) / 100);

  const billNumber = body.billNumber ? String(body.billNumber).trim().slice(0, 100) : undefined;
  const currency = body.currency ? String(body.currency).toUpperCase().trim().slice(0, 10) : 'INR';
  const notes = body.notes ? String(body.notes).trim().slice(0, 1000) : null;
  const category = body.category ? String(body.category).trim().slice(0, 100) : 'General';

  return {
    billNumber,
    date,
    customerName,
    items,
    subtotal,
    tax: Math.round(tax * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    grandTotal,
    currency,
    originalImageUrl: body.imageUri || body.originalImageUrl || null,
    notes,
    category,
  };
}

// -------------------------------------------------------------
// CRUD ENDPOINTS
// -------------------------------------------------------------

/**
 * POST /api/bills
 * Save a reviewed and verified bill to the database.
 */
export async function createBill(req, res) {
  try {
    const validatedData = sanitizeAndCalculateBillData(req.body);

    const newBill = new Bill(validatedData);
    const savedBill = await newBill.save();

    console.log(`💾 [DB] Bill saved successfully: ${savedBill.billNumber} (${savedBill.id}), Grand Total: ${savedBill.currency} ${savedBill.grandTotal}`);

    return res.status(201).json({
      success: true,
      message: 'Bill saved successfully',
      data: savedBill,
    });
  } catch (error) {
    console.error('❌ Error saving bill:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to save bill to database.',
    });
  }
}

/**
 * GET /api/bills
 * Fetch saved bills with search, date & amount filters, sorting, and pagination.
 *
 * Query parameters supported:
 * - search: matches customerName, billNumber, or items.name (case-insensitive)
 * - startDate: YYYY-MM-DD minimum bill date
 * - endDate: YYYY-MM-DD maximum bill date
 * - minTotal: minimum grand total
 * - maxTotal: maximum grand total
 * - sort: 'newest' | 'oldest' | 'highest' | 'lowest' (default: 'newest')
 * - page: page number (default: 1)
 * - limit: items per page (default: 10, max: 100)
 */
export async function getAllBills(req, res) {
  try {
    const {
      search,
      startDate,
      endDate,
      minTotal,
      maxTotal,
      sort = 'newest',
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    // 1. Sanitize & build search query (checks customer name, bill number, or item names)
    if (typeof search === 'string' && search.trim().length > 0) {
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitizedSearch, 'i');

      const orConditions = [
        { customerName: searchRegex },
        { billNumber: searchRegex },
        { 'items.name': searchRegex },
      ];

      // If valid Mongo ObjectId, also allow direct ID lookup
      if (/^[0-9a-fA-F]{24}$/.test(search.trim())) {
        orConditions.push({ _id: search.trim() });
      }

      filter.$or = orConditions;
    }

    // 2. Date range filter (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate && typeof startDate === 'string' && dateRegex.test(startDate.trim())) {
        filter.date.$gte = startDate.trim();
      }
      if (endDate && typeof endDate === 'string' && dateRegex.test(endDate.trim())) {
        filter.date.$lte = endDate.trim();
      }
      if (Object.keys(filter.date).length === 0) {
        delete filter.date;
      }
    }

    // 3. Amount range filter (minTotal, maxTotal)
    const parsedMin = minTotal !== undefined && minTotal !== '' ? parseFloat(minTotal) : null;
    const parsedMax = maxTotal !== undefined && maxTotal !== '' ? parseFloat(maxTotal) : null;

    if ((parsedMin !== null && !isNaN(parsedMin)) || (parsedMax !== null && !isNaN(parsedMax))) {
      filter.grandTotal = {};
      if (parsedMin !== null && !isNaN(parsedMin)) {
        filter.grandTotal.$gte = Math.max(0, parsedMin);
      }
      if (parsedMax !== null && !isNaN(parsedMax)) {
        filter.grandTotal.$lte = Math.max(0, parsedMax);
      }
    }

    // 4. Sorting options
    let sortCriteria = { date: -1, createdAt: -1 };
    switch (String(sort).toLowerCase()) {
      case 'oldest':
        sortCriteria = { date: 1, createdAt: 1 };
        break;
      case 'highest':
        sortCriteria = { grandTotal: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortCriteria = { grandTotal: 1, createdAt: 1 };
        break;
      case 'newest':
      default:
        sortCriteria = { date: -1, createdAt: -1 };
        break;
    }

    // 5. Pagination calculation
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Run count and query in parallel for efficiency
    const [total, bills] = await Promise.all([
      Bill.countDocuments(filter),
      Bill.find(filter)
        .sort(sortCriteria)
        .skip(skip)
        .limit(limitNum),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;
    const hasMore = pageNum < totalPages;

    return res.status(200).json({
      success: true,
      count: bills.length,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore,
      },
      data: bills,
    });
  } catch (error) {
    console.error('❌ Error fetching bills:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve bills from database.',
    });
  }
}

/**
 * GET /api/bills/:id
 * Fetch a single bill by its ID.
 */
export async function getBillById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid bill ID format "${id}".`,
      });
    }

    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        error: `Bill with ID "${id}" was not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: bill,
    });
  } catch (error) {
    console.error(`❌ Error fetching bill ${req.params.id}:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve bill.',
    });
  }
}

/**
 * PUT /api/bills/:id
 * Update an existing bill.
 */
export async function updateBill(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid bill ID format "${id}".`,
      });
    }

    const validatedData = sanitizeAndCalculateBillData(req.body);

    const updatedBill = await Bill.findByIdAndUpdate(
      id,
      { $set: validatedData },
      { new: true, runValidators: true }
    );

    if (!updatedBill) {
      return res.status(404).json({
        success: false,
        error: `Bill with ID "${id}" was not found.`,
      });
    }

    console.log(`✏️ [DB] Bill updated: ${updatedBill.billNumber} (${updatedBill.id})`);

    return res.status(200).json({
      success: true,
      message: 'Bill updated successfully',
      data: updatedBill,
    });
  } catch (error) {
    console.error(`❌ Error updating bill ${req.params.id}:`, error.message);
    return res.status(400).json({
      success: false,
      error: error.message || 'Failed to update bill.',
    });
  }
}

/**
 * DELETE /api/bills/:id
 * Delete a bill from the database.
 */
export async function deleteBill(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid bill ID format "${id}".`,
      });
    }

    const deletedBill = await Bill.findByIdAndDelete(id);

    if (!deletedBill) {
      return res.status(404).json({
        success: false,
        error: `Bill with ID "${id}" was not found.`,
      });
    }

    console.log(`🗑️ [DB] Bill deleted: ${deletedBill.billNumber} (${deletedBill.id})`);

    return res.status(200).json({
      success: true,
      message: 'Bill deleted successfully',
    });
  } catch (error) {
    console.error(`❌ Error deleting bill ${req.params.id}:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete bill.',
    });
  }
}

