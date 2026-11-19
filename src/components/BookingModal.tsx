import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  PackageCheck,
  ShieldCheck,
  Truck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  DEHRADUN_LOCALITIES,
  type CustomerProfile,
  type DeliveryMethod,
  type PaymentMethod,
  type Product,
  type RentalOrder,
} from '../types';
import {
  addDaysToISODate,
  calculatePricingBreakdown,
  calculateRentalDays,
  DOORSTEP_DELIVERY_FEE,
  formatDisplayDate,
  formatINR,
  generateBookingCode,
  getStockDisplayInfo,
  getTodayInKolkata,
  validateBookingForm,
  type BookingValidationErrors,
} from '../utils/rentalMath';
import { ProductImage } from './ProductImage';

interface BookingModalProps {
  product: Product | null;
  customerProfile: CustomerProfile | null;
  onRequestAuth: () => void;
  onClose: () => void;
  onCreateOrder: (
    order: Omit<RentalOrder, 'id' | 'stockDeducted'>,
    profileUpdates?: Partial<CustomerProfile>,
  ) => Promise<RentalOrder>;
  onTrackCreatedOrder: (bookingCode: string) => void;
}

export function BookingModal({
  product,
  customerProfile,
  onRequestAuth,
  onClose,
  onCreateOrder,
  onTrackCreatedOrder,
}: BookingModalProps) {
  const todayISO = getTodayInKolkata();
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(addDaysToISODate(todayISO, 2));
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [locality, setLocality] = useState<string>('Rajpur Road');
  const [addressNote, setAddressNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [govIdConfirmed, setGovIdConfirmed] = useState(false);

  const [errors, setErrors] = useState<BookingValidationErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<RentalOrder | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset modal fields when opening a different product
  useEffect(() => {
    if (!product) return;
    const today = getTodayInKolkata();
    setStartDate(today);
    setEndDate(addDaysToISODate(today, 2));
    setDeliveryMethod('pickup');
    setCustomerName(customerProfile?.name || '');
    setCustomerPhone(customerProfile?.phone || '');
    setCustomerEmail(customerProfile?.email || '');
    setLocality(customerProfile?.locality || 'Rajpur Road');
    setAddressNote(customerProfile?.addressNote || '');
    setPaymentMethod('UPI');
    setGovIdConfirmed(false);
    setErrors({});
    setSubmitError('');
    setSubmitting(false);
    setConfirmedOrder(null);
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Pre-fill empty fields if user signs in while modal is already open (preserving selected item & dates)
  useEffect(() => {
    if (!product || !customerProfile) return;
    setCustomerName((prev) => prev || customerProfile.name || '');
    setCustomerEmail((prev) => prev || customerProfile.email || '');
    setCustomerPhone((prev) => prev || customerProfile.phone || '');
    setLocality((prev) =>
      prev && prev !== 'Rajpur Road'
        ? prev
        : customerProfile.locality || 'Rajpur Road',
    );
    setAddressNote((prev) => prev || customerProfile.addressNote || '');
  }, [product, customerProfile]);

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const stockInfo = getStockDisplayInfo(product.availableQuantity);
  const isOutOfStock = !stockInfo.isAvailable;

  const calculatedDays = calculateRentalDays(startDate, endDate);
  const safeDays = calculatedDays ?? 1;
  const pricing = calculatePricingBreakdown(
    product.dailyPrice,
    product.securityDeposit,
    safeDays,
    deliveryMethod,
  );

  const handleStartDateChange = (nextStart: string) => {
    setStartDate(nextStart);
    if (endDate && nextStart > endDate) {
      setEndDate(nextStart);
    }
    if (errors.dates) setErrors((prev) => ({ ...prev, dates: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (isOutOfStock) {
      setSubmitError('This item is currently out of stock.');
      return;
    }

    const validationErrors = validateBookingForm(
      {
        customerName,
        customerPhone,
        customerEmail,
        locality,
        deliveryMethod,
        addressNote,
        startDate,
        endDate,
        govIdConfirmed,
      },
      todayISO,
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const normalizedPhone = customerPhone.replace(/\D/g, '').slice(-10);
      const orderPayload: Omit<RentalOrder, 'id' | 'stockDeducted'> = {
        bookingCode: generateBookingCode(),
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        ...(customerProfile?.uid ? { userId: customerProfile.uid } : {}),
        customerName: customerName.trim(),
        customerPhone: normalizedPhone,
        customerEmail: customerEmail.trim(),
        locality,
        deliveryMethod,
        addressNote:
          deliveryMethod === 'delivery'
            ? addressNote.trim()
            : 'Self-Pickup at Rajpur Road Store',
        startDate,
        endDate,
        totalDays: pricing.totalDays,
        dailyPrice: product.dailyPrice,
        rentalSubtotal: pricing.rentalSubtotal,
        securityDeposit: pricing.securityDeposit,
        deliveryFee: pricing.deliveryFee,
        grandTotal: pricing.grandTotal,
        paymentMethod,
        status: 'Pending',
        createdAt: Date.now(),
      };

      const profileUpdates = customerProfile
        ? {
            name: customerName.trim(),
            phone: normalizedPhone,
            locality,
            addressNote:
              deliveryMethod === 'delivery'
                ? addressNote.trim()
                : customerProfile.addressNote,
          }
        : undefined;

      const created = await onCreateOrder(orderPayload, profileUpdates);
      setConfirmedOrder(created);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Unable to complete booking right now. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!confirmedOrder) return;
    try {
      await navigator.clipboard.writeText(confirmedOrder.bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1F2933]/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-[#E4E7EB] shadow-xl">
        {/* Sticky modal header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-7 py-4 bg-white border-b border-[#E4E7EB]">
          <div>
            <p className="text-xs font-medium text-[#2D6A4F]">
              {product.category} · {product.brandModel}
            </p>
            <h2
              id="booking-modal-title"
              className="text-lg sm:text-xl font-bold text-[#1F2933]"
            >
              {confirmedOrder ? 'Rental Request Confirmed' : product.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close rental booking dialog"
            className="w-9 h-9 rounded-xl border border-[#E4E7EB] flex items-center justify-center text-[#52606D] hover:text-[#1F2933] hover:bg-[#FAF9F6] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedOrder ? (
          /* Booking Confirmation Screen */
          <div className="p-6 sm:p-10 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#D8F3DC] text-[#1B4332] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-[#1F2933]">
                Booking Received!
              </h3>
              <p className="mt-2 text-sm text-[#52606D]">
                Our Dehradun store team has reserved 1 unit for you and will confirm shortly.
              </p>

              <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-[#FAF9F6] border border-[#E4E7EB]">
                <div className="text-left">
                  <p className="text-xs text-[#52606D]">Booking Code</p>
                  <p
                    data-testid="confirmed-booking-code"
                    className="text-xl font-mono font-bold text-[#1B4332] tracking-wide"
                  >
                    {confirmedOrder.bookingCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E4E7EB] hover:border-[#1B4332] text-xs font-semibold text-[#1F2933] cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#1B4332]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Booking ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-[#E4E7EB] bg-[#FAF9F6] p-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-[#52606D]">Item</span>
                <span className="font-semibold text-[#1F2933] text-right">
                  {confirmedOrder.productName}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#52606D]">Dates</span>
                <span className="font-medium text-[#1F2933] tabular-nums">
                  {formatDisplayDate(confirmedOrder.startDate)} –{' '}
                  {formatDisplayDate(confirmedOrder.endDate)} ({confirmedOrder.totalDays}{' '}
                  {confirmedOrder.totalDays === 1 ? 'day' : 'days'})
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#52606D]">Handover</span>
                <span className="font-medium text-[#1F2933] text-right">
                  {confirmedOrder.deliveryMethod === 'delivery'
                    ? `Doorstep Delivery (${confirmedOrder.locality})`
                    : 'Self-Pickup at Rajpur Road Store'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#52606D]">Payment Preference</span>
                <span className="font-medium text-[#1F2933]">
                  {confirmedOrder.paymentMethod} at Handover
                </span>
              </div>
              <div className="pt-3 border-t border-[#E4E7EB] flex justify-between gap-4 tabular-nums">
                <span className="font-bold text-[#1F2933]">
                  Total Payable at Handover
                </span>
                <span className="font-extrabold text-[#1B4332]">
                  {formatINR(confirmedOrder.grandTotal)}
                </span>
              </div>
              <p className="text-xs text-[#52606D] tabular-nums">
                Includes {formatINR(confirmedOrder.securityDeposit)} refundable deposit returned on safe return.
              </p>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => onTrackCreatedOrder(confirmedOrder.bookingCode)}
                className="px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-white text-sm font-semibold cursor-pointer"
              >
                View My Orders
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white border border-[#E4E7EB] hover:border-[#1B4332] text-[#1F2933] text-sm font-semibold cursor-pointer"
              >
                Back to Catalog
              </button>
            </div>
          </div>
        ) : (
          /* Product Details + Instant Booking Form */
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left column: Photo, stock count, details, accessories, rental rules */}
            <div className="lg:col-span-5 p-5 sm:p-7 border-b lg:border-b-0 lg:border-r border-[#E4E7EB] bg-[#FAF9F6]">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#E4E7EB] bg-[#F2F1EC]">
                <ProductImage
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#52606D]">
                  Condition: {product.condition} · {product.totalQuantity} in fleet
                </span>
                <span
                  data-testid="modal-stock-label"
                  className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                    stockInfo.tone === 'in-stock'
                      ? 'text-[#1B4332]'
                      : stockInfo.tone === 'low-stock'
                        ? 'text-[#B45309]'
                        : 'text-[#B91C1C]'
                  }`}
                >
                  {stockInfo.tone === 'in-stock' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : stockInfo.tone === 'low-stock' ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{stockInfo.label}</span>
                </span>
              </div>

              <p className="mt-3 text-sm text-[#52606D] leading-relaxed">
                {product.description}
              </p>

              <div className="mt-5 pt-5 border-t border-[#E4E7EB]">
                <h3 className="text-xs font-bold text-[#1F2933] uppercase tracking-wider mb-2.5">
                  Included in the Box
                </h3>
                <ul className="space-y-1.5">
                  {product.accessories.map((acc) => (
                    <li
                      key={acc}
                      className="flex items-start gap-2 text-xs sm:text-sm text-[#1F2933]"
                    >
                      <PackageCheck className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" />
                      <span>{acc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 pt-5 border-t border-[#E4E7EB]">
                <h3 className="text-xs font-bold text-[#1F2933] uppercase tracking-wider mb-2.5">
                  Dehradun Store Rules
                </h3>
                <ul className="space-y-1.5 text-xs text-[#52606D]">
                  <li>• Show original Aadhaar, Driving License, or College ID at handover.</li>
                  <li>• Security deposit is 100% refunded upon inspection at return.</li>
                  <li>• Need extra days? Message us 4 hours before return time.</li>
                </ul>
              </div>
            </div>

            {/* Right column: Google Sign-In prompt / pre-filled status + Date picker + Pricing + Form */}
            <div className="lg:col-span-7 p-5 sm:p-7 space-y-5">
              {/* Customer Cloud Sync Banner */}
              {customerProfile ? (
                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#D8F3DC]/45 border border-[#2D6A4F]/20 text-xs text-[#1B4332]">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span className="font-medium truncate">
                      Signed in as <strong>{customerProfile.email}</strong> — details synced to your account
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#FAF9F6] border border-[#E4E7EB]">
                  <p className="text-xs text-[#52606D]">
                    Sign in with Google to save &amp; track this order on any device.
                  </p>
                  <button
                    type="button"
                    onClick={onRequestAuth}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#E4E7EB] hover:border-[#1B4332] text-xs font-semibold text-[#1F2933] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Sign in with Google</span>
                  </button>
                </div>
              )}

              {isOutOfStock && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-900">
                  All {product.totalQuantity} {product.totalQuantity === 1 ? 'unit is' : 'units are'} currently out on rent. Check back shortly when a customer returns one!
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Date Range */}
                <div>
                  <h3 className="text-sm font-bold text-[#1F2933] mb-2.5">
                    1. Select Rental Dates
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="booking-start-date"
                        className="block text-xs font-medium text-[#52606D] mb-1"
                      >
                        Start Date
                      </label>
                      <input
                        id="booking-start-date"
                        type="date"
                        min={todayISO}
                        value={startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="booking-end-date"
                        className="block text-xs font-medium text-[#52606D] mb-1"
                      >
                        Return Date
                      </label>
                      <input
                        id="booking-end-date"
                        type="date"
                        min={startDate || todayISO}
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          if (errors.dates)
                            setErrors((prev) => ({ ...prev, dates: undefined }));
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                      />
                    </div>
                  </div>
                  {errors.dates && (
                    <p className="mt-1.5 text-xs font-medium text-red-600">{errors.dates}</p>
                  )}
                </div>

                {/* Delivery Option Toggle */}
                <div>
                  <h3 className="text-sm font-bold text-[#1F2933] mb-2.5">
                    2. Pickup or Dehradun Delivery
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        deliveryMethod === 'pickup'
                          ? 'border-[#1B4332] bg-[#D8F3DC]/35'
                          : 'border-[#E4E7EB] bg-white hover:border-[#1B4332]/40'
                      }`}
                    >
                      <p className="text-xs font-bold text-[#1F2933]">
                        Self-Pickup from Dehradun Store
                      </p>
                      <p className="mt-0.5 text-xs text-[#2D6A4F] font-semibold tabular-nums">
                        ₹0 · Rajpur Road Hub
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('delivery')}
                      className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        deliveryMethod === 'delivery'
                          ? 'border-[#1B4332] bg-[#D8F3DC]/35'
                          : 'border-[#E4E7EB] bg-white hover:border-[#1B4332]/40'
                      }`}
                    >
                      <p className="text-xs font-bold text-[#1F2933] inline-flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-[#1B4332]" />
                        <span>Doorstep Delivery in Dehradun</span>
                      </p>
                      <p className="mt-0.5 text-xs text-[#52606D] font-semibold tabular-nums">
                        +{formatINR(DOORSTEP_DELIVERY_FEE)} flat fee
                      </p>
                    </button>
                  </div>
                </div>

                {/* Live Pricing Breakdown Card */}
                <div
                  data-testid="pricing-breakdown"
                  className="rounded-2xl border border-[#E4E7EB] bg-[#FAF9F6] p-4 space-y-2.5 text-sm"
                >
                  <div className="flex items-center justify-between tabular-nums">
                    <span className="text-[#52606D]">
                      {formatINR(product.dailyPrice)} × {pricing.totalDays}{' '}
                      {pricing.totalDays === 1 ? 'day' : 'days'}
                    </span>
                    <span className="font-semibold text-[#1F2933]">
                      {formatINR(pricing.rentalSubtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between tabular-nums">
                    <div>
                      <span className="text-[#52606D]">Refundable Security Deposit</span>
                      <p className="text-[11px] text-[#2D6A4F] font-medium">
                        Refunded in full on safe return
                      </p>
                    </div>
                    <span className="font-semibold text-[#1F2933]">
                      {formatINR(pricing.securityDeposit)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between tabular-nums">
                    <span className="text-[#52606D]">
                      {deliveryMethod === 'delivery' ? 'Dehradun Doorstep Delivery' : 'Store Pickup'}
                    </span>
                    <span className="font-semibold text-[#1F2933]">
                      {formatINR(pricing.deliveryFee)}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-[#E4E7EB] flex items-center justify-between tabular-nums">
                    <span className="font-bold text-[#1F2933]">Total Payable Amount</span>
                    <span
                      data-testid="pricing-grand-total"
                      className="text-lg font-extrabold text-[#1B4332]"
                    >
                      {formatINR(pricing.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-3.5">
                  <h3 className="text-sm font-bold text-[#1F2933]">
                    3. Your Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="customer-name"
                        className="block text-xs font-medium text-[#52606D] mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        id="customer-name"
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (errors.customerName)
                            setErrors((prev) => ({ ...prev, customerName: undefined }));
                        }}
                        placeholder="e.g. Aarav Rawat"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                      />
                      {errors.customerName && (
                        <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="customer-phone"
                        className="block text-xs font-medium text-[#52606D] mb-1"
                      >
                        10-Digit Mobile Number
                      </label>
                      <input
                        id="customer-phone"
                        type="tel"
                        inputMode="numeric"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          if (errors.customerPhone)
                            setErrors((prev) => ({ ...prev, customerPhone: undefined }));
                        }}
                        placeholder="9876543210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] tabular-nums focus:outline-none focus:border-[#1B4332]"
                      />
                      {errors.customerPhone && (
                        <p className="mt-1 text-xs text-red-600">{errors.customerPhone}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="customer-email"
                        className="block text-xs font-medium text-[#52606D] mb-1"
                      >
                        Email Address
                      </label>
                      <input
                        id="customer-email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => {
                          setCustomerEmail(e.target.value);
                          if (errors.customerEmail)
                            setErrors((prev) => ({ ...prev, customerEmail: undefined }));
                        }}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                      />
                      {errors.customerEmail && (
                        <p className="mt-1 text-xs text-red-600">{errors.customerEmail}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="customer-locality"
                        className="block text-xs font-medium text-[#52606D] mb-1"
                      >
                        Dehradun Locality
                      </label>
                      <select
                        id="customer-locality"
                        value={locality}
                        onChange={(e) => setLocality(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] bg-white text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                      >
                        {DEHRADUN_LOCALITIES.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {deliveryMethod === 'delivery' && (
                    <div>
                      <label
                        htmlFor="customer-address"
                        className="block text-xs font-medium text-[#52606D] mb-1"
                      >
                        Delivery Address / Hostel / Landmark
                      </label>
                      <input
                        id="customer-address"
                        type="text"
                        value={addressNote}
                        onChange={(e) => {
                          setAddressNote(e.target.value);
                          if (errors.addressNote)
                            setErrors((prev) => ({ ...prev, addressNote: undefined }));
                        }}
                        placeholder="House no., street, or near UPES/Graphic Era landmark"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                      />
                      {errors.addressNote && (
                        <p className="mt-1 text-xs text-red-600">{errors.addressNote}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <span className="block text-xs font-medium text-[#52606D] mb-1.5">
                      Payment Preference
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                          paymentMethod === 'UPI'
                            ? 'border-[#1B4332] bg-[#D8F3DC]/35 text-[#1B4332]'
                            : 'border-[#E4E7EB] text-[#52606D]'
                        }`}
                      >
                        Pay via UPI at Pickup/Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Cash')}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-left cursor-pointer ${
                          paymentMethod === 'Cash'
                            ? 'border-[#1B4332] bg-[#D8F3DC]/35 text-[#1B4332]'
                            : 'border-[#E4E7EB] text-[#52606D]'
                        }`}
                      >
                        Cash at Pickup/Delivery
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={govIdConfirmed}
                        onChange={(e) => {
                          setGovIdConfirmed(e.target.checked);
                          if (errors.govIdConfirmed)
                            setErrors((prev) => ({
                              ...prev,
                              govIdConfirmed: undefined,
                            }));
                        }}
                        className="mt-0.5 w-4 h-4 accent-[#1B4332] rounded cursor-pointer"
                      />
                      <span className="text-xs text-[#52606D] leading-relaxed">
                        I confirm I will present a valid Government or College ID (Aadhaar / Driving License / Student ID) at handover.
                      </span>
                    </label>
                    {errors.govIdConfirmed && (
                      <p className="mt-1 text-xs text-red-600">{errors.govIdConfirmed}</p>
                    )}
                  </div>
                </div>

                {submitError && (
                  <p role="alert" className="text-xs font-semibold text-red-600">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || isOutOfStock}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#1B4332] hover:bg-[#143325] disabled:bg-[#9AA5B1] disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isOutOfStock
                      ? 'Out of Stock'
                      : submitting
                        ? 'Reserving Unit...'
                        : 'Confirm Rental Request'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
