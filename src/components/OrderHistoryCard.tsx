import { useState } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  MapPin,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react';
import type { OrderStatus, RentalOrder } from '../types';
import { formatDisplayDate, formatINR } from '../utils/rentalMath';
import { ProductImage } from './ProductImage';

interface OrderHistoryCardProps {
  order: RentalOrder;
  onViewReceipt: (order: RentalOrder) => void;
  onRentAgain?: (productId: string) => void;
  testIdPrefix?: string;
}

const PROGRESS_STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'Pending', label: 'Order Placed' },
  { status: 'Confirmed', label: 'Confirmed' },
  { status: 'Picked Up', label: 'Picked Up' },
  { status: 'Returned', label: 'Returned' },
];

export function OrderHistoryCard({
  order,
  onViewReceipt,
  onRentAgain,
  testIdPrefix = 'tracked-order',
}: OrderHistoryCardProps) {
  const [copied, setCopied] = useState(false);

  const currentIdx = PROGRESS_STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === 'Cancelled';
  const isReturned = order.status === 'Returned';

  const handleCopyBookingCode = async () => {
    try {
      await navigator.clipboard.writeText(order.bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <article
      data-testid={`${testIdPrefix}-${order.bookingCode}`}
      className="rounded-2xl border border-[#E4E7EB] bg-[#FAF9F6] p-4 sm:p-5 space-y-4"
    >
      {/* Top row: Thumbnail + Title + Booking Code + Status */}
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-16 h-14 rounded-xl overflow-hidden border border-[#E4E7EB] bg-[#F2F1EC] shrink-0">
          <ProductImage
            src={order.productImage}
            alt={order.productName}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#1B4332]">
                {order.bookingCode}
              </span>
              <button
                type="button"
                onClick={handleCopyBookingCode}
                aria-label={`Copy booking code ${order.bookingCode}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E4E7EB] hover:border-[#1B4332] text-[11px] font-semibold text-[#52606D] hover:text-[#1B4332] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-[#1B4332]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <span
              className={`inline-flex items-center gap-1 text-xs font-bold shrink-0 ${
                isCancelled
                  ? 'text-red-700'
                  : isReturned || order.status === 'Confirmed'
                    ? 'text-[#1B4332]'
                    : 'text-[#B45309]'
              }`}
            >
              {isCancelled ? (
                <XCircle className="w-4 h-4" />
              ) : order.status === 'Pending' ? (
                <Clock className="w-4 h-4" />
              ) : order.status === 'Picked Up' ? (
                <Truck className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{order.status}</span>
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-[#1F2933] leading-snug line-clamp-2 mt-1">
            {order.productName}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#52606D] tabular-nums">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
              {formatDisplayDate(order.startDate)} – {formatDisplayDate(order.endDate)} ·{' '}
              {order.totalDays} {order.totalDays === 1 ? 'day' : 'days'}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
              {order.deliveryMethod === 'delivery'
                ? `Doorstep Delivery · ${order.locality}`
                : 'Store Pickup · Rajpur Road'}
            </span>
          </div>
        </div>
      </div>

      {/* 4-Step Progress Bar OR Cancelled Notice */}
      {isCancelled ? (
        <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2 flex items-center gap-2 text-xs font-medium text-red-700">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>Order Cancelled · Unit released back to Dehradun store stock</span>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 pt-1">
          {PROGRESS_STEPS.map((step, idx) => {
            const completed = idx <= currentIdx;
            return (
              <div key={step.status} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    completed ? 'bg-[#1B4332]' : 'bg-[#E4E7EB]'
                  }`}
                />
                <p
                  className={`text-[11px] font-medium ${
                    completed ? 'text-[#1F2933]' : 'text-[#7B8794]'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Transparent Price Summary */}
      <div className="rounded-xl bg-white border border-[#E4E7EB] px-3.5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs tabular-nums">
        <div>
          <span className="text-[#52606D] block">Rental Subtotal</span>
          <span className="font-semibold text-[#1F2933]">
            {formatINR(order.rentalSubtotal)}
          </span>
        </div>

        <div>
          <span className="text-[#52606D] block">Refundable Deposit</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#1F2933]">
            <span>{formatINR(order.securityDeposit)}</span>
            {isReturned && (
              <span className="px-1.5 py-0.5 rounded bg-[#D8F3DC] text-[#1B4332] text-[10px] font-bold">
                Refunded
              </span>
            )}
          </span>
        </div>

        <div>
          <span className="text-[#52606D] block">Delivery Fee</span>
          <span className="font-semibold text-[#1F2933]">
            {order.deliveryFee > 0 ? formatINR(order.deliveryFee) : 'Free'}
          </span>
        </div>

        <div className="sm:text-right">
          <span className="text-[#52606D] block">Grand Total</span>
          <span className="font-extrabold text-[#1B4332]">
            {formatINR(order.grandTotal)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-[11px] text-[#52606D]">
          Payment at handover: <strong className="text-[#1F2933]">{order.paymentMethod}</strong>
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onViewReceipt(order)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E4E7EB] hover:border-[#1B4332] text-xs font-semibold text-[#1F2933] cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span>View Full Receipt</span>
          </button>

          {isReturned && onRentAgain && (
            <button
              type="button"
              onClick={() => onRentAgain(order.productId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-xs font-semibold text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rent Again</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
