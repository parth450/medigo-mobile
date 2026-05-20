import React, { createContext, useContext, useEffect, useState } from "react";
import * as MMKVModule from "react-native-mmkv";
import type { Medicine, MedicineBatch } from "../types/api.types";

class MemoryStorage {
  private map = new Map<string, string>();
  getString(key: string): string | undefined { return this.map.get(key); }
  set(key: string, value: string): void { this.map.set(key, value); }
}

let storageInstance: any;
try {
  const MMKVClass = (MMKVModule as any)?.MMKV;
  if (MMKVClass) {
    storageInstance = new MMKVClass({ id: "medigo-cart-storage" });
  } else {
    storageInstance = new MemoryStorage();
  }
} catch (e) {
  storageInstance = new MemoryStorage();
}

const storage = storageInstance;

export interface CartItem {
  medicine: Medicine;
  batch: MedicineBatch;
  quantity: number;
  itemSubtotal: number; // Raw base cost excluding tax
  itemGst: number;      // Calculated individual GST component
  itemTotal: number;    // Absolute final price matching total MRP units
}

interface CartContextType {
  items: CartItem[];
  addToCart: (medicine: Medicine, batch: MedicineBatch, quantity?: number) => void;
  removeFromCart: (batchId: number) => void;
  updateQuantity: (batchId: number, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  totalGst: number;
  grandTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Calculate distinct items line values according to Indian Medical standards
  const computeItemTotals = (medicine: Medicine, batch: MedicineBatch, qty: number) => {
    const mrp = Number(batch?.mrp || 0);
    const gstRate = Number(medicine?.gst_percentage || 18);
    
    const totalLinePrice = mrp * qty;
    // Base Price = MRP / (1 + (GST% / 100))
    const basePriceTotal = totalLinePrice / (1 + gstRate / 100);
    const gstCollected = totalLinePrice - basePriceTotal;

    return {
      itemSubtotal: basePriceTotal,
      itemGst: gstCollected,
      itemTotal: totalLinePrice
    };
  };

  useEffect(() => {
    const cached = storage.getString("cart_items");
    if (cached) {
      try {
        setItems(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cached cart", e);
      }
    }
  }, []);

  const saveCart = (newItems: CartItem[]) => {
    setItems(newItems);
    storage.set("cart_items", JSON.stringify(newItems));
  };

  const addToCart = (medicine: Medicine, batch: MedicineBatch, quantity = 1) => {
    const existingIndex = items.findIndex((item) => item.batch.mb_id === batch.mb_id);
    const maxAvailable = batch?.quantity || 0;

    if (existingIndex > -1) {
      const updated = [...items];
      const newQty = updated[existingIndex].quantity + quantity;

      if (newQty <= maxAvailable) {
        const structuralTotals = computeItemTotals(medicine, batch, newQty);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          ...structuralTotals
        };
        saveCart(updated);
      }
    } else {
      if (quantity <= maxAvailable) {
        const structuralTotals = computeItemTotals(medicine, batch, quantity);
        saveCart([...items, { medicine, batch, quantity, ...structuralTotals }]);
      }
    }
  };

  const removeFromCart = (batchId: number) => {
    saveCart(items.filter((item) => item.batch.mb_id !== batchId));
  };

  const updateQuantity = (batchId: number, quantity: number) => {
    const index = items.findIndex((item) => item.batch.mb_id === batchId);
    if (index > -1) {
      const updated = [...items];
      const maxAvailable = updated[index].batch?.quantity || 0;

      if (quantity <= 0) {
        removeFromCart(batchId);
      } else if (quantity <= maxAvailable) {
        const structuralTotals = computeItemTotals(updated[index].medicine, updated[index].batch, quantity);
        updated[index] = {
          ...updated[index],
          quantity: quantity,
          ...structuralTotals
        };
        saveCart(updated);
      }
    }
  };

  const clearCart = () => saveCart([]);

  // Aggregate values cleanly across all line calculations (with 0 fallbacks)
  const subtotal = items.reduce((sum, item) => sum + (item.itemSubtotal || 0), 0) || 0;
  const totalGst = items.reduce((sum, item) => sum + (item.itemGst || 0), 0) || 0;
  const grandTotal = items.reduce((sum, item) => sum + (item.itemTotal || 0), 0) || 0;

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, subtotal, totalGst, grandTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be executed inside a CartProvider scope");
  return context;
};