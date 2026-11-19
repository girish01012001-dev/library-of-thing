import type {
  DeliveryMethod,
  OrderStatus,
  Product,
  RentalOrder,
  SortOption,
} from '../types';

export const DOORSTEP_DELIVERY_FEE = 99;

export interface PricingBreakdown {
  totalDays: number;
  rentalSubtotal: number;
  securityDeposit: number;
  deliveryFee: number;
  grandTotal: number;
}

export interface BookingFormInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  locality: string;
  deliveryMethod: DeliveryMethod;
  addressNote: string;
  startDate: string;
  endDate: string;
  govIdConfirmed: boolean;
}

export interface BookingValidationErrors {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  locality?: string;
  addressNote?: string;
  dates?: string;
  govIdConfirmed?: string;
}

export interface DashboardKPIs {
  totalOrders: number;
  activeAndPendingCount: number;
  totalRentalRevenue: number;
  depositsHeld: number;
  totalCatalogItems: number;
}

export interface StockDisplayInfo {
  label: string;
  tone: 'in-stock' | 'low-stock' | 'out-of-stock';
  isAvailable: boolean;
}

/**
 * Normalizes legacy Firestore product records that predate totalQuantity / availableQuantity.
 */
export function normalizeProductStock(
  raw: Partial<Product> & { id: string },
): Product {
  const hasTotal =
    typeof raw.totalQuantity === 'number' &&
    Number.isFinite(raw.totalQuantity) &&
    raw.totalQuantity >= 1;
  const totalQuantity = hasTotal ? Math.floor(raw.totalQuantity!) : 1;

  const hasAvailableQty =
    typeof raw.availableQuantity === 'number' &&
    Number.isFinite(raw.availableQuantity);

  const rawAvailQty = hasAvailableQty
    ? Math.floor(raw.availableQuantity!)
    : raw.available
      ? totalQuantity
      : 0;

  const availableQuantity = Math.max(0, Math.min(totalQuantity, rawAvailQty));
  const available = availableQuantity > 0;

  return {
    id: raw.id,
    name: raw.name ?? 'Untitled Item',
    category: raw.category ?? 'Electronics',
    brandModel: raw.brandModel ?? '',
    condition: raw.condition ?? 'Excellent',
    dailyPrice: Number(raw.dailyPrice ?? 0),
    securityDeposit: Number(raw.securityDeposit ?? 0),
    description: raw.description ?? '',
    accessories: Array.isArray(raw.accessories) ? raw.accessories : [],
    imageUrl: raw.imageUrl ?? '',
    available,
    totalQuantity,
    availableQuantity,
    createdAt: Number(raw.createdAt ?? Date.now()),
  };
}

/**
 * When Admin edits `totalQuantity` on an existing item, adjusts `availableQuantity`
 * proportionally while preserving currently rented units and clamping to [0, nextTotal].
 */
export function computeAdjustedStockOnEdit(
  prevTotal: number,
  prevAvailable: number,
  nextTotalRaw: number,
): { totalQuantity: number; availableQuantity: number; available: boolean } {
  const safePrevTotal = Math.max(1, Math.floor(prevTotal));
  const safePrevAvail = Math.max(0, Math.min(safePrevTotal, Math.floor(prevAvailable)));
  const totalQuantity = Math.max(1, Math.floor(nextTotalRaw));

  const delta = totalQuantity - safePrevTotal;
  const availableQuantity = Math.max(
    0,
    Math.min(totalQuantity, safePrevAvail + delta),
  );

  return {
    totalQuantity,
    availableQuantity,
    available: availableQuantity > 0,
  };
}

/**
 * Quick +1 / -1 stock stepper helper for Admin Inventory Management.
 */
export function computeStockAfterStep(
  totalQuantity: number,
  availableQuantity: number,
  delta: 1 | -1,
): { totalQuantity: number; availableQuantity: number; available: boolean } {
  const safeTotal = Math.max(1, Math.floor(totalQuantity));
  const safeAvail = Math.max(0, Math.min(safeTotal, Math.floor(availableQuantity)));

  const nextTotal = Math.max(1, safeTotal + delta);
  const actualDelta = nextTotal - safeTotal;
  const nextAvail = Math.max(
    0,
    Math.min(nextTotal, safeAvail + actualDelta),
  );

  return {
    totalQuantity: nextTotal,
    availableQuantity: nextAvail,
    available: nextAvail > 0,
  };
}

/**
 * Returns storefront stock badge copy & semantic tone from availableQuantity.
 */
export function getStockDisplayInfo(availableQuantity: number): StockDisplayInfo {
  const qty = Math.max(0, Math.floor(availableQuantity));
  if (qty <= 0) {
    return {
      label: 'Out of Stock',
      tone: 'out-of-stock',
      isAvailable: false,
    };
  }
  if (qty === 1) {
    return {
      label: 'Only 1 Left',
      tone: 'low-stock',
      isAvailable: true,
    };
  }
  return {
    label: `${qty} Available`,
    tone: 'in-stock',
    isAvailable: true,
  };
}

/**
 * Pure transition helper for order status changes & atomic multi-unit stock updates.
 * Guarantees stock is never deducted or restored twice.
 */
export function computeOrderStatusTransition(
  currentlyDeducted: boolean,
  nextStatus: OrderStatus,
  totalQuantity: number,
  availableQuantity: number,
): {
  nextStockDeducted: boolean;
  totalQuantity: number;
  availableQuantity: number;
  available: boolean;
  stockChanged: boolean;
} {
  const safeTotal = Math.max(1, Math.floor(totalQuantity));
  const safeAvail = Math.max(0, Math.min(safeTotal, Math.floor(availableQuantity)));

  const isReleasedStatus =
    nextStatus === 'Returned' || nextStatus === 'Cancelled';

  if (isReleasedStatus && currentlyDeducted) {
    const nextAvail = Math.min(safeTotal, safeAvail + 1);
    return {
      nextStockDeducted: false,
      totalQuantity: safeTotal,
      availableQuantity: nextAvail,
      available: nextAvail > 0,
      stockChanged: nextAvail !== safeAvail,
    };
  }

  if (!isReleasedStatus && !currentlyDeducted) {
    if (safeAvail >= 1) {
      const nextAvail = safeAvail - 1;
      return {
        nextStockDeducted: true,
        totalQuantity: safeTotal,
        availableQuantity: nextAvail,
        available: nextAvail > 0,
        stockChanged: true,
      };
    }
    return {
      nextStockDeducted: false,
      totalQuantity: safeTotal,
      availableQuantity: safeAvail,
      available: safeAvail > 0,
      stockChanged: false,
    };
  }

  return {
    nextStockDeducted: currentlyDeducted,
    totalQuantity: safeTotal,
    availableQuantity: safeAvail,
    available: safeAvail > 0,
    stockChanged: false,
  };
}

/**
 * Returns today's date string (YYYY-MM-DD) in Asia/Kolkata timezone.
 */
export function getTodayInKolkata(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Adds `days` to a YYYY-MM-DD date string safely in UTC.
 */
export function addDaysToISODate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * Calculates inclusive rental days between startDate and endDate.
 * Same-day start and return counts as 1 day minimum.
 * Returns null if dates are missing or endDate is before startDate.
 */
export function calculateRentalDays(
  startDate: string,
  endDate: string,
): number | null {
  if (!startDate || !endDate) return null;
  const startMatch = /^\d{4}-\d{2}-\d{2}$/.test(startDate);
  const endMatch = /^\d{4}-\d{2}-\d{2}$/.test(endDate);
  if (!startMatch || !endMatch) return null;

  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);

  if (endUtc < startUtc) return null;
  const diffDays = Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays === 0 ? 1 : diffDays);
}

/**
 * Computes transparent pricing breakdown for a rental booking.
 */
export function calculatePricingBreakdown(
  dailyPrice: number,
  securityDeposit: number,
  totalDays: number,
  deliveryMethod: DeliveryMethod,
): PricingBreakdown {
  const safeDays = Math.max(1, Math.floor(totalDays));
  const rentalSubtotal = dailyPrice * safeDays;
  const deliveryFee = deliveryMethod === 'delivery' ? DOORSTEP_DELIVERY_FEE : 0;
  const grandTotal = rentalSubtotal + securityDeposit + deliveryFee;

  return {
    totalDays: safeDays,
    rentalSubtotal,
    securityDeposit,
    deliveryFee,
    grandTotal,
  };
}

/**
 * Formats an integer amount in Indian Rupees (INR).
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a YYYY-MM-DD date string into a readable Indian date (e.g., 19 Nov 2026).
 */
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dt);
}

/**
 * Generates a unique-looking booking code like LOT-2849.
 */
export function generateBookingCode(randomFn: () => number = Math.random): string {
  const num = Math.floor(1000 + randomFn() * 9000);
  return `LOT-${num}`;
}

/**
 * Filters and sorts catalog products cleanly without mutating the source array.
 */
export function filterAndSortProducts(
  products: Product[],
  searchQuery: string,
  selectedCategory: string,
  sortBy: SortOption,
): Product[] {
  const q = searchQuery.trim().toLowerCase();

  const filtered = products.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;

    if (!matchesCategory) return false;
    if (!q) return true;

    const haystack = [
      item.name,
      item.brandModel,
      item.category,
      item.description,
      ...item.accessories,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });

  return [...filtered].sort((a, b) => {
    const aAvail = a.availableQuantity > 0;
    const bAvail = b.availableQuantity > 0;

    switch (sortBy) {
      case 'price-asc':
        return a.dailyPrice - b.dailyPrice;
      case 'price-desc':
        return b.dailyPrice - a.dailyPrice;
      case 'available':
        if (aAvail !== bAvail) return aAvail ? -1 : 1;
        return b.availableQuantity - a.availableQuantity || b.createdAt - a.createdAt;
      case 'featured':
      default:
        if (aAvail !== bAvail) return aAvail ? -1 : 1;
        return b.createdAt - a.createdAt;
    }
  });
}

