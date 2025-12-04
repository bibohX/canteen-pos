import { User, Product, Transaction, Role } from '../types';

const STORAGE_KEYS = {
  USERS: 'canteen_users',
  PRODUCTS: 'canteen_products',
  TRANSACTIONS: 'canteen_transactions',
};

// Seed Data
const INITIAL_USERS: User[] = [
  { id: 'admin1', name: 'Admin User', role: Role.ADMIN, email: 'admin@school.edu' },
  { id: 'staff1', name: 'Canteen Staff', role: Role.STAFF, email: 'staff@school.edu' },
  { id: 'stu1', name: 'Alice Johnson', role: Role.STUDENT, studentId: '2024001', balance: 50.00, email: 'alice@school.edu' },
  { id: 'stu2', name: 'Bob Smith', role: Role.STUDENT, studentId: '2024002', balance: 15.50, email: 'bob@school.edu' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Chicken Sandwich', price: 55.00, category: 'Food', description: 'Grilled chicken breast with lettuce and mayo.', image: 'https://picsum.photos/100/100', isAvailable: true, stock: 25 },
  { id: 'p2', name: 'Veggie Wrap', price: 45.00, category: 'Food', description: 'Fresh seasonal vegetables in a whole wheat wrap.', image: 'https://picsum.photos/101/101', isAvailable: true, stock: 15 },
  { id: 'p3', name: 'Apple Juice', price: 20.00, category: 'Drink', description: '100% organic apple juice.', image: 'https://picsum.photos/102/102', isAvailable: true, stock: 50 },
  { id: 'p4', name: 'Chocolate Chip Cookie', price: 15.00, category: 'Snack', description: 'Freshly baked chocolate chip cookie.', image: 'https://picsum.photos/103/103', isAvailable: true, stock: 40 },
  { id: 'p5', name: 'Water Bottle', price: 10.00, category: 'Drink', description: 'Spring water.', image: 'https://picsum.photos/104/104', isAvailable: true, stock: 100 },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    studentId: 'stu1',
    studentName: 'Alice Johnson',
    items: [],
    totalAmount: 500,
    timestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    type: 'TOPUP'
  },
  {
    id: 't2',
    studentId: 'stu1',
    studentName: 'Alice Johnson',
    items: [{ product: INITIAL_PRODUCTS[0], quantity: 1 }, { product: INITIAL_PRODUCTS[2], quantity: 1 }],
    totalAmount: 75.00,
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    type: 'PURCHASE'
  }
];

export const StorageService = {
  getUsers: (): User[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    return stored ? JSON.parse(stored) : INITIAL_USERS;
  },

  saveUsers: (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getProducts: (): Product[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return stored ? JSON.parse(stored) : INITIAL_PRODUCTS;
  },

  saveProducts: (products: Product[]) => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  getTransactions: (): Transaction[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return stored ? JSON.parse(stored) : INITIAL_TRANSACTIONS;
  },

  addTransaction: (transaction: Transaction) => {
    const transactions = StorageService.getTransactions();
    transactions.unshift(transaction); // Add to beginning
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  updateStudentBalance: (studentId: string, amountChange: number) => {
    const users = StorageService.getUsers();
    const studentIndex = users.findIndex(u => u.id === studentId);
    if (studentIndex >= 0) {
      const currentBalance = users[studentIndex].balance || 0;
      users[studentIndex].balance = Number((currentBalance + amountChange).toFixed(2));
      StorageService.saveUsers(users);
      return users[studentIndex];
    }
    return null;
  }
};