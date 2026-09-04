import { BillData } from '@/types/bill';

// Initial dummy bills displayed in the "Recent Scans" section on Home screen
export const INITIAL_RECENT_BILLS: BillData[] = [
  {
    id: 'bill-1',
    billNumber: 'INV-2026-001',
    date: '2026-09-03',
    customerName: 'Aarav Patel',
    category: 'Groceries',
    items: [
      { id: '1', name: 'Fresh Milk (1L)', quantity: 2, price: 65, total: 130 },
      { id: '2', name: 'Whole Wheat Bread', quantity: 1, price: 45, total: 45 },
      { id: '3', name: 'Farm Eggs (12-pack)', quantity: 1, price: 95, total: 95 },
      { id: '4', name: 'Alphonso Mangoes (1kg)', quantity: 2, price: 180, total: 360 },
    ],
    subtotal: 630,
    tax: 0,
    total: 630,
    createdAt: 'Yesterday, 5:45 PM',
  },
  {
    id: 'bill-2',
    billNumber: 'INV-2026-002',
    date: '2026-09-02',
    customerName: 'Priya Sharma',
    category: 'Pharmacy',
    items: [
      { id: '1', name: 'Paracetamol 500mg', quantity: 2, price: 35, total: 70 },
      { id: '2', name: 'Vitamin C Tablets', quantity: 1, price: 150, total: 150 },
      { id: '3', name: 'Antiseptic Liquid (200ml)', quantity: 1, price: 120, total: 120 },
    ],
    subtotal: 340,
    tax: 17,
    total: 357,
    createdAt: '2 days ago',
  },
  {
    id: 'bill-3',
    billNumber: 'INV-2026-003',
    date: '2026-09-01',
    customerName: 'Kunal Verma',
    category: 'Hardware & Tools',
    items: [
      { id: '1', name: 'LED Bulb 12W', quantity: 4, price: 110, total: 440 },
      { id: '2', name: 'Insulation Tape', quantity: 2, price: 25, total: 50 },
      { id: '3', name: 'Screwdriver Set', quantity: 1, price: 320, total: 320 },
    ],
    subtotal: 810,
    tax: 40.5,
    total: 850.5,
    createdAt: '3 days ago',
  },
];

// Sample simulated OCR extraction result used when the user captures or uploads a bill
export const SAMPLE_EXTRACTED_BILL: BillData = {
  id: 'bill-extracted-new',
  billNumber: 'INV-2026-089',
  date: '2026-09-04',
  customerName: 'Rajesh Sharma',
  category: 'General Store',
  items: [
    { id: 'item-1', name: 'Basmati Rice (5kg)', quantity: 1, price: 450, total: 450 },
    { id: 'item-2', name: 'Sunflower Cooking Oil (1L)', quantity: 2, price: 165, total: 330 },
    { id: 'item-3', name: 'Refined Sugar (1kg)', quantity: 3, price: 48, total: 144 },
    { id: 'item-4', name: 'Toor Dal Premium (1kg)', quantity: 2, price: 175, total: 350 },
    { id: 'item-5', name: 'Tea Leaf Blend (500g)', quantity: 1, price: 220, total: 220 },
  ],
  subtotal: 1494,
  tax: 0,
  total: 1494,
  createdAt: 'Just now',
};
