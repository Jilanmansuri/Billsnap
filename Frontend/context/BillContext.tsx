import React, { createContext, useContext, useState } from 'react';
import { BillData, BillItem } from '@/types/bill';
import { INITIAL_RECENT_BILLS, SAMPLE_EXTRACTED_BILL } from '@/constants/mockData';

interface BillContextType {
  savedBills: BillData[];
  currentBill: BillData;
  setCurrentBill: React.Dispatch<React.SetStateAction<BillData>>;
  saveBill: (bill: BillData) => void;
  deleteBill: (id: string) => void;
  getBillById: (id: string) => BillData | undefined;
  startNewScan: (source?: 'camera' | 'gallery', imageUri?: string) => void;
  setImageUri: (uri: string) => void;
  updateItemInCurrentBill: (itemId: string, field: keyof BillItem, value: string | number) => void;
  addItemToCurrentBill: () => void;
  removeItemFromCurrentBill: (itemId: string) => void;
  updateTax: (tax: number) => void;
  updateDiscount: (discount: number) => void;
  updateCurrency: (currency: string) => void;
}

const BillContext = createContext<BillContextType | undefined>(undefined);

export function BillProvider({ children }: { children: React.ReactNode }) {
  const [savedBills, setSavedBills] = useState<BillData[]>(INITIAL_RECENT_BILLS);
  const [currentBill, setCurrentBill] = useState<BillData>(SAMPLE_EXTRACTED_BILL);

  const startNewScan = (_source: 'camera' | 'gallery' = 'camera', imageUri?: string) => {
    // Generate a fresh unique ID and timestamp for the new scan
    const newId = `bill-${Date.now()}`;
    const newBillNumber = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const clonedSample: BillData = {
      ...SAMPLE_EXTRACTED_BILL,
      id: newId,
      billNumber: newBillNumber,
      date: new Date().toISOString().split('T')[0],
      createdAt: 'Just now',
      imageUri: imageUri,
      items: SAMPLE_EXTRACTED_BILL.items.map((item) => ({ ...item })),
    };
    setCurrentBill(clonedSample);
  };

  const setImageUri = (uri: string) => {
    setCurrentBill((prev) => ({ ...prev, imageUri: uri }));
  };

  const saveBill = (billToSave: BillData) => {
    setSavedBills((prev) => {
      const exists = prev.some((b) => b.id === billToSave.id);
      if (exists) {
        return prev.map((b) => (b.id === billToSave.id ? billToSave : b));
      }
      return [billToSave, ...prev];
    });
    setCurrentBill(billToSave);
  };

  const deleteBill = (id: string) => {
    setSavedBills((prev) => prev.filter((b) => b.id !== id));
  };

  const getBillById = (id: string) => {
    return savedBills.find((b) => b.id === id);
  };

  const updateItemInCurrentBill = (itemId: string, field: keyof BillItem, value: string | number) => {
    setCurrentBill((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value };
          // User edited this field, so mark it as verified/high confidence
          if (updated.confidence) {
            updated.confidence = { ...updated.confidence, [field]: 'high' };
          }
          if (field === 'quantity' || field === 'price') {
            const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
            const price = field === 'price' ? Number(value) || 0 : item.price;
            updated.total = Math.round(qty * price * 100) / 100;
            updated.mathMismatch = false;
          }
          return updated;
        }
        return item;
      });

      const newSubtotal = updatedItems.reduce((acc, item) => acc + (item.total || 0), 0);
      const tax = Number(prev.tax) || 0;
      const discount = Number(prev.discount) || 0;
      const newTotal = Math.max(0, Math.round((newSubtotal + tax - discount) * 100) / 100);

      return {
        ...prev,
        items: updatedItems,
        subtotal: Math.round(newSubtotal * 100) / 100,
        total: newTotal,
      };
    });
  };

  const addItemToCurrentBill = () => {
    setCurrentBill((prev) => {
      const newItem: BillItem = {
        id: `item-${Date.now()}`,
        name: 'New Item',
        quantity: 1,
        price: 0,
        total: 0,
      };
      const updatedItems = [...prev.items, newItem];
      const newSubtotal = updatedItems.reduce((acc, item) => acc + (item.total || 0), 0);
      const tax = Number(prev.tax) || 0;
      const discount = Number(prev.discount) || 0;
      const newTotal = Math.max(0, Math.round((newSubtotal + tax - discount) * 100) / 100);
      return {
        ...prev,
        items: updatedItems,
        subtotal: Math.round(newSubtotal * 100) / 100,
        total: newTotal,
      };
    });
  };

  const removeItemFromCurrentBill = (itemId: string) => {
    setCurrentBill((prev) => {
      const updatedItems = prev.items.filter((item) => item.id !== itemId);
      const newSubtotal = updatedItems.reduce((acc, item) => acc + (item.total || 0), 0);
      const tax = Number(prev.tax) || 0;
      const discount = Number(prev.discount) || 0;
      const newTotal = Math.max(0, Math.round((newSubtotal + tax - discount) * 100) / 100);
      return {
        ...prev,
        items: updatedItems,
        subtotal: Math.round(newSubtotal * 100) / 100,
        total: newTotal,
      };
    });
  };

  const updateTax = (taxAmount: number) => {
    setCurrentBill((prev) => {
      const validTax = isNaN(taxAmount) ? 0 : Math.max(0, taxAmount);
      const discount = Number(prev.discount) || 0;
      const newTotal = Math.max(0, Math.round((prev.subtotal + validTax - discount) * 100) / 100);
      return {
        ...prev,
        tax: validTax,
        total: newTotal,
      };
    });
  };

  const updateDiscount = (discountAmount: number) => {
    setCurrentBill((prev) => {
      const validDiscount = isNaN(discountAmount) ? 0 : Math.max(0, discountAmount);
      const tax = Number(prev.tax) || 0;
      const newTotal = Math.max(0, Math.round((prev.subtotal + tax - validDiscount) * 100) / 100);
      return {
        ...prev,
        discount: validDiscount,
        total: newTotal,
      };
    });
  };

  const updateCurrency = (currency: string) => {
    setCurrentBill((prev) => ({
      ...prev,
      currency: currency || 'INR',
    }));
  };

  return (
    <BillContext.Provider
      value={{
        savedBills,
        currentBill,
        setCurrentBill,
        saveBill,
        deleteBill,
        getBillById,
        startNewScan,
        setImageUri,
        updateItemInCurrentBill,
        addItemToCurrentBill,
        removeItemFromCurrentBill,
        updateTax,
        updateDiscount,
        updateCurrency,
      }}>
      {children}
    </BillContext.Provider>
  );
}

export function useBill() {
  const context = useContext(BillContext);
  if (!context) {
    throw new Error('useBill must be used within a BillProvider');
  }
  return context;
}
