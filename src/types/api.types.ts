export interface Medicine {
  id: number;
  medicine_code: string;
  name: string;
  generic_name?: string;
  category: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops';
  manufacturer: string;
  rack_location: string;
  prescription_required: boolean;
  gst_percentage: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface MedicineBatch {
  mb_id: number;
  medicine_id: number;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_price: number;
  mrp: number;
  medicine?: Medicine;
}

export interface BillItem {
  bi_id: number;
  quantity: number;
  mrp_per_unit: number;
  gst_percentage: number;
  gst_amount: number;
  total_price: number;
  medicine: Medicine;
  batch: MedicineBatch;
}

export interface Bill {
  bill_id: number;
  bill_number: string;
  payment_method: 'cash' | 'card' | 'upi';
  subtotal: number;
  total_gst: number;
  grand_total: number;
  created_at: string;
  items?: BillItem[];
}

export interface CreateBillItemDto {
  mb_id: number; // Must be filled with MedicineBatch.mb_id
  quantity: number;
}

export interface CreateBillDto {
  payment_method: 'cash' | 'card' | 'upi';
  items: CreateBillItemDto[];
}

export interface CreateMedicineDto {
  name: string;
  generic_name?: string;
  category: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops';
  manufacturer: string;
  rack_location: string;
  prescription_required: boolean;
  gst_percentage: number;
  status?: string;
}

export interface CreateBatchDto {
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_price: number;
  mrp: number;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password_hash: string;
  role: 'pharmacist' | 'store_manager';
}