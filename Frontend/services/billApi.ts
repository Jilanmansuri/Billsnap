import { Platform } from 'react-native';
import { API_ENDPOINTS } from '@/constants/config';
import { BillData, BillItem, FieldConfidence, BillQueryParams, PaginatedBillsResponse, PaginationMeta } from '@/types/bill';

export interface ExtractBillResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  verificationRequired?: string[];
  inconsistencies?: string[];
}

/**
 * Uploads captured/selected bill image to backend Vision AI extraction endpoint.
 * Returns parsed BillData with field-level confidence ratings and verification flags.
 */
export async function uploadAndExtractBill(imageUri: string): Promise<BillData> {
  const formData = new FormData();

  const filename = imageUri.split('/').pop() || `bill_${Date.now()}.jpg`;
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  // Handle Web browser vs Mobile React Native file upload
  if (Platform.OS === 'web') {
    try {
      const blobRes = await fetch(imageUri);
      const blob = await blobRes.blob();
      formData.append('bill', blob, filename);
      formData.append('image', blob, filename);
    } catch (blobErr) {
      console.warn('⚠️ Web blob fetch failed, falling back to raw URI:', blobErr);
      formData.append('bill', imageUri);
    }
  } else {
    // React Native mobile representation for multipart/form-data
    const fileToUpload: any = {
      uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
      name: filename,
      type: mimeType,
    };
    formData.append('bill', fileToUpload);
    formData.append('image', fileToUpload);
  }

  console.log(`📡 Uploading bill to ${API_ENDPOINTS.EXTRACT_BILL}...`);

  // 45s timeout for AI Vision processing
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(API_ENDPOINTS.EXTRACT_BILL, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    const resultText = await response.text();
    let jsonResult: ExtractBillResponse;

    try {
      jsonResult = JSON.parse(resultText);
    } catch {
      throw new Error(
        `Server returned non-JSON response (${response.status}): ${resultText.slice(0, 120)}`
      );
    }

    if (!response.ok || !jsonResult.success || !jsonResult.data) {
      throw new Error(jsonResult.error || `Extraction failed with status ${response.status}`);
    }

    const raw = jsonResult.data;

    // Helper to safely extract value from either { value, confidence } or primitive
    const getVal = (field: any, defaultVal: any = '') => {
      if (field && typeof field === 'object' && 'value' in field) {
        return field.value !== null && field.value !== undefined ? field.value : defaultVal;
      }
      return field !== null && field !== undefined ? field : defaultVal;
    };

    const getConf = (field: any, defaultConf: FieldConfidence = 'medium'): FieldConfidence => {
      if (field && typeof field === 'object' && 'confidence' in field) {
        return field.confidence || defaultConf;
      }
      return defaultConf;
    };

    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const mappedItems: BillItem[] = rawItems.map((it: any, idx: number) => {
      const nameVal = getVal(it.name, `Item ${idx + 1}`);
      const qtyVal = Number(getVal(it.quantity, 1)) || 1;
      const priceVal = Number(getVal(it.unitPrice ?? it.price, 0)) || 0;
      const totalVal = Number(getVal(it.total, qtyVal * priceVal)) || qtyVal * priceVal;

      return {
        id: it.id || `item-${Date.now()}-${idx}`,
        name: String(nameVal),
        quantity: qtyVal,
        price: priceVal,
        total: Math.round(totalVal * 100) / 100,
        confidence: {
          name: getConf(it.name),
          quantity: getConf(it.quantity),
          price: getConf(it.unitPrice ?? it.price),
          total: getConf(it.total),
        },
        mathMismatch: it.mathMismatch || false,
      };
    });

    const subtotalVal = Number(getVal(raw.subtotal, 0)) || 0;
    const taxVal = Number(getVal(raw.tax, 0)) || 0;
    const discountVal = Number(getVal(raw.discount, 0)) || 0;
    const totalVal = Number(getVal(raw.grandTotal ?? raw.total, subtotalVal + taxVal - discountVal)) || subtotalVal;

    const billData: BillData = {
      id: `bill-${Date.now()}`,
      billNumber: String(getVal(raw.billNumber, `INV-${Date.now().toString().slice(-4)}`)),
      date: String(getVal(raw.date, new Date().toISOString().split('T')[0])),
      customerName: String(getVal(raw.customerName, '')),
      items: mappedItems,
      subtotal: Math.round(subtotalVal * 100) / 100,
      tax: Math.round(taxVal * 100) / 100,
      discount: Math.round(discountVal * 100) / 100,
      total: Math.round(totalVal * 100) / 100,
      imageUri: imageUri,
      createdAt: 'Just now',
      verificationRequired: jsonResult.verificationRequired || [],
      inconsistencies: jsonResult.inconsistencies || [],
      fieldConfidence: {
        date: getConf(raw.date),
        customerName: getConf(raw.customerName),
        billNumber: getConf(raw.billNumber),
        subtotal: getConf(raw.subtotal),
        total: getConf(raw.grandTotal ?? raw.total),
      },
    };

    return billData;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. The Vision AI model took too long to respond.');
    }
    console.error('❌ uploadAndExtractBill error:', error);
    throw error;
  }
}

/**
 * Normalizes backend Bill document to frontend BillData
 */
function normalizeBackendBill(item: any): BillData {
  const items = (item.items || []).map((it: any, idx: number) => ({
    id: it.id || it._id || `item-${idx}`,
    name: it.name || `Item ${idx + 1}`,
    quantity: it.quantity || 1,
    price: it.unitPrice ?? it.price ?? 0,
    total: it.total ?? ((it.quantity || 1) * (it.unitPrice ?? it.price ?? 0)),
  }));

  return {
    id: item.id || item._id,
    billNumber: item.billNumber || `INV-${(item.id || '').slice(-4)}`,
    date: item.date || new Date().toISOString().split('T')[0],
    customerName: item.customerName || 'General Customer',
    items,
    subtotal: item.subtotal || 0,
    tax: item.tax || 0,
    discount: item.discount || 0,
    total: item.grandTotal ?? item.total ?? 0,
    currency: item.currency || 'INR',
    category: item.category || undefined,
    notes: item.notes || undefined,
    imageUri: item.originalImageUrl || undefined,
    createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently',
  };
}

/**
 * POST /api/bills
 * Saves verified bill to persistent backend database
 */
export async function saveVerifiedBill(billData: BillData): Promise<BillData> {
  const payload = {
    billNumber: billData.billNumber,
    date: billData.date,
    customerName: billData.customerName,
    items: billData.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      unitPrice: it.price,
      total: it.total,
    })),
    subtotal: billData.subtotal,
    tax: billData.tax,
    discount: billData.discount,
    grandTotal: billData.total,
    currency: billData.currency || 'INR',
    imageUri: billData.imageUri,
    originalImageUrl: billData.imageUri,
  };

  const response = await fetch(API_ENDPOINTS.BILLS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || `Failed to save bill (${response.status})`);
  }

  return normalizeBackendBill(json.data);
}

/**
 * GET /api/bills
 * Retrieves saved bills with optional search, date/amount filters, sorting, and pagination.
 */
export async function fetchBills(params?: BillQueryParams): Promise<PaginatedBillsResponse> {
  const queryParts: string[] = [];
  if (params) {
    if (params.search?.trim()) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
    if (params.startDate?.trim()) queryParts.push(`startDate=${encodeURIComponent(params.startDate.trim())}`);
    if (params.endDate?.trim()) queryParts.push(`endDate=${encodeURIComponent(params.endDate.trim())}`);
    if (params.minTotal !== undefined && !isNaN(params.minTotal)) queryParts.push(`minTotal=${params.minTotal}`);
    if (params.maxTotal !== undefined && !isNaN(params.maxTotal)) queryParts.push(`maxTotal=${params.maxTotal}`);
    if (params.sort) queryParts.push(`sort=${encodeURIComponent(params.sort)}`);
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);
  }

  const url = queryParts.length > 0 ? `${API_ENDPOINTS.BILLS}?${queryParts.join('&')}` : API_ENDPOINTS.BILLS;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || `Failed to fetch bills (${response.status})`);
  }

  const rawList = Array.isArray(json.data) ? json.data : [];
  const bills = rawList.map(normalizeBackendBill);

  const pagination: PaginationMeta = json.pagination || {
    page: params?.page || 1,
    limit: params?.limit || (bills.length || 10),
    total: json.count !== undefined ? json.count : bills.length,
    totalPages: 1,
    hasMore: false,
  };

  return { bills, pagination };
}

/**
 * GET /api/bills/:id
 * Retrieves single bill by ID
 */
export async function fetchBillById(id: string): Promise<BillData> {
  const response = await fetch(`${API_ENDPOINTS.BILLS}/${id}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || `Failed to fetch bill ${id}`);
  }

  return normalizeBackendBill(json.data);
}

/**
 * PUT /api/bills/:id
 * Updates an existing bill in the database
 */
export async function updateSavedBill(id: string, billData: BillData): Promise<BillData> {
  const payload = {
    billNumber: billData.billNumber,
    date: billData.date,
    customerName: billData.customerName,
    items: billData.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      unitPrice: it.price,
      total: it.total,
    })),
    subtotal: billData.subtotal,
    tax: billData.tax,
    discount: billData.discount,
    grandTotal: billData.total,
    currency: billData.currency || 'INR',
    imageUri: billData.imageUri,
  };

  const response = await fetch(`${API_ENDPOINTS.BILLS}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.error || `Failed to update bill (${response.status})`);
  }

  return normalizeBackendBill(json.data);
}

/**
 * DELETE /api/bills/:id
 * Deletes a bill from the database
 */
export async function deleteSavedBill(id: string): Promise<boolean> {
  const response = await fetch(`${API_ENDPOINTS.BILLS}/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || `Failed to delete bill (${response.status})`);
  }

  return true;
}

