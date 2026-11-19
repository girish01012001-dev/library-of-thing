import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToISODate,
  calculateDashboardKPIs,
  calculatePricingBreakdown,
  calculateRentalDays,
  categorizeCustomerOrders,
  computeAdjustedStockOnEdit,
  computeOrderStatusTransition,
  computeStockAfterStep,
  filterAndSortProducts,
  filterCustomerOrders,
  findTrackedOrders,
  formatINR,
  generateBookingCode,
  getStockDisplayInfo,
  normalizeProductStock,
  validateBookingForm,
} from './rentalMath';
import type { Product, RentalOrder } from '../types';

test('calculateRentalDays calculates inclusive days with 1-day minimum', () => {
  assert.equal(calculateRentalDays('2026-11-20', '2026-11-20'), 1);
  assert.equal(calculateRentalDays('2026-11-20', '2026-11-21'), 1);
  assert.equal(calculateRentalDays('2026-11-20', '2026-11-23'), 3);
  assert.equal(calculateRentalDays('2026-11-23', '2026-11-20'), null);
  assert.equal(calculateRentalDays('', '2026-11-20'), null);
});

test('addDaysToISODate increments ISO calendar dates accurately', () => {
  assert.equal(addDaysToISODate('2026-11-29', 2), '2026-12-01');
});

test('calculatePricingBreakdown computes subtotal, delivery fee, and grand total', () => {
  const pickup = calculatePricingBreakdown(450, 4000, 3, 'pickup');
  assert.deepEqual(pickup, {
    totalDays: 3,
    rentalSubtotal: 1350,
    securityDeposit: 4000,
    deliveryFee: 0,
    grandTotal: 5350,
  });

  const delivery = calculatePricingBreakdown(450, 4000, 3, 'delivery');
  assert.deepEqual(delivery, {
    totalDays: 3,
    rentalSubtotal: 1350,
    securityDeposit: 4000,
    deliveryFee: 99,
    grandTotal: 5449,
  });
});

test('formatINR formats Indian currency grouping cleanly', () => {
  assert.equal(formatINR(450), '₹450');
  assert.equal(formatINR(125000), '₹1,25,000');
});

test('generateBookingCode creates LOT-XXXX format', () => {
  assert.equal(generateBookingCode(() => 0), 'LOT-1000');
  assert.equal(generateBookingCode(() => 0.5), 'LOT-5500');
});

test('normalizeProductStock handles legacy items without quantity fields', () => {
  const legacyAvail = normalizeProductStock({
    id: 'legacy-1',
    name: 'Legacy Item',
    available: true,
  });
  assert.equal(legacyAvail.totalQuantity, 1);
  assert.equal(legacyAvail.availableQuantity, 1);
  assert.equal(legacyAvail.available, true);

  const legacyRented = normalizeProductStock({
    id: 'legacy-2',
    name: 'Legacy Rented',
    available: false,
  });
  assert.equal(legacyRented.totalQuantity, 1);
  assert.equal(legacyRented.availableQuantity, 0);
  assert.equal(legacyRented.available, false);
});

test('computeAdjustedStockOnEdit adjusts availableQuantity proportionally and clamps cleanly', () => {
  // 2 total, 1 available (1 out on rent); increase total to 3 => 2 available
  assert.deepEqual(computeAdjustedStockOnEdit(2, 1, 3), {
    totalQuantity: 3,
    availableQuantity: 2,
    available: true,
  });

  // 2 total, 1 available; shrink total to 1 => 0 available
  assert.deepEqual(computeAdjustedStockOnEdit(2, 1, 1), {
    totalQuantity: 1,
    availableQuantity: 0,
    available: false,
  });

  // 2 total, 2 available; increase total to 4 => 4 available
  assert.deepEqual(computeAdjustedStockOnEdit(2, 2, 4), {
    totalQuantity: 4,
    availableQuantity: 4,
    available: true,
  });
});

test('computeStockAfterStep enforces minimum totalQuantity 1 and clamps availableQuantity', () => {
  assert.deepEqual(computeStockAfterStep(2, 1, 1), {
    totalQuantity: 3,
    availableQuantity: 2,
    available: true,
  });
  assert.deepEqual(computeStockAfterStep(1, 0, -1), {
    totalQuantity: 1,
    availableQuantity: 0,
    available: false,
  });
});

test('getStockDisplayInfo returns crisp labels and semantic tones', () => {
  assert.deepEqual(getStockDisplayInfo(3), {
    label: '3 Available',
    tone: 'in-stock',
    isAvailable: true,
  });
  assert.deepEqual(getStockDisplayInfo(1), {
    label: 'Only 1 Left',
    tone: 'low-stock',
    isAvailable: true,
  });
  assert.deepEqual(getStockDisplayInfo(0), {
    label: 'Out of Stock',
    tone: 'out-of-stock',
    isAvailable: false,
  });
});

test('validateBookingForm catches missing/invalid fields and passes valid input', () => {
  const invalid = validateBookingForm(
    {
      customerName: 'A',
      customerPhone: '12345',
      customerEmail: 'bad-email',
      locality: '',
      deliveryMethod: 'delivery',
      addressNote: 'Hi',
      startDate: '2026-11-18',
      endDate: '2026-11-17',
      govIdConfirmed: false,
    },
    '2026-11-19',
  );
  assert.ok(invalid.customerName);
  assert.ok(invalid.customerPhone);
  assert.ok(invalid.customerEmail);
  assert.ok(invalid.locality);
  assert.ok(invalid.addressNote);
  assert.ok(invalid.dates);
  assert.ok(invalid.govIdConfirmed);

  const valid = validateBookingForm(
    {
      customerName: 'Aarav Rawat',
      customerPhone: '9876543210',
      customerEmail: 'aarav@example.com',
      locality: 'Rajpur Road',
      deliveryMethod: 'pickup',
      addressNote: '',
      startDate: '2026-11-19',
      endDate: '2026-11-22',
      govIdConfirmed: true,
    },
    '2026-11-19',
  );
  assert.deepEqual(valid, {});
});

test('filterAndSortProducts filters by search/category and sorts by availabilityQuantity', () => {
  const sample: Product[] = [
    {
      id: '1',
      name: 'Sony PlayStation 5',
      category: 'Gaming',
      brandModel: 'Sony CFI-1208A',
      condition: 'Like New',
      dailyPrice: 650,
      securityDeposit: 5000,
      description: '4K gaming console',
      accessories: ['2 DualSense Controllers'],
      imageUrl: '/ps5.jpg',
      available: true,
      totalQuantity: 2,
      availableQuantity: 2,
      createdAt: 100,
    },
    {
      id: '2',
      name: 'Canon EOS R50',
      category: 'Cameras & Photo',
      brandModel: 'Canon RF-S',
      condition: 'Excellent',
      dailyPrice: 550,
      securityDeposit: 5000,
      description: 'Mirrorless camera',
      accessories: ['64GB SD Card'],
      imageUrl: '/canon.jpg',
      available: false,
      totalQuantity: 1,
      availableQuantity: 0,
      createdAt: 200,
    },
  ];

  assert.equal(filterAndSortProducts(sample, 'DualSense', 'All', 'featured').length, 1);
  assert.equal(filterAndSortProducts(sample, '', 'Gaming', 'featured').length, 1);
  const asc = filterAndSortProducts(sample, '', 'All', 'price-asc');
  assert.equal(asc[0].id, '2');
  const avail = filterAndSortProducts(sample, '', 'All', 'available');
  assert.equal(avail[0].id, '1');
});

test('calculateDashboardKPIs excludes deposits and cancelled orders from revenue', () => {
  const products = [{ id: '1' } as Product, { id: '2' } as Product];
  const orders: RentalOrder[] = [
    {
      id: 'o1',
      bookingCode: 'LOT-1001',
      customerPhone: '9876543210',
      rentalSubtotal: 1200,
      securityDeposit: 3000,
      status: 'Picked Up',
      stockDeducted: true,
    } as RentalOrder,
    {
      id: 'o2',
      bookingCode: 'LOT-1002',
      customerPhone: '9876543211',
      rentalSubtotal: 900,
      securityDeposit: 2000,
      status: 'Returned',
      stockDeducted: false,
    } as RentalOrder,
    {
      id: 'o3',
      bookingCode: 'LOT-1003',
      customerPhone: '9876543212',
      rentalSubtotal: 500,
      securityDeposit: 1500,
      status: 'Cancelled',
      stockDeducted: false,
    } as RentalOrder,
  ];

  const kpis = calculateDashboardKPIs(products, orders);
  assert.deepEqual(kpis, {
    totalOrders: 3,
    activeAndPendingCount: 1,
    totalRentalRevenue: 2100,
    depositsHeld: 3000,
    totalCatalogItems: 2,
  });

  assert.equal(findTrackedOrders(orders, 'lot-1001').length, 1);
  assert.equal(findTrackedOrders(orders, '+91 9876543211').length, 1);
});

test('computeOrderStatusTransition handles multi-unit return, cancel, and idempotency', () => {
  // 2 PS5s booked down to 0 available; order #1 marked Picked Up (stays deducted)
  const pickedUp = computeOrderStatusTransition(true, 'Picked Up', 2, 0);
  assert.deepEqual(pickedUp, {
    nextStockDeducted: true,
    totalQuantity: 2,
    availableQuantity: 0,
    available: false,
    stockChanged: false,
  });

  // Order #1 marked Returned -> restores 0 -> 1
  const returned1 = computeOrderStatusTransition(
    pickedUp.nextStockDeducted,
    'Returned',
    2,
    pickedUp.availableQuantity,
  );
  assert.deepEqual(returned1, {
    nextStockDeducted: false,
    totalQuantity: 2,
    availableQuantity: 1,
    available: true,
    stockChanged: true,
  });

  // Re-cancelling an already-returned order must NOT double-restore (stays 1)
  const cancelAlreadyReturned = computeOrderStatusTransition(
    returned1.nextStockDeducted,
    'Cancelled',
    2,
    returned1.availableQuantity,
  );
  assert.deepEqual(cancelAlreadyReturned, {
    nextStockDeducted: false,
    totalQuantity: 2,
    availableQuantity: 1,
    available: true,
    stockChanged: false,
  });

  // Order #2 marked Cancelled -> restores 1 -> 2
  const cancelled2 = computeOrderStatusTransition(
    true,
    'Cancelled',
    2,
    returned1.availableQuantity,
  );
  assert.deepEqual(cancelled2, {
    nextStockDeducted: false,
    totalQuantity: 2,
    availableQuantity: 2,
    available: true,
    stockChanged: true,
  });
});

test('filterCustomerOrders matches userId or case-insensitive email and sorts newest-first', () => {
  const orders: RentalOrder[] = [
    {
      id: 'o1',
      bookingCode: 'LOT-1001',
      userId: 'uid-alice',
      customerEmail: 'alice@example.com',
      customerPhone: '9876543210',
      status: 'Pending',
      createdAt: 1000,
    } as RentalOrder,
    {
      id: 'o2',
      bookingCode: 'LOT-1002',
      customerEmail: 'Alice@Example.com',
      customerPhone: '9876543210',
      status: 'Returned',
      createdAt: 3000,
    } as RentalOrder,
    {
      id: 'o3',
      bookingCode: 'LOT-1003',
      userId: 'uid-alice',
      customerEmail: 'other@example.com',
      customerPhone: '9876500000',
      status: 'Cancelled',
      createdAt: 2000,
    } as RentalOrder,
    {
      id: 'o4',
      bookingCode: 'LOT-1004',
      userId: 'uid-bob',
      customerEmail: 'bob@example.com',
      customerPhone: '9876543210',
      status: 'Confirmed',
      createdAt: 4000,
    } as RentalOrder,
  ];

  const matched = filterCustomerOrders(orders, 'uid-alice', 'ALICE@example.com');
  assert.deepEqual(
    matched.map((o) => o.bookingCode),
    ['LOT-1002', 'LOT-1003', 'LOT-1001'],
  );

  const grouped = categorizeCustomerOrders(matched);
  assert.equal(grouped.all.length, 3);
  assert.equal(grouped.active.length, 1);
  assert.equal(grouped.activeCount, 1);
  assert.equal(grouped.history.length, 2);

  // Guest phone lookup returns all matching orders newest-first
  const phoneLookup = findTrackedOrders(orders, '9876543210');
  assert.deepEqual(
    phoneLookup.map((o) => o.bookingCode),
    ['LOT-1004', 'LOT-1002', 'LOT-1001'],
  );
});

