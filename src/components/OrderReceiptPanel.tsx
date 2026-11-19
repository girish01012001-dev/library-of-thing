import { useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import type { RentalOrder } from '../types';
import {
  formatDisplayDate,
  formatINR,
  formatKolkataDateTime,
} from '../utils/rentalMath';
import { ProductImage } from './ProductImage';

interface OrderReceiptPanelProps {
  order: RentalOrder;
  onBack: () => void;
  onRentAgain?: (productId: string) => void;
}

export function OrderReceiptPanel({
  order,
  onBack,
  onRentAgain,
}: OrderReceiptPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(order.bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const isReturned = order.status === 'Returned';
  const isCancelled = order.status === 'Cancelled';

  return (
    <div data-testid={`order-receipt-${order.bookingCode}`} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#1B4332] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E4E7EB] hover:border-[#1B4332] text-xs font-semibold text-[#1F2933] cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#1B4332]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy {order.bookingCode}</span>
              </>
            )}
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

      {/* Official Receipt Sheet */}
      <div className="rounded-2xl border border-[#E4E7EB] bg-[#FAF9F6] overflow-hidden">
        {/* Store & Booking Header */}
        <div className="px-5 py-4 bg-white border-b border-[#E4E7EB] flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#2D6A4F]">
              Library of Things · Official Rental Receipt
            </p>
            <h3 className="text-lg font-bold text-[#1F2933] mt-0.5">
              Booking <span className="font-mono text-[#1B4332]">{order.bookingCode}</span>
            </h3>
            <p className="text-xs text-[#52606D] mt-0.5 tabular-nums">
              Placed on {formatKolkataDateTime(order.createdAt)} IST
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
              isCancelled
                ? 'bg-red-50 text-red-700 border border-red-200'
                : isReturned || order.status === 'Confirmed'
                  ? 'bg-[#D8F3DC] text-[#1B4332]'
                  : 'bg-amber-50 text-[#B45309] border border-amber-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{order.status}</span>
          </span>
        </div>

        {/* Item Summary */}
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-16 rounded-xl overflow-hidden border border-[#E4E7EB] bg-[#F2F1EC] shrink-0">
              <ProductImage
                src={order.productImage}
                alt={order.productName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-[#1F2933]">{order.productName}</p>
              <p className="text-xs text-[#52606D] mt-1 inline-flex items-center gap-1.5 tabular-nums">
                <CalendarDays className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>
                  {formatDisplayDate(order.startDate)} – {formatDisplayDate(order.endDate)} ·{' '}
                  {order.totalDays} {order.totalDays === 1 ? 'day' : 'days'}
                </span>
              </p>
            </div>
          </div>

          {/* Customer & Handover Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-white border border-[#E4E7EB] p-4 text-xs">
            <div className="space-y-1.5">
              <p className="font-bold text-[#1F2933] uppercase tracking-wider text-[11px]">
                Customer Details
              </p>
              <p className="text-[#1F2933] font-semibold flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>{order.customerName}</span>
              </p>
              <p className="text-[#52606D] flex items-center gap-1.5 tabular-nums">
                <Phone className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>+91 {order.customerPhone}</span>
              </p>
              <p className="text-[#52606D] flex items-center gap-1.5 break-all">
                <Mail className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                <span>{order.customerEmail}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="font-bold text-[#1F2933] uppercase tracking-wider text-[11px]">
                Handover &amp; Store Hub
              </p>
              <p className="text-[#1F2933] font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                <span>
                  {order.deliveryMethod === 'delivery'
                    ? `Doorstep Delivery · ${order.locality}`
                    : 'Self-Pickup · Rajpur Road Store'}
                </span>
              </p>
              <p className="text-[#52606D] leading-relaxed">
                {order.deliveryMethod === 'delivery'
                  ? order.addressNote
                  : 'Near Pacific Mall, Rajpur Road, Dehradun 248001'}
              </p>
            </div>
          </div>

          {/* Itemized Financial Breakdown */}
          <div className="rounded-xl bg-white border border-[#E4E7EB] p-4 space-y-2.5 text-sm tabular-nums">
            <div className="flex justify-between text-[#52606D]">
              <span>
                Rental Fee ({formatINR(order.dailyPrice)}/day × {order.totalDays}{' '}
                {order.totalDays === 1 ? 'day' : 'days'})
              </span>
              <span className="font-semibold text-[#1F2933]">
                {formatINR(order.rentalSubtotal)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[#52606D]">
              <span className="inline-flex items-center gap-2">
                <span>Refundable Security Deposit</span>
                {isReturned && (
                  <span className="px-2 py-0.5 rounded bg-[#D8F3DC] text-[#1B4332] text-[11px] font-bold">
                    Refunded
                  </span>
                )}
              </span>
              <span className="font-semibold text-[#1F2933]">
                {formatINR(order.securityDeposit)}
              </span>
            </div>

            <div className="flex justify-between text-[#52606D]">
              <span>
                {order.deliveryMethod === 'delivery'
                  ? `Doorstep Delivery (${order.locality})`
                  : 'Self-Pickup Fee'}
              </span>
              <span className="font-semibold text-[#1F2933]">
                {order.deliveryFee > 0 ? formatINR(order.deliveryFee) : 'Free'}
              </span>
            </div>

            <div className="pt-2.5 border-t border-[#E4E7EB] flex justify-between items-center">
              <span className="font-bold text-[#1F2933]">
                Grand Total ({order.paymentMethod} at Handover)
              </span>
              <span className="text-lg font-extrabold text-[#1B4332]">
                {formatINR(order.grandTotal)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-[#52606D]">
            <ShieldCheck className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" />
            <span>
              Original Government or College ID verification required at handover. Need help? Call{' '}
              <strong className="text-[#1F2933] tabular-nums">+91 98765 43210</strong> (10 AM – 8 PM IST).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