/**
 * Validates customer rental booking fields.
 */
export function validateBookingForm(
  input: BookingFormInput,
  todayISO: string,
): BookingValidationErrors {
  const errors: BookingValidationErrors = {};

  if (!input.customerName.trim() || input.customerName.trim().length < 2) {
    errors.customerName = 'Please enter your full name.';
  }

  const digits = input.customerPhone.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(digits)) {
    errors.customerPhone = 'Enter a valid 10-digit Indian mobile number.';
  }

  if (
    !input.customerEmail.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customerEmail.trim())
  ) {
    errors.customerEmail = 'Enter a valid email address.';
  }

  if (!input.locality.trim()) {
    errors.locality = 'Select your Dehradun locality.';
  }

  if (
    input.deliveryMethod === 'delivery' &&
    (!input.addressNote.trim() || input.addressNote.trim().length < 6)
  ) {
    errors.addressNote = 'Provide your house/hostel/landmark for delivery.';
  }

  const days = calculateRentalDays(input.startDate, input.endDate);
  if (!input.startDate || !input.endDate) {
    errors.dates = 'Select both start and return dates.';
  } else if (input.startDate < todayISO) {
    errors.dates = 'Start date cannot be in the past.';
  } else if (days === null) {
    errors.dates = 'Return date must be on or after the start date.';
  }

  if (!input.govIdConfirmed) {
    errors.govIdConfirmed =
      'Please confirm you will show a valid Government or College ID at handover.';
  }

  return errors;
}

/**
 * Computes real-time business KPIs for the Store Admin Dashboard.
 * - Total Rental Revenue excludes refundable security deposits and cancelled orders.
 * - Refundable Deposits Held sums security deposits for Confirmed & Picked Up orders.
 */
export function calculateDashboardKPIs(
  products: Product[],
  orders: RentalOrder[],
): DashboardKPIs {
  const totalOrders = orders.length;

  const activeAndPendingCount = orders.filter(
    (o) => o.status === 'Pending' || o.status === 'Confirmed' || o.status === 'Picked Up',
  ).length;

  const totalRentalRevenue = orders
    .filter((o) => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.rentalSubtotal, 0);

  const depositsHeld = orders
    .filter((o) => o.status === 'Confirmed' || o.status === 'Picked Up')
    .reduce((sum, o) => sum + o.securityDeposit, 0);

  return {
    totalOrders,
    activeAndPendingCount,
    totalRentalRevenue,
    depositsHeld,
    totalCatalogItems: products.length,
  };
}

/**
 * Matches orders by Booking Code (case-insensitive) or normalized 10-digit Mobile Number,
 * sorted newest-first by createdAt.
 */
export function findTrackedOrders(
  orders: RentalOrder[],
  query: string,
): RentalOrder[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normalizedUpper = trimmed.toUpperCase();
  const digitsOnly = trimmed.replace(/\D/g, '');

  return orders
    .filter((order) => {
      if (order.bookingCode.toUpperCase() === normalizedUpper) return true;
      if (digitsOnly.length >= 10) {
        const orderDigits = order.customerPhone.replace(/\D/g, '').slice(-10);
        if (orderDigits === digitsOnly.slice(-10)) return true;
      }
      return false;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Matches all orders belonging to a signed-in customer via userId OR case-insensitive customerEmail,
 * sorted newest-first by createdAt in JavaScript (no Firestore composite index required).
 */
export function filterCustomerOrders(
  orders: RentalOrder[],
  userId?: string | null,
  email?: string | null,
): RentalOrder[] {
  const cleanUid = (userId || '').trim();
  const lowerEmail = (email || '').trim().toLowerCase();
  if (!cleanUid && !lowerEmail) return [];

  return orders
    .filter((order) => {
      if (cleanUid && order.userId === cleanUid) return true;
      if (
        lowerEmail &&
        (order.customerEmail || '').trim().toLowerCase() === lowerEmail
      ) {
        return true;
      }
      return false;
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export interface CategorizedOrders {
  all: RentalOrder[];
  active: RentalOrder[];
  history: RentalOrder[];
  activeCount: number;
}

/**
 * Groups customer orders into All, Active & Upcoming (Pending/Confirmed/Picked Up),
 * and Rental History (Returned/Cancelled).
 */
export function categorizeCustomerOrders(
  orders: RentalOrder[],
): CategorizedOrders {
  const sorted = [...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const active = sorted.filter(
    (o) =>
      o.status === 'Pending' ||
      o.status === 'Confirmed' ||
      o.status === 'Picked Up',
  );
  const history = sorted.filter(
    (o) => o.status === 'Returned' || o.status === 'Cancelled',
  );

  return {
    all: sorted,
    active,
    history,
    activeCount: active.length,
  };
}

/**
 * Formats an epoch timestamp (ms) into an Asia/Kolkata readable date & time string.
 */
export function formatKolkataDateTime(timestampMs: number): string {
  if (!timestampMs || !Number.isFinite(timestampMs)) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(timestampMs));
}

