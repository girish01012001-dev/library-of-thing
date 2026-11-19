import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { OrderStatus, Product, RentalOrder } from '../types';
import {
  calculateDashboardKPIs,
  formatDisplayDate,
  formatINR,
} from '../utils/rentalMath';
import { ProductFormModal } from './ProductFormModal';
import { ProductImage } from './ProductImage';

interface AdminDashboardProps {
  products: Product[];
  orders: RentalOrder[];
  onExitAdmin: () => void;
  onLockAdmin: () => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onSaveProduct: (
    data: Omit<Product, 'id' | 'createdAt'>,
    existingId?: string,
  ) => Promise<void>;
  onAdjustStock: (productId: string, delta: 1 | -1) => Promise<void>;
  onToggleAvailability: (productId: string) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onResetSampleCatalog: () => Promise<void>;
}

type AdminTab = 'orders' | 'inventory';
type OrderFilter = 'All' | OrderStatus;

const ORDER_FILTERS: OrderFilter[] = [
  'All',
  'Pending',
  'Confirmed',
  'Picked Up',
  'Returned',
  'Cancelled',
];

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Picked Up',
  'Returned',
  'Cancelled',
];

export function AdminDashboard({
  products,
  orders,
  onExitAdmin,
  onLockAdmin,
  onUpdateOrderStatus,
  onSaveProduct,
  onAdjustStock,
  onToggleAvailability,
  onDeleteProduct,
  onResetSampleCatalog,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('All');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmResetCatalog, setConfirmResetCatalog] = useState(false);
  const [updatingOrderIds, setUpdatingOrderIds] = useState<Set<string>>(
    () => new Set(),
  );

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    if (updatingOrderIds.has(orderId)) return;
    setUpdatingOrderIds((prev) => {
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });
    try {
      await onUpdateOrderStatus(orderId, status);
    } finally {
      setUpdatingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const kpis = calculateDashboardKPIs(products, orders);

  const filteredOrders =
    orderFilter === 'All'
      ? orders
      : orders.filter((o) => o.status === orderFilter);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1F2933]">
      {/* Admin Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E4E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E4E7EB] hover:border-[#1B4332] text-xs font-semibold text-[#1F2933] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </button>
            <span className="text-sm sm:text-base font-bold text-[#1F2933] truncate">
              Library of Things · Staff Dashboard
            </span>
          </div>

          <button
            type="button"
            onClick={onLockAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E4E7EB] hover:bg-[#FAF9F6] text-xs font-semibold text-[#52606D] hover:text-[#1F2933] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Business KPI Cards */}
        <section aria-label="Business metrics">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-[#E4E7EB] bg-white p-4 sm:p-5">
              <p className="text-xs font-medium text-[#52606D]">Total Orders</p>
              <p
                data-testid="kpi-total-orders"
                className="mt-2 text-2xl font-extrabold text-[#1F2933] tabular-nums"
              >
                {kpis.totalOrders}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4E7EB] bg-white p-4 sm:p-5">
              <p className="text-xs font-medium text-[#52606D]">
                Active / Pending Rentals
              </p>
              <p
                data-testid="kpi-active-rentals"
                className="mt-2 text-2xl font-extrabold text-[#1B4332] tabular-nums"
              >
                {kpis.activeAndPendingCount}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4E7EB] bg-white p-4 sm:p-5">
              <p className="text-xs font-medium text-[#52606D]">
                Total Rental Revenue
              </p>
              <p
                data-testid="kpi-rental-revenue"
                className="mt-2 text-2xl font-extrabold text-[#1F2933] tabular-nums"
              >
                {formatINR(kpis.totalRentalRevenue)}
              </p>
              <p className="mt-0.5 text-[11px] text-[#52606D]">
                Excludes deposits
              </p>
            </div>

            <div className="rounded-2xl border border-[#E4E7EB] bg-white p-4 sm:p-5">
              <p className="text-xs font-medium text-[#52606D]">
                Refundable Deposits Held
              </p>
              <p
                data-testid="kpi-deposits-held"
                className="mt-2 text-2xl font-extrabold text-[#1F2933] tabular-nums"
              >
                {formatINR(kpis.depositsHeld)}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-2xl border border-[#E4E7EB] bg-white p-4 sm:p-5">
              <p className="text-xs font-medium text-[#52606D]">
                Total Catalog Items
              </p>
              <p
                data-testid="kpi-catalog-items"
                className="mt-2 text-2xl font-extrabold text-[#1F2933] tabular-nums"
              >
                {kpis.totalCatalogItems}
              </p>
            </div>
          </div>
        </section>

        {/* Primary Admin Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E7EB] pb-4">
          <div
            role="tablist"
            aria-label="Admin sections"
            className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#E4E7EB] self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'orders'
                  ? 'bg-[#1B4332] text-white'
                  : 'text-[#52606D] hover:text-[#1F2933]'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Live Customer Orders ({orders.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'inventory'
                  ? 'bg-[#1B4332] text-white'
                  : 'text-[#52606D] hover:text-[#1F2933]'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Inventory Management ({products.length})</span>
            </button>
          </div>

          {activeTab === 'orders' ? (
            <p className="text-xs text-[#52606D]">
              Stock automatically restores when an order is marked Returned or Cancelled.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              {confirmResetCatalog ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E4E7EB] text-xs">
                  <span className="font-medium text-[#1F2933]">Restore 8 sample items?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await onResetSampleCatalog();
                      setConfirmResetCatalog(false);
                    }}
                    className="font-bold text-[#1B4332] hover:underline cursor-pointer"
                  >
                    Yes, Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmResetCatalog(false)}
                    className="text-[#52606D] hover:text-[#1F2933] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetCatalog(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E4E7EB] hover:border-[#1B4332] text-xs font-semibold text-[#52606D] hover:text-[#1F2933] whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset / Load Sample Catalog</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setFormModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Item</span>
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: LIVE CUSTOMER ORDERS */}
        {activeTab === 'orders' && (
          <section aria-label="Live customer orders" className="space-y-5">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {ORDER_FILTERS.map((status) => {
                const count =
                  status === 'All'
                    ? orders.length
                    : orders.filter((o) => o.status === status).length;
                const active = orderFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setOrderFilter(status)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#1B4332] text-white'
                        : 'bg-white border border-[#E4E7EB] text-[#52606D] hover:text-[#1F2933]'
                    }`}
                  >
                    {status} ({count})
                  </button>
                );
              })}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-[#E4E7EB] bg-white p-10 text-center">
                <p className="text-base font-semibold text-[#1F2933]">
                  No {orderFilter === 'All' ? '' : orderFilter.toLowerCase()} orders yet
                </p>
                <p className="mt-1 text-sm text-[#52606D]">
                  New customer bookings placed on the storefront appear here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isUpdating = updatingOrderIds.has(order.id);
                  return (
                  <div
                    key={order.id}
                    data-testid={`admin-order-${order.bookingCode}`}
                    className="rounded-2xl border border-[#E4E7EB] bg-white p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-20 h-16 rounded-xl overflow-hidden border border-[#E4E7EB] bg-[#F2F1EC] shrink-0">
                        <ProductImage
                          src={order.productImage}
                          alt={order.productName}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-[#1B4332]">
                            {order.bookingCode}
                          </span>
                          <span aria-hidden="true" className="text-[#9AA5B1]">·</span>
                          <span
                            className={`font-bold ${
                              order.status === 'Cancelled'
                                ? 'text-red-700'
                                : order.status === 'Returned' || order.status === 'Confirmed'
                                  ? 'text-[#1B4332]'
                                  : 'text-[#B45309]'
                            }`}
                          >
                            {order.status}
                          </span>
                          <span aria-hidden="true" className="text-[#9AA5B1]">·</span>
                          <span className="text-[#52606D]">
                            {order.paymentMethod}
                          </span>
                          <span aria-hidden="true" className="text-[#9AA5B1]">·</span>
                          <span className="text-[#52606D]">
                            {order.stockDeducted ? '1 unit reserved' : 'Stock released'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-[#1F2933] truncate">
                          {order.productName}
                        </h3>

                        <p className="text-xs sm:text-sm text-[#1F2933]">
                          <span className="font-semibold">{order.customerName}</span>{' '}
                          <span className="text-[#52606D] tabular-nums">
                            · {order.customerPhone} · {order.locality}
                          </span>
                        </p>

                        <p className="text-xs text-[#52606D] tabular-nums">
                          {formatDisplayDate(order.startDate)} – {formatDisplayDate(order.endDate)} ({order.totalDays}{' '}
                          {order.totalDays === 1 ? 'day' : 'days'}) ·{' '}
                          {order.deliveryMethod === 'delivery'
                            ? `Delivery (${order.addressNote})`
                            : 'Self-Pickup at Store'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#E4E7EB] shrink-0">
                      <div className="text-left lg:text-right tabular-nums">
                        <p className="text-sm font-extrabold text-[#1F2933]">
                          Rent: {formatINR(order.rentalSubtotal)}{' '}
                          <span className="font-medium text-[#52606D]">
                            + Deposit: {formatINR(order.securityDeposit)}
                          </span>
                        </p>
                        <p className="text-xs text-[#52606D]">
                          Total Payable: {formatINR(order.grandTotal)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor={`status-select-${order.id}`} className="sr-only">
                          Status for order {order.bookingCode}
                        </label>
                        <select
                          id={`status-select-${order.id}`}
                          disabled={isUpdating}
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value as OrderStatus)
                          }
                          className="px-3 py-1.5 rounded-xl border border-[#E4E7EB] bg-[#FAF9F6] text-xs font-semibold text-[#1F2933] disabled:opacity-50 cursor-pointer"
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>

                        {order.status === 'Pending' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(order.id, 'Confirmed')}
                            className="px-3 py-1.5 rounded-xl bg-[#1B4332] text-white text-xs font-semibold hover:bg-[#143325] disabled:opacity-50 cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}
                        {(order.status === 'Pending' || order.status === 'Confirmed') && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(order.id, 'Picked Up')}
                            className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E4E7EB] hover:border-[#1B4332] text-xs font-semibold text-[#1F2933] disabled:opacity-50 cursor-pointer"
                          >
                            Mark Picked Up
                          </button>
                        )}
                        {order.status === 'Picked Up' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(order.id, 'Returned')}
                            className="px-3 py-1.5 rounded-xl bg-[#D8F3DC] text-[#1B4332] text-xs font-semibold hover:bg-[#B7E4C7] disabled:opacity-50 cursor-pointer"
                          >
                            Mark Returned
                          </button>
                        )}
                        {order.status !== 'Returned' && order.status !== 'Cancelled' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(order.id, 'Cancelled')}
                            className="px-3 py-1.5 rounded-xl border border-[#E4E7EB] text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: INVENTORY MANAGEMENT */}
        {activeTab === 'inventory' && (
          <section aria-label="Inventory management">
            {products.length === 0 ? (
              <div className="rounded-2xl border border-[#E4E7EB] bg-white p-10 text-center">
                <p className="text-base font-semibold text-[#1F2933]">
                  Your store catalog is empty
                </p>
                <p className="mt-1 text-sm text-[#52606D]">
                  Add a new rental item or load the sample Dehradun catalog.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => {
                  const isOut = product.availableQuantity <= 0;
                  const isLow = product.availableQuantity === 1;
                  const stockText = isOut
                    ? `0 of ${product.totalQuantity} — Out of Stock`
                    : `${product.availableQuantity} of ${product.totalQuantity} Available`;

                  return (
                    <div
                      key={product.id}
                      data-testid={`admin-product-${product.id}`}
                      className="rounded-2xl border border-[#E4E7EB] bg-white p-4 sm:p-5 flex gap-4 items-start"
                    >
                      <div className="w-24 h-20 rounded-xl overflow-hidden border border-[#E4E7EB] bg-[#F2F1EC] shrink-0">
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-xs mb-1">
                          <span className="text-[#52606D] truncate">
                            {product.category} · {product.condition}
                          </span>
                          <span
                            data-testid={`admin-stock-${product.id}`}
                            className={`inline-flex items-center gap-1 font-semibold tabular-nums shrink-0 ${
                              isOut
                                ? 'text-[#B91C1C]'
                                : isLow
                                  ? 'text-[#B45309]'
                                  : 'text-[#1B4332]'
                            }`}
                          >
                            {isOut ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : isLow ? (
                              <AlertCircle className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>{stockText}</span>
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-[#1F2933] truncate">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-xs text-[#52606D] tabular-nums">
                          <span className="font-bold text-[#1F2933]">
                            {formatINR(product.dailyPrice)}/day
                          </span>{' '}
                          · Deposit {formatINR(product.securityDeposit)}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {/* Quick - / + Stock Stepper */}
                          <div className="inline-flex items-center rounded-lg border border-[#E4E7EB] bg-[#FAF9F6]">
                            <button
                              type="button"
                              aria-label={`Decrease stock for ${product.name}`}
                              disabled={product.totalQuantity <= 1}
                              onClick={() => onAdjustStock(product.id, -1)}
                              className="p-1.5 text-[#1F2933] hover:bg-white disabled:opacity-40 rounded-l-lg cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2 text-xs font-semibold text-[#1F2933] tabular-nums">
                              Qty: {product.totalQuantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase stock for ${product.name}`}
                              onClick={() => onAdjustStock(product.id, 1)}
                              className="p-1.5 text-[#1F2933] hover:bg-white rounded-r-lg cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onToggleAvailability(product.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#E4E7EB] hover:border-[#1B4332] text-xs font-semibold text-[#1F2933] cursor-pointer"
                          >
                            {product.availableQuantity > 0
                              ? 'Mark Out of Stock'
                              : 'Restore Stock'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingProduct(product);
                              setFormModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E4E7EB] hover:border-[#1B4332] text-xs font-semibold text-[#1F2933] cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          {confirmDeleteId === product.id ? (
                            <div className="inline-flex items-center gap-2 text-xs">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteProduct(product.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="font-bold text-red-700 hover:underline cursor-pointer"
                              >
                                Confirm Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-[#52606D] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Delete ${product.name}`}
                              onClick={() => setConfirmDeleteId(product.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E4E7EB] hover:bg-red-50 text-xs font-semibold text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>

      <ProductFormModal
        isOpen={formModalOpen}
        editingProduct={editingProduct}
        onClose={() => {
          setFormModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={onSaveProduct}
      />
    </div>
  );
}
