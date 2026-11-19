import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Mail,
  PackageCheck,
  Search,
  X,
} from 'lucide-react';
import { authService, mapAuthError, type AuthErrorInfo } from '../services/authService';
import type { CustomerProfile, RentalOrder } from '../types';
import {
  categorizeCustomerOrders,
  filterCustomerOrders,
  findTrackedOrders,
} from '../utils/rentalMath';
import { OrderHistoryCard } from './OrderHistoryCard';
import { OrderReceiptPanel } from './OrderReceiptPanel';

interface TrackOrderModalProps {
  isOpen: boolean;
  initialQuery?: string;
  orders: RentalOrder[];
  customerProfile: CustomerProfile | null;
  onClose: () => void;
  onOpenEmailAuth: () => void;
  onGoogleSignedIn: (message: string) => void;
  onRentAgain: (productId: string) => void;
}

type OrderFilterTab = 'all' | 'active' | 'history';

export function TrackOrderModal({
  isOpen,
  initialQuery = '',
  orders,
  customerProfile,
  onClose,
  onOpenEmailAuth,
  onGoogleSignedIn,
  onRentAgain,
}: TrackOrderModalProps) {
  const [activeTab, setActiveTab] = useState<OrderFilterTab>('all');
  const [showManualLookup, setShowManualLookup] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [selectedReceiptOrder, setSelectedReceiptOrder] =
    useState<RentalOrder | null>(null);

  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<AuthErrorInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSubmittedQuery(initialQuery);
      setShowManualLookup(Boolean(initialQuery));
      setActiveTab('all');
      setSelectedReceiptOrder(null);
      setGoogleError(null);
      setGoogleBusy(false);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedReceiptOrder) {
          setSelectedReceiptOrder(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, selectedReceiptOrder, onClose]);

  if (!isOpen) return null;

  const isSignedIn = Boolean(customerProfile);

  const customerOrders = customerProfile
    ? filterCustomerOrders(orders, customerProfile.uid, customerProfile.email)
    : [];
  const categorized = categorizeCustomerOrders(customerOrders);

  const displayedCustomerOrders =
    activeTab === 'active'
      ? categorized.active
      : activeTab === 'history'
        ? categorized.history
        : categorized.all;

  const manualMatchedOrders = submittedQuery
    ? findTrackedOrders(orders, submittedQuery)
    : [];

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const handleGoogleSignIn = async () => {
    setGoogleError(null);
    setGoogleBusy(true);
    try {
      await authService.signInWithGoogle();
      onGoogleSignedIn('Signed in with Google! Your orders are now synced.');
    } catch (err) {
      setGoogleError(mapAuthError(err));
    } finally {
      setGoogleBusy(false);
    }
  };

  const activeReceipt = selectedReceiptOrder
    ? orders.find((o) => o.id === selectedReceiptOrder.id) || selectedReceiptOrder
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1F2933]/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-orders-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-[#E4E7EB] shadow-xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-6 py-4 bg-white border-b border-[#E4E7EB]">
          <div className="min-w-0">
            <h2
              id="my-orders-modal-title"
              className="text-lg sm:text-xl font-bold text-[#1F2933]"
            >
              {activeReceipt
                ? `Receipt · ${activeReceipt.bookingCode}`
                : isSignedIn
                  ? 'My Orders'
                  : 'My Orders & Order Lookup'}
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-[#52606D] leading-snug">
              {activeReceipt
                ? 'Full itemized rental breakdown & handover instructions'
                : isSignedIn && customerProfile
                  ? `Signed in as ${customerProfile.name} (${customerProfile.email})`
                  : 'Sign in with Google or look up a guest booking by Booking Code / Mobile Number'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close my orders modal"
            className="w-9 h-9 rounded-xl border border-[#E4E7EB] flex items-center justify-center text-[#52606D] hover:text-[#1F2933] shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {activeReceipt ? (
            <OrderReceiptPanel
              order={activeReceipt}
              onBack={() => setSelectedReceiptOrder(null)}
              onRentAgain={(productId) => onRentAgain(productId)}
            />
          ) : isSignedIn ? (
            /* SIGNED-IN CUSTOMER AUTOMATIC ORDER HISTORY */
            <div className="space-y-5">
              {/* Filter Tabs + Manual Lookup Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div
                  role="tablist"
                  aria-label="Filter your orders"
                  className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#FAF9F6] border border-[#E4E7EB]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'all'}
                    onClick={() => setActiveTab('all')}
                    className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold tabular-nums cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-[#1B4332] text-white shadow-xs'
                        : 'bg-transparent text-[#52606D] hover:text-[#1F2933]'
                    }`}
                  >
                    All Orders ({categorized.all.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'active'}
                    onClick={() => setActiveTab('active')}
                    className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold tabular-nums cursor-pointer ${
                      activeTab === 'active'
                        ? 'bg-[#1B4332] text-white shadow-xs'
                        : 'bg-transparent text-[#52606D] hover:text-[#1F2933]'
                    }`}
                  >
                    Active &amp; Upcoming ({categorized.active.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                    className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold tabular-nums cursor-pointer ${
                      activeTab === 'history'
                        ? 'bg-[#1B4332] text-white shadow-xs'
                        : 'bg-transparent text-[#52606D] hover:text-[#1F2933]'
                    }`}
                  >
                    Rental History ({categorized.history.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowManualLookup((v) => !v)}
                  aria-expanded={showManualLookup}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E4E7EB] hover:border-[#1B4332] bg-white text-xs font-semibold text-[#1B4332] cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>
                    {showManualLookup
                      ? 'Hide ID / Phone Search'
                      : 'Search another order by ID / Phone'}
                  </span>
                </button>
              </div>

              {/* Optional Manual Lookup Drawer for Guest Orders Placed Before Sign-In */}
              {showManualLookup && (
                <div className="rounded-2xl border border-[#E4E7EB] bg-[#FAF9F6] p-4 space-y-4">
                  <form
                    onSubmit={handleManualSubmit}
                    className="flex flex-col sm:flex-row gap-2.5"
                  >
                    <div className="relative flex-1">
                      <label htmlFor="signedin-lookup-input" className="sr-only">
                        Booking Code or Mobile Number
                      </label>
                      <Search className="w-4 h-4 text-[#52606D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="signedin-lookup-input"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="LOT-2849 or 10-digit mobile number"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E4E7EB] bg-white text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Look Up Order
                    </button>
                  </form>

                  {submittedQuery && (
                    manualMatchedOrders.length === 0 ? (
                      <p className="text-xs text-[#52606D] text-center py-2">
                        No booking found for &ldquo;{submittedQuery}&rdquo;. Check your LOT-XXXX code or 10-digit mobile number.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-[#2D6A4F]">
                          Search Results ({manualMatchedOrders.length})
                        </p>
                        {manualMatchedOrders.map((order) => (
                          <OrderHistoryCard
                            key={`lookup-${order.id}`}
                            order={order}
                            testIdPrefix="lookup-order"
                            onViewReceipt={setSelectedReceiptOrder}
                            onRentAgain={onRentAgain}
                          />
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Automatic Synced Order List */}
              {displayedCustomerOrders.length === 0 ? (
                <div className="rounded-2xl border border-[#E4E7EB] bg-[#FAF9F6] p-8 text-center">
                  <PackageCheck className="w-8 h-8 text-[#2D6A4F] mx-auto mb-2.5" />
                  <p className="text-base font-semibold text-[#1F2933]">
                    {categorized.all.length === 0
                      ? 'No rental orders found for this account yet'
                      : activeTab === 'active'
                        ? 'No active or upcoming rentals right now'
                        : 'No completed or cancelled rentals yet'}
                  </p>
                  <p className="mt-1.5 text-xs sm:text-sm text-[#52606D] max-w-md mx-auto">
                    {categorized.all.length === 0
                      ? `Orders placed while signed in as ${customerProfile?.email} appear here automatically across devices. Need to find a guest booking? Use "Search another order by ID / Phone" above.`
                      : 'Switch tabs above to view all your other bookings.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedCustomerOrders.map((order) => (
                    <OrderHistoryCard
                      key={order.id}
                      order={order}
                      onViewReceipt={setSelectedReceiptOrder}
                      onRentAgain={onRentAgain}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* GUEST / SIGNED-OUT VIEW: GOOGLE SIGN-IN CTA + MANUAL LOOKUP BACKUP */
            <div className="space-y-6">
              {/* Prominent Google Sign-In Card */}
              <div className="rounded-2xl border border-[#D8F3DC] bg-[#FAF9F6] p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-[#1F2933]">
                      Sign in with Google to automatically view all your active rentals and past order history
                    </h3>
                    <p className="text-xs sm:text-sm text-[#52606D]">
                      See live pickup/delivery updates, copy booking codes, download receipts, and rent again in one click.
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleBusy}
                      className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white border border-[#E4E7EB] hover:border-[#1B4332] hover:bg-[#FAF9F6] disabled:opacity-60 text-sm font-semibold text-[#1F2933] shadow-xs whitespace-nowrap cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                        />
                      </svg>
                      <span>{googleBusy ? 'Connecting...' : 'Continue with Google'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onOpenEmailAuth}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Or sign in with Email &amp; Password</span>
                    </button>
                  </div>
                </div>

                {googleError && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-[#1F2933] space-y-1.5"
                  >
                    <div className="flex items-start gap-2 font-semibold text-amber-900">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{googleError.message}</span>
                    </div>
                    {googleError.isDomainError && googleError.hostname && (
                      <p className="text-[#52606D] pl-6 leading-relaxed">
                        Add{' '}
                        <code className="px-1.5 py-0.5 bg-white border border-amber-200 rounded font-mono text-[11px]">
                          {googleError.hostname}
                        </code>{' '}
                        under{' '}
                        <span className="font-semibold">
                          Firebase Console → Authentication → Settings → Authorized domains
                        </span>
                        , or sign in instantly via Email &amp; Password.{' '}
                        <a
                          href="https://console.firebase.google.com/project/library-of-things-339a9/authentication/settings"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#1B4332] underline"
                        >
                          Open Firebase Settings
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Clean Divider */}
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-[#E4E7EB]" />
                <span className="px-3 text-xs font-semibold text-[#52606D] bg-white">
                  Or look up a guest order
                </span>
                <div className="flex-1 border-t border-[#E4E7EB]" />
              </div>

              {/* Manual Lookup Form */}
              <form
                onSubmit={handleManualSubmit}
                className="flex flex-col sm:flex-row gap-2.5"
              >
                <div className="relative flex-1">
                  <label htmlFor="track-order-input" className="sr-only">
                    Booking Code or Mobile Number
                  </label>
                  <Search className="w-4 h-4 text-[#52606D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="track-order-input"
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="LOT-2849 or 9876543210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
                >
                  Look Up Order
                </button>
              </form>

              <div>
                {!submittedQuery ? (
                  <div className="rounded-xl bg-[#FAF9F6] border border-[#E4E7EB] p-5 text-center text-xs text-[#52606D]">
                    Enter a Booking Code (e.g. LOT-2849) or your 10-digit mobile number to check live order progress and receipts.
                  </div>
                ) : manualMatchedOrders.length === 0 ? (
                  <div className="rounded-xl bg-[#FAF9F6] border border-[#E4E7EB] p-6 text-center">
                    <p className="text-sm font-semibold text-[#1F2933]">
                      No booking found for &ldquo;{submittedQuery}&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-[#52606D]">
                      Double-check your LOT-XXXX code or the 10-digit mobile number used at checkout.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {manualMatchedOrders.map((order) => (
                      <OrderHistoryCard
                        key={order.id}
                        order={order}
                        onViewReceipt={setSelectedReceiptOrder}
                        onRentAgain={onRentAgain}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
