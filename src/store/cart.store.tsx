import { create } from 'zustand';
import type { Medicine, MedicineBatch } from '../types/api.types';

interface CartItem {
  medicine: Medicine;
  batch: MedicineBatch;
  quantity: number;
  itemGst: number;
}

interface CartState {
  // --- Operational States ---
  items: CartItem[];
  searchQuery: string;
  selectedMedicine: Medicine | null;
  
  // --- UI Layout Toggle States ---
  paymentMethod: "cash" | "card" | "upi";
  isCartVisible: boolean;
  isCheckoutSuccess: boolean;
  successBillData: any | null;
  searchHistory: string[];

  // --- Core Calculations ---
  subtotal: number;
  totalGst: number;
  grandTotal: number;

  // --- Actions ---
  setSearchQuery: (query: string) => void;
  setSelectedMedicine: (medicine: Medicine | null) => void;
  setPaymentMethod: (method: "cash" | "card" | "upi") => void;
  setIsCartVisible: (visible: boolean) => void;
  setIsCheckoutSuccess: (success: boolean) => void;
  setSuccessBillData: (data: any) => void;
  appendToSearchHistory: (term: string) => void;
  
  addToCart: (medicine: Medicine, batch: MedicineBatch, qty: number) => void;
  removeFromCart: (batchId: number) => void;
  updateQuantity: (batchId: number, qty: number) => void;
  clearCart: () => void;
}

export const useCart = create<CartState>((set) => ({
  items: [],
  searchQuery: '',
  selectedMedicine: null,
  paymentMethod: 'cash',
  isCartVisible: false,
  isCheckoutSuccess: false,
  successBillData: null,
  searchHistory: [],
  subtotal: 0,
  totalGst: 0,
  grandTotal: 0,

  setSearchQuery: (query) => set((state) => {
    if (state.searchQuery !== query) {
      return { searchQuery: query, selectedMedicine: null };
    }
    return { searchQuery: query };
  }),
  setSelectedMedicine: (medicine) => set({ selectedMedicine: medicine }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setIsCartVisible: (visible) => set({ isCartVisible: visible }),
  setIsCheckoutSuccess: (success) => set({ isCheckoutSuccess: success }),
  setSuccessBillData: (data) => set({ successBillData: data }),
  
  appendToSearchHistory: (term) => set((state) => {
    const cleanTerm = term.trim();
    if (!cleanTerm) return {};
    const filtered = state.searchHistory.filter((item) => item.toLowerCase() !== cleanTerm.toLowerCase());
    return { searchHistory: [cleanTerm, ...filtered].slice(0, 5) };
  }),

  addToCart: (medicine, batch, qty) => set((state) => {
    const existingIndex = state.items.findIndex(i => i.batch.mb_id === batch.mb_id);
    let newItems = [...state.items];
    
    if (existingIndex > -1) {
      newItems[existingIndex].quantity += qty;
    } else {
      const gstRate = medicine.gst_percentage || 18;
      const basePrice = batch.mrp / (1 + gstRate / 100);
      const itemGst = batch.mrp - basePrice;
      newItems.push({ medicine, batch, quantity: qty, itemGst });
    }
    return { items: newItems, ...calculateTotals(newItems) };
  }),

  removeFromCart: (batchId) => set((state) => {
    const newItems = state.items.filter(i => i.batch.mb_id !== batchId);
    return { items: newItems, ...calculateTotals(newItems) };
  }),

  updateQuantity: (batchId, qty) => set((state) => {
    if (qty <= 0) {
      const newItems = state.items.filter(i => i.batch.mb_id !== batchId);
      return { items: newItems, ...calculateTotals(newItems) };
    }
    const newItems = state.items.map(item => 
      item.batch.mb_id === batchId ? { ...item, quantity: qty } : item
    );
    return { items: newItems, ...calculateTotals(newItems) };
  }),

  clearCart: () => set({ items: [], subtotal: 0, totalGst: 0, grandTotal: 0 })
}));

// Helper configuration utility to recalculate item totals 
function calculateTotals(items: CartItem[]) {
  let subtotal = 0;
  let totalGst = 0;
  items.forEach(item => {
    const totalItemMrp = item.batch.mrp * item.quantity;
    const gstRate = item.medicine.gst_percentage || 18;
    const base = totalItemMrp / (1 + gstRate / 100);
    subtotal += base;
    totalGst += (totalItemMrp - base);
  });
  return { subtotal, totalGst, grandTotal: subtotal + totalGst };
}