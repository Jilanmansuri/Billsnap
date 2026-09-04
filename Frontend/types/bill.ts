export type FieldConfidence = 'high' | 'medium' | 'low';

export interface ConfidentField<T> {
  value: T;
  confidence: FieldConfidence;
}

export interface ItemConfidenceMap {
  name?: FieldConfidence;
  quantity?: FieldConfidence;
  price?: FieldConfidence;
  total?: FieldConfidence;
}

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  confidence?: ItemConfidenceMap;
  mathMismatch?: boolean;
}

export interface BillData {
  id: string;
  billNumber: string;
  date: string;
  customerName: string;
  items: BillItem[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  currency?: string;
  category?: string;
  notes?: string;
  imageUri?: string;
  createdAt: string;
  verificationRequired?: string[];
  inconsistencies?: string[];
  fieldConfidence?: {
    date?: FieldConfidence;
    customerName?: FieldConfidence;
    billNumber?: FieldConfidence;
    subtotal?: FieldConfidence;
    total?: FieldConfidence;
  };
}

export type ScanSource = 'camera' | 'gallery';

export type BillSortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface BillQueryParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  minTotal?: number;
  maxTotal?: number;
  sort?: BillSortOption;
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedBillsResponse {
  bills: BillData[];
  pagination: PaginationMeta;
}
