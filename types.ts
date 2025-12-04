export enum Role {
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  full_name: string;
  role: Role;
  email?: string;
  balance?: number; // Only for students
  studentId?: string; // Only for students
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  isAvailable?: boolean;
  stock: number;
}

export interface Transaction {
  id: string;
  studentId: string;
  studentName: string;
  items: { product: Product; quantity: number }[];
  totalAmount: number;
  timestamp: string;
  type: 'PURCHASE' | 'TOPUP';
}

export interface CartItem extends Product {
  quantity: number;
}