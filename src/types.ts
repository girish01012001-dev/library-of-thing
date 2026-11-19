export type Category =
  | 'Gaming'
  | 'Cameras & Photo'
  | 'Camping & Travel'
  | 'Power Tools'
  | 'Electronics'
  | 'Musical Instruments'
  | 'Sports & Fitness';

export const PRODUCT_CATEGORIES: Category[] = [
  'Gaming',
  'Cameras & Photo',
  'Camping & Travel',
  'Power Tools',
  'Electronics',
  'Musical Instruments',
  'Sports & Fitness',
];

export type ItemCondition = 'Like New' | 'Excellent' | 'Good';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Picked Up'
  | 'Returned'
  | 'Cancelled';

export type DeliveryMethod = 'pickup' | 'delivery';

export type PaymentMethod = 'UPI' | 'Cash';

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'available';

export const DEHRADUN_LOCALITIES = [
  'Rajpur Road',
  'Prem Nagar',
  'Ballupur',
  'Jakhan',
  'Clement Town',
  'Patel Nagar',
  'Bidholi',
  'ISBT',
  'Other',
] as const;

export type DehradunLocality = (typeof DEHRADUN_LOCALITIES)[number];

export interface Product {
  id: string;
  name: string;
  category: Category;
  brandModel: string;
  condition: ItemCondition;
  dailyPrice: number;
  securityDeposit: number;
  description: string;
  accessories: string[];
  imageUrl: string;
  available: boolean;
  totalQuantity: number;
  availableQuantity: number;
  createdAt: number;
}

export interface RentalOrder {
  id: string;
  bookingCode: string;
  productId: string;
  productName: string;
  productImage: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  locality: string;
  deliveryMethod: DeliveryMethod;
  addressNote: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyPrice: number;
  rentalSubtotal: number;
  securityDeposit: number;
  deliveryFee: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  stockDeducted: boolean;
  createdAt: number;
}

export interface CustomerProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  phone: string;
  locality: string;
  addressNote: string;
  updatedAt: number;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}
