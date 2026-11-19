import { useEffect, useState, type FormEvent } from 'react';
import {
  LogOut,
  PackageCheck,
  Save,
  User as UserIcon,
  X,
} from 'lucide-react';
import { DEHRADUN_LOCALITIES, type CustomerProfile, type RentalOrder } from '../types';
import { storeService } from '../services/storeService';
import { OrderHistoryCard } from './OrderHistoryCard';
import { OrderReceiptPanel } from './OrderReceiptPanel';

interface MyOrdersProfileModalProps {
  isOpen: boolean;
  profile: CustomerProfile | null;
  onClose: () => void;
  onSaveProfile: (profile: Omit<CustomerProfile, 'updatedAt'>) => Promise<void>;
  onSignOut: () => Promise<void>;
  onRentAgain: (productId: string) => void;
}

export function MyOrdersProfileModal({
  isOpen,
  profile,
  onClose,
  onSaveProfile,
  onSignOut,
  onRentAgain,
}: MyOrdersProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');
  const [customerOrders, setCustomerOrders] = useState<RentalOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedReceiptOrder, setSelectedReceiptOrder] =
    useState<RentalOrder | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [locality, setLocality] = useState('Rajpur Road');
  const [addressNote, setAddressNote] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('orders');
      setSelectedReceiptOrder(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !profile) return;
    setName(profile.name || '');
    setPhone(profile.phone || '');
    setLocality(profile.locality || 'Rajpur Road');
    setAddressNote(profile.addressNote || '');
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen || !profile) return;
    setLoadingOrders(true);
    const unsub = storeService.subscribeCustomerOrders(
      profile.uid,
      profile.email,
      (orders) => {
        setCustomerOrders(orders);
        setLoadingOrders(false);
      },
    );
    return () => unsub();
  }, [isOpen, profile]);

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

  if (!isOpen || !profile) return null;

  const activeReceipt = selectedReceiptOrder
    ? customerOrders.find((o) => o.id === selectedReceiptOrder.id) ||
      selectedReceiptOrder
    : null;

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await onSaveProfile({
        uid: profile.uid,
        name: name.trim() || profile.name,
        email: profile.email,
        photoURL: profile.photoURL,
        phone: phone.replace(/\D/g, '').slice(-10),
        locality,
        addressNote: addressNote.trim(),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1F2933]/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-orders-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-[#E4E7EB] shadow-xl">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 bg-white border-b border-[#E4E7EB]">
          <div className="flex items-center gap-3 min-w-0">
            {profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border border-[#E4E7EB] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#D8F3DC] text-[#1B4332] flex items-center justify-center font-bold text-sm shrink-0">
                {(profile.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h2
                id="my-orders-title"
                className="text-base sm:text-lg font-bold text-[#1F2933] truncate"
              >
                {profile.name}
              </h2>
              <p className="text-xs text-[#52606D] truncate">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                await onSignOut();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E4E7EB] hover:bg-[#FAF9F6] text-xs font-semibold text-[#52606D] hover:text-[#1F2933] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close my orders and profile"
              className="w-9 h-9 rounded-xl border border-[#E4E7EB] flex items-center justify-center text-[#52606D] hover:text-[#1F2933] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Account sections"
            className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#FAF9F6] border border-[#E4E7EB]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'orders'}
              onClick={() => {
                setSelectedReceiptOrder(null);
                setActiveTab('orders');
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#1B4332] text-white shadow-xs'
                  : 'bg-transparent text-[#52606D] hover:text-[#1F2933]'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>My Orders ({customerOrders.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'profile'}
              onClick={() => {
                setSelectedReceiptOrder(null);
                setActiveTab('profile');
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-[#1B4332] text-white shadow-xs'
                  : 'bg-transparent text-[#52606D] hover:text-[#1F2933]'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Saved Profile</span>
            </button>
          </div>

          {activeTab === 'orders' ? (
            activeReceipt ? (
              <OrderReceiptPanel
                order={activeReceipt}
                onBack={() => setSelectedReceiptOrder(null)}
                onRentAgain={(productId) => onRentAgain(productId)}
              />
            ) : loadingOrders ? (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 rounded-2xl border border-[#E4E7EB] bg-[#FAF9F6] animate-pulse"
                  />
                ))}
              </div>
            ) : customerOrders.length === 0 ? (
              <div className="rounded-2xl border border-[#E4E7EB] bg-[#FAF9F6] p-8 text-center">
                <p className="text-base font-semibold text-[#1F2933]">
                  No rentals linked to this account yet
                </p>
                <p className="mt-1.5 text-sm text-[#52606D] max-w-md mx-auto">
                  Any booking you place while signed in with{' '}
                  <span className="font-medium text-[#1F2933]">{profile.email}</span>{' '}
                  will sync here automatically across all your devices.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143325] text-white text-sm font-semibold cursor-pointer"
                >
                  Browse Rental Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {customerOrders.map((order) => (
                  <OrderHistoryCard
                    key={order.id}
                    order={order}
                    testIdPrefix="my-order"
                    onViewReceipt={setSelectedReceiptOrder}
                    onRentAgain={onRentAgain}
                  />
                ))}
              </div>
            )
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-lg">
              <p className="text-xs text-[#52606D]">
                Saved details automatically pre-fill whenever you rent from any phone or computer.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-medium text-[#52606D] mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-phone"
                    className="block text-xs font-medium text-[#52606D] mb-1"
                  >
                    10-Digit Mobile Number
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] tabular-nums focus:outline-none focus:border-[#1B4332]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-locality"
                  className="block text-xs font-medium text-[#52606D] mb-1"
                >
                  Default Dehradun Locality
                </label>
                <select
                  id="profile-locality"
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

              <div>
                <label
                  htmlFor="profile-address"
                  className="block text-xs font-medium text-[#52606D] mb-1"
                >
                  Saved Delivery Address / Hostel / Landmark
                </label>
                <textarea
                  id="profile-address"
                  rows={2}
                  value={addressNote}
                  onChange={(e) => setAddressNote(e.target.value)}
                  placeholder="House no., street, or hostel landmark in Dehradun"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143325] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'Saving...' : 'Save Cloud Profile'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
