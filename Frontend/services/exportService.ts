import { Share, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { BillData } from '@/types/bill';

/**
 * Returns symbol for currency code.
 */
export function getCurrencySymbol(currency?: string): string {
  switch ((currency || '').toUpperCase()) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'INR':
    default:
      return '₹';
  }
}

/**
 * Formats numeric values consistently as currency (e.g. ₹2,300.00).
 */
export function formatCurrency(amount: number | undefined | null, currency = 'INR'): string {
  const num = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  const symbol = getCurrencySymbol(currency);
  const formattedNumber = num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formattedNumber}`;
}

/**
 * HTML Escaper to prevent any injection or rendering issues.
 */
function escapeHtml(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes filename identifier (removes slashes, colons, spaces, etc.)
 */
export function sanitizeFileName(id: string | undefined | null): string {
  return (id || 'bill').replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Generates an A4 portrait, multi-page friendly, professional printable HTML invoice.
 * Designed specifically to avoid browser print clipping, blank pages, and styling bugs.
 */
export function generateBillHtml(bill: BillData, documentTitle?: string): string {
  const currency = bill.currency || 'INR';
  const billId = bill.billNumber || bill.id || 'INV-001';
  const title = documentTitle || `BillSnap_${sanitizeFileName(billId)}.pdf`;

  // Safely extract customer name with fallback
  const customerName = bill.customerName?.trim() || 'General Customer';

  // Format date nicely
  let formattedDate = bill.date || new Date().toISOString().split('T')[0];
  try {
    const d = new Date(bill.date);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  } catch {}

  // Generate table rows
  const items = Array.isArray(bill.items) && bill.items.length > 0 ? bill.items : [];
  const itemsHtml =
    items.length > 0
      ? items
          .map((item, idx) => {
            const qty = item.quantity || 1;
            const price = item.price ?? 0;
            const total = item.total ?? qty * price;
            const itemName = item.name?.trim() || `Item ${idx + 1}`;

            return `
              <tr class="item-row">
                <td class="col-num">${idx + 1}</td>
                <td class="col-name">
                  <div class="item-name">${escapeHtml(itemName)}</div>
                </td>
                <td class="col-qty">${qty}</td>
                <td class="col-price">${formatCurrency(price, currency)}</td>
                <td class="col-total">${formatCurrency(total, currency)}</td>
              </tr>
            `;
          })
          .join('')
      : `
          <tr>
            <td colspan="5" style="text-align: center; padding: 24px; color: #64748B;">
              No line items recorded for this bill.
            </td>
          </tr>
        `;

  // Financial calculations
  const subtotal = bill.subtotal ?? 0;
  const discount = bill.discount ?? 0;
  const tax = bill.tax ?? 0;
  const grandTotal = bill.total ?? subtotal + tax - discount;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    /* -------------------------------------------------------------
       BASE & RESET STYLES (A4 Portrait Optimized)
       ------------------------------------------------------------- */
    @page {
      size: A4 portrait;
      margin: 14mm 16mm 14mm 16mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    html, body {
      background-color: #FFFFFF !important;
      color: #0F172A !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
    }

    .invoice-wrapper {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 20px;
      background: #FFFFFF;
    }

    /* -------------------------------------------------------------
       HEADER SECTION
       ------------------------------------------------------------- */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      border-bottom: 2px solid #2563EB;
      padding-bottom: 16px;
    }

    .brand-col {
      vertical-align: top;
      text-align: left;
    }

    .brand-logo-text {
      font-size: 26px;
      font-weight: 900;
      color: #2563EB;
      letter-spacing: -0.5px;
      line-height: 1.1;
      display: inline-block;
    }

    .brand-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      background: #EFF6FF;
      color: #2563EB;
      border: 1px solid #BFDBFE;
      padding: 2px 7px;
      border-radius: 4px;
      margin-left: 6px;
      vertical-align: middle;
      text-transform: uppercase;
    }

    .brand-desc {
      font-size: 11px;
      color: #64748B;
      margin-top: 4px;
      font-weight: 500;
    }

    .invoice-title-col {
      vertical-align: top;
      text-align: right;
    }

    .invoice-main-heading {
      font-size: 26px;
      font-weight: 900;
      color: #0F172A;
      letter-spacing: 1px;
      line-height: 1;
      margin-bottom: 6px;
    }

    .meta-pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      background-color: #F1F5F9;
      color: #334155;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
    }

    /* -------------------------------------------------------------
       DETAILS SECTION (Billed To & Invoice Meta)
       ------------------------------------------------------------- */
    .details-table {
      width: 100%;
      border-collapse: collapse;
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      margin-bottom: 22px;
    }

    .details-cell {
      padding: 14px 16px;
      vertical-align: top;
      width: 50%;
    }

    .details-cell.right {
      border-left: 1px solid #E2E8F0;
      text-align: right;
    }

    .label-caption {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748B;
      margin-bottom: 4px;
    }

    .entity-name {
      font-size: 16px;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.3;
      word-break: break-word;
    }

    .entity-subtext {
      font-size: 11px;
      color: #64748B;
      margin-top: 3px;
    }

    .meta-line {
      font-size: 12px;
      color: #334155;
      margin-bottom: 3px;
    }

    .meta-line strong {
      color: #0F172A;
      font-weight: 700;
    }

    /* -------------------------------------------------------------
       ITEMS TABLE (Multi-page & Break Compliant)
       ------------------------------------------------------------- */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      page-break-inside: auto;
    }

    .items-table thead {
      display: table-header-group;
    }

    .items-table tfoot {
      display: table-footer-group;
    }

    .items-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    .items-table th {
      background-color: #F1F5F9 !important;
      color: #334155;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border-top: 1px solid #CBD5E1;
      border-bottom: 2px solid #94A3B8;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .item-row td {
      padding: 10px 12px;
      border-bottom: 1px solid #E2E8F0;
      font-size: 13px;
      color: #1E293B;
      vertical-align: middle;
      word-break: break-word;
    }

    .item-row:nth-child(even) td {
      background-color: #FAFAFA;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .col-num {
      width: 38px;
      text-align: center;
      color: #64748B;
      font-size: 12px;
    }

    .col-name {
      text-align: left;
    }

    .item-name {
      font-weight: 700;
      color: #0F172A;
      font-size: 13px;
    }

    .col-qty {
      width: 65px;
      text-align: center;
      font-weight: 600;
      color: #334155;
    }

    .col-price {
      width: 110px;
      text-align: right;
      color: #334155;
      font-weight: 600;
    }

    .col-total {
      width: 120px;
      text-align: right;
      font-weight: 800;
      color: #0F172A;
    }

    /* -------------------------------------------------------------
       SUMMARY & TOTALS SECTION
       ------------------------------------------------------------- */
    .summary-table-wrapper {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: avoid;
      margin-top: 10px;
      margin-bottom: 24px;
    }

    .summary-notes-cell {
      vertical-align: top;
      padding-right: 20px;
      width: 55%;
    }

    .summary-box-cell {
      vertical-align: top;
      width: 45%;
    }

    .notes-card {
      background-color: #F8FAFC;
      border: 1px dashed #CBD5E1;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 11px;
      color: #64748B;
      line-height: 1.5;
    }

    .notes-card strong {
      color: #1E293B;
      display: block;
      margin-bottom: 2px;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }

    .summary-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 14px 18px;
      width: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
      color: #475569;
    }

    .summary-row.discount {
      color: #059669;
      font-weight: 600;
    }

    .summary-row.tax {
      color: #334155;
    }

    .summary-divider {
      height: 1px;
      background-color: #CBD5E1;
      margin: 10px 0;
    }

    .summary-grand-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 17px;
      font-weight: 900;
      color: #0F172A;
      padding-top: 2px;
    }

    .grand-total-amount {
      color: #2563EB;
      font-weight: 900;
    }

    /* -------------------------------------------------------------
       FOOTER
       ------------------------------------------------------------- */
    .invoice-footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 14px;
      text-align: center;
      color: #94A3B8;
      font-size: 11px;
      page-break-inside: avoid;
    }

    .thank-you-msg {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 4px;
    }

    /* -------------------------------------------------------------
       PRINT MEDIA OVERRIDES
       ------------------------------------------------------------- */
    @media print {
      body {
        margin: 0 !important;
        padding: 0 !important;
        background: #FFFFFF !important;
      }
      .invoice-wrapper {
        padding: 0 !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- 1. Header Table -->
    <table class="header-table">
      <tr>
        <td class="brand-col">
          <span class="brand-logo-text">BillSnap</span>
          <span class="brand-badge">Verified</span>
          <div class="brand-desc">Digitized Retail Bill &amp; Tax Invoice</div>
        </td>
        <td class="invoice-title-col">
          <div class="invoice-main-heading">INVOICE</div>
          <div class="meta-pill">#${escapeHtml(billId)}</div>
        </td>
      </tr>
    </table>

    <!-- 2. Customer & Metadata Grid -->
    <table class="details-table">
      <tr>
        <td class="details-cell">
          <div class="label-caption">Billed To</div>
          <div class="entity-name">${escapeHtml(customerName)}</div>
          <div class="entity-subtext">${escapeHtml(bill.category ? 'Category: ' + bill.category : 'Verified Customer Record')}</div>
        </td>
        <td class="details-cell right">
          <div class="meta-line"><strong>Invoice Date:</strong> ${escapeHtml(formattedDate)}</div>
          <div class="meta-line"><strong>Bill ID:</strong> ${escapeHtml(billId)}</div>
          <div class="meta-line"><strong>Currency:</strong> ${escapeHtml(currency)} (${escapeHtml(getCurrencySymbol(currency))})</div>
        </td>
      </tr>
    </table>

    <!-- 3. Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-name">Item Description</th>
          <th class="col-qty">Qty</th>
          <th class="col-price">Unit Price</th>
          <th class="col-total">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- 4. Financial Summary & Notes -->
    <table class="summary-table-wrapper">
      <tr>
        <td class="summary-notes-cell">
          <div class="notes-card">
            <strong>Notes / Verification:</strong>
            ${escapeHtml(bill.notes || 'This invoice has been digitally scanned, mathematically audited, and verified via BillSnap.')}
          </div>
        </td>
        <td class="summary-box-cell">
          <div class="summary-card">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>${formatCurrency(subtotal, currency)}</span>
            </div>
            ${
              discount > 0
                ? `<div class="summary-row discount">
                    <span>Discount (-)</span>
                    <span>-${formatCurrency(discount, currency)}</span>
                  </div>`
                : ''
            }
            ${
              tax > 0
                ? `<div class="summary-row tax">
                    <span>Tax / GST (+)</span>
                    <span>+${formatCurrency(tax, currency)}</span>
                  </div>`
                : ''
            }
            <div class="summary-divider"></div>
            <div class="summary-grand-total">
              <span>Grand Total</span>
              <span class="grand-total-amount">${formatCurrency(grandTotal, currency)}</span>
            </div>
          </div>
        </td>
      </tr>
    </table>

    <!-- 5. Footer -->
    <div class="invoice-footer">
      <div class="thank-you-msg">Thank you for your business!</div>
      <div>Generated digitally via BillSnap • Validated Digital Record</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers clean native print in Web browsers using an isolated hidden iframe.
 * Completely isolates the invoice from React Native Web's #root overflow, modals, and styles.
 * Sets the document title to the filename so Chrome's Save as PDF defaults to BillSnap_<ID>.pdf.
 */
function printHtmlInIframe(html: string, title: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof document === 'undefined') {
        resolve();
        return;
      }

      // 1. Remove previous print iframes if present
      const oldIframe = document.getElementById('billsnap-print-frame');
      if (oldIframe) {
        oldIframe.remove();
      }

      // 2. Create isolated iframe
      const iframe = document.createElement('iframe');
      iframe.id = 'billsnap-print-frame';
      iframe.setAttribute(
        'style',
        'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0; opacity: 0; pointer-events: none; z-index: -9999;'
      );

      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        window.print();
        resolve();
        return;
      }

      // 3. Write complete standalone invoice HTML
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      // 4. Set document title so Chrome uses it as the default PDF filename
      if (iframe.contentWindow?.document) {
        iframe.contentWindow.document.title = title;
      }

      // 5. Trigger print once iframe DOM and fonts are ready
      const executePrint = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (printErr) {
            console.warn('⚠️ iframe.print() error, falling back to window.print():', printErr);
            window.print();
          }
          // Remove iframe after print dialog completes
          setTimeout(() => {
            try {
              iframe.remove();
            } catch {}
            resolve();
          }, 1500);
        }, 300);
      };

      if (iframe.contentWindow?.document.readyState === 'complete') {
        executePrint();
      } else {
        iframe.onload = executePrint;
      }
    } catch (err) {
      console.error('Error during web print iframe:', err);
      window.print();
      resolve();
    }
  });
}

/**
 * Exports Bill as PDF:
 * - On Web: Uses isolated iframe print dialog with A4 layout and default filename.
 * - On Mobile: Uses expo-print printToFileAsync with local file saving.
 */
export async function exportBillAsPdf(bill: BillData): Promise<{ filePath: string; filename: string }> {
  const cleanId = sanitizeFileName(bill.billNumber || bill.id);
  const filename = `BillSnap_${cleanId}.pdf`;
  const html = generateBillHtml(bill, filename);

  if (Platform.OS === 'web') {
    await printHtmlInIframe(html, filename);
    return { filePath: '', filename };
  }

  // Native Mobile (iOS / Android)
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  try {
    const targetPath = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.copyAsync({
      from: uri,
      to: targetPath,
    });
    return { filePath: targetPath, filename };
  } catch (err) {
    return { filePath: uri, filename };
  }
}

/**
 * Exports Bill as CSV and returns file URI or triggers web download.
 */
export async function exportBillAsCsv(bill: BillData): Promise<{ filePath: string; filename: string }> {
  const cleanId = sanitizeFileName(bill.billNumber || bill.id);
  const filename = `BillSnap_${cleanId}.csv`;
  const currency = bill.currency || 'INR';

  const rows: string[] = [];

  // Metadata headers
  rows.push('"INVOICE DETAILS"');
  rows.push(`"Invoice No","${escapeCsv(bill.billNumber || bill.id)}"`);
  rows.push(`"Date","${escapeCsv(bill.date)}"`);
  rows.push(`"Customer/Store","${escapeCsv(bill.customerName || 'General Customer')}"`);
  rows.push(`"Currency","${escapeCsv(currency)}"`);
  rows.push('');

  // Line Items header
  rows.push('"LINE ITEMS"');
  rows.push('"Item #","Item Name","Quantity","Unit Price","Total"');

  const items = Array.isArray(bill.items) ? bill.items : [];
  items.forEach((item, index) => {
    const qty = item.quantity || 1;
    const price = item.price ?? 0;
    const total = item.total ?? qty * price;
    rows.push(
      `${index + 1},"${escapeCsv(item.name || `Item ${index + 1}`)}",${qty},${price.toFixed(2)},${total.toFixed(2)}`
    );
  });

  rows.push('');

  // Summary section
  const subtotal = bill.subtotal ?? 0;
  const tax = bill.tax ?? 0;
  const discount = bill.discount ?? 0;
  const grandTotal = bill.total ?? subtotal + tax - discount;

  rows.push('"FINANCIAL SUMMARY"');
  rows.push(`"Subtotal",${subtotal.toFixed(2)}`);
  rows.push(`"Discount",${discount.toFixed(2)}`);
  rows.push(`"Tax",${tax.toFixed(2)}`);
  rows.push(`"Grand Total",${grandTotal.toFixed(2)}`);

  const csvContent = rows.join('\r\n');

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { filePath: url, filename };
  }

  // Native Mobile
  const targetPath = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(targetPath, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { filePath: targetPath, filename };
}

function escapeCsv(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '';
  return String(field).replace(/"/g, '""');
}

/**
 * Exports Bill as JSON and returns file URI or triggers web download.
 */
export async function exportBillAsJson(bill: BillData): Promise<{ filePath: string; filename: string }> {
  const cleanId = sanitizeFileName(bill.billNumber || bill.id);
  const filename = `BillSnap_${cleanId}.json`;

  const subtotal = bill.subtotal ?? 0;
  const tax = bill.tax ?? 0;
  const discount = bill.discount ?? 0;
  const grandTotal = bill.total ?? subtotal + tax - discount;

  const exportObject = {
    app: 'BillSnap',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    bill: {
      id: bill.id,
      billNumber: bill.billNumber || bill.id,
      date: bill.date,
      customerName: bill.customerName || 'General Customer',
      items: (bill.items || []).map((it, idx) => ({
        index: idx + 1,
        name: it.name || `Item ${idx + 1}`,
        quantity: it.quantity || 1,
        unitPrice: it.price ?? 0,
        total: it.total ?? (it.quantity || 1) * (it.price ?? 0),
      })),
      subtotal,
      tax,
      discount,
      grandTotal,
      currency: bill.currency || 'INR',
      originalImageUrl: bill.imageUri || null,
      notes: bill.notes || null,
      createdAt: bill.createdAt,
    },
  };

  const jsonContent = JSON.stringify(exportObject, null, 2);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { filePath: url, filename };
  }

  // Native Mobile
  const targetPath = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(targetPath, jsonContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { filePath: targetPath, filename };
}

/**
 * Native File Sharing for PDF, CSV, and JSON.
 */
export async function shareExportedFile(
  filePath: string,
  filename: string,
  mimeType: string
): Promise<void> {
  if (Platform.OS === 'web') {
    // In web browsers, file downloads and iframe prints are triggered directly
    return;
  }

  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (isSharingAvailable && filePath) {
    await Sharing.shareAsync(filePath, {
      mimeType,
      dialogTitle: `Share ${filename}`,
      UTI: mimeType,
    });
  } else if (filePath) {
    await Share.share({
      url: filePath,
      title: filename,
      message: `BillSnap Invoice: ${filename}`,
    });
  }
}

/**
 * Quick text receipt sharing (great for messaging apps like WhatsApp or SMS)
 */
export async function shareBillAsText(bill: BillData): Promise<void> {
  const currency = bill.currency || 'INR';
  const symbol = getCurrencySymbol(currency);
  const items = Array.isArray(bill.items) ? bill.items : [];

  const itemsText = items
    .map((it) => `• ${it.name} (${it.quantity} × ${formatCurrency(it.price, currency)}) = ${formatCurrency(it.total, currency)}`)
    .join('\n');

  const subtotal = bill.subtotal ?? 0;
  const tax = bill.tax ?? 0;
  const discount = bill.discount ?? 0;
  const grandTotal = bill.total ?? subtotal + tax - discount;

  const message = [
    `🧾 *BillSnap Invoice*`,
    `Invoice: ${bill.billNumber || bill.id}`,
    `Date: ${bill.date}`,
    `Customer: ${bill.customerName || 'General Customer'}`,
    `--------------------------`,
    itemsText || '• (No items)',
    `--------------------------`,
    `Subtotal: ${formatCurrency(subtotal, currency)}`,
    discount > 0 ? `Discount: -${formatCurrency(discount, currency)}` : null,
    tax > 0 ? `Tax/GST: +${formatCurrency(tax, currency)}` : null,
    `*Grand Total: ${formatCurrency(grandTotal, currency)}*`,
    `\nDigitized with BillSnap`,
  ]
    .filter(Boolean)
    .join('\n');

  await Share.share({
    title: `BillSnap Invoice ${bill.billNumber || bill.id}`,
    message,
  });
}
