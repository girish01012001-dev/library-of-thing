import { useCallback, useEffect, useState } from 'react';
import { Info, X } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AuthModal } from './components/AuthModal';
import { BookingModal } from './components/BookingModal';
import { CatalogSection } from './components/CatalogSection';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { MyOrdersProfileModal } from './components/MyOrdersProfileModal';
import { Navbar } from './components/Navbar';
import { ToastContainer } from './components/ToastContainer';
import { TrackOrderModal } from './components/TrackOrderModal';
import { WhyRent } from './components/WhyRent';
import { authService } from './services/authService';
import { storeService, type SyncStatus } from './services/storeService';
import type {
  CustomerProfile,
  OrderStatus,
  Product,
  RentalOrder,
  SortOption,
  ToastNotification,
} from './types';
import {
  categorizeCustomerOrders,
  filterCustomerOrders,
} from './utils/rentalMath';

const ADMIN_SESSION_KEY = 'lot_admin_unlocked';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<RentalOrder[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    mode: 'connecting',
    notice: null,
  });
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  // Customer Firebase Auth & Cloud Profile
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);

  // Storefront filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  // Modals & views
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [trackOrderOpen, setTrackOrderOpen] = useState(false);
  const [trackInitialQuery, setTrackInitialQuery] = useState('');
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [viewMode, setViewMode] = useState<'storefront' | 'admin'>('storefront');

  // Toast notifications
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastNotification['type'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [
        ...prev.filter((t) => t.message !== message).slice(-1),
        { id, message, type },
      ]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Subscribe to Store Products, Orders, and Sync Status
  useEffect(() => {
    const unsubProducts = storeService.subscribeProducts((items) => {
      setProducts(items);
      setLoadingCatalog(false);
    });
    const unsubOrders = storeService.subscribeOrders((allOrders) => {
      setOrders(allOrders);
    });
    const unsubStatus = storeService.subscribeSyncStatus((status) => {
      setSyncStatus(status);
      if (status.mode !== 'connecting') {
        setLoadingCatalog(false);
      }
    });

    return () => {
      unsubProducts();
      unsubOrders();
      unsubStatus();
    };
  }, []);

  // Subscribe to Customer Firebase Auth + Firestore users/{uid} Profile
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = authService.subscribeAuthState(async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!user) {
        setCustomerProfile(null);
        return;
      }

      const initialProfile = await authService.ensureProfileForUser(user);
      setCustomerProfile(initialProfile);

      unsubProfile = authService.subscribeProfile(user.uid, (updated) => {
        if (updated) {
          setCustomerProfile(updated);
        }
      });
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Keep selectedProduct live-synced so real-time stock decrements reflect inside open BookingModal
  const selectedProduct = selectedProductId
    ? products.find((p) => p.id === selectedProductId) || null
    : null;

  const handleOpenAdmin = () => {
    if (isAdminAuthenticated) {
      setViewMode('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setAdminLoginOpen(true);
    }
  };

  const handleAdminAuthenticated = () => {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } catch {
      // Ignore storage restrictions
    }
    setIsAdminAuthenticated(true);
    setAdminLoginOpen(false);
    setViewMode('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addToast('Signed in to Store Admin Dashboard.');
  };

  const handleLockAdmin = () => {
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {
      // Ignore storage restrictions
    }
    setIsAdminAuthenticated(false);
    setViewMode('storefront');
    addToast('Admin dashboard locked.', 'info');
  };

  const handleCreateOrder = async (
    orderInput: Omit<RentalOrder, 'id' | 'stockDeducted'>,
    profileUpdates?: Partial<CustomerProfile>,
  ) => {
    const authUser = authService.getCurrentUser();
    const resolvedUid = orderInput.userId || customerProfile?.uid || authUser?.uid;
    const resolvedEmail =
      orderInput.customerEmail?.trim() ||
      customerProfile?.email?.trim() ||
      authUser?.email ||
      '';

    const enrichedInput: Omit<RentalOrder, 'id' | 'stockDeducted'> = {
      ...orderInput,
      ...(resolvedUid ? { userId: resolvedUid } : {}),
      customerEmail: resolvedEmail,
    };

    const created = await storeService.createOrder(enrichedInput);

    if (customerProfile && profileUpdates) {
      const saved = await authService.saveCustomerProfile({
        uid: customerProfile.uid,
        name: profileUpdates.name ?? customerProfile.name,
        email: customerProfile.email,
        photoURL: customerProfile.photoURL,
        phone: profileUpdates.phone ?? customerProfile.phone,
        locality: profileUpdates.locality ?? customerProfile.locality,
        addressNote: profileUpdates.addressNote ?? customerProfile.addressNote,
      });
      setCustomerProfile(saved);
    }

    addToast('Order placed successfully!');
    return created;
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
  ) => {
    await storeService.updateOrderStatus(orderId, status);
    addToast(`Order status updated to ${status}!`);
  };

  const handleSaveProduct = async (
    data: Omit<Product, 'id' | 'createdAt'>,
    existingId?: string,
  ) => {
    await storeService.saveProduct(data, existingId);
    addToast(existingId ? 'Catalog item updated!' : 'Item added to catalog!');
  };

  const handleAdjustStock = async (productId: string, delta: 1 | -1) => {
    await storeService.adjustProductStock(productId, delta);
    addToast('Stock quantity updated!');
  };

  const handleToggleAvailability = async (productId: string) => {
    await storeService.toggleProductAvailability(productId);
    addToast('Item availability updated!');
  };

  const handleDeleteProduct = async (productId: string) => {
    await storeService.deleteProduct(productId);
    addToast('Item removed from catalog.', 'info');
  };

  const handleResetSampleCatalog = async () => {
    await storeService.resetSampleCatalog();
    addToast('Sample Dehradun catalog restored!');
  };

  const handleSaveCustomerProfile = async (
    profile: Omit<CustomerProfile, 'updatedAt'>,
  ) => {
    const updated = await authService.saveCustomerProfile(profile);
    setCustomerProfile(updated);
    addToast('Cloud profile saved!');
  };

  const handleSignOutCustomer = async () => {
    await authService.signOutCustomer();
    setCustomerProfile(null);
    addToast('Signed out cleanly.', 'info');
  };

  const handleRentAgain = (productId: string) => {
    const item = products.find((p) => p.id === productId);
    if (!item) {
      addToast('This item is no longer in the rental catalog.', 'info');
      return;
    }
    setTrackOrderOpen(false);
    setMyOrdersOpen(false);
    setSelectedProductId(item.id);
  };

  const customerOrders = customerProfile
    ? filterCustomerOrders(orders, customerProfile.uid, customerProfile.email)
    : [];
  const activeOrderCount = categorizeCustomerOrders(customerOrders).activeCount;

  const fallbackBanner =
    syncStatus.notice && !noticeDismissed ? (
      <div
        role="status"
        className="bg-[#FAF9F6] border-b border-[#E4E7EB] px-4 py-2 text-xs text-[#52606D]"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
            <span>{syncStatus.notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeDismissed(true)}
            aria-label="Dismiss sync notice"
            className="text-[#52606D] hover:text-[#1F2933] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    ) : null;

  if (viewMode === 'admin' && isAdminAuthenticated) {
    return (
      <>
        {fallbackBanner}
        <AdminDashboard
          products={products}
          orders={orders}
          onExitAdmin={() => setViewMode('storefront')}
          onLockAdmin={handleLockAdmin}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onSaveProduct={handleSaveProduct}
          onAdjustStock={handleAdjustStock}
          onToggleAvailability={handleToggleAvailability}
          onDeleteProduct={handleDeleteProduct}
          onResetSampleCatalog={handleResetSampleCatalog}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1F2933]">
      {fallbackBanner}

      <Navbar
        customerProfile={customerProfile}
        activeOrderCount={activeOrderCount}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenMyOrders={() => setMyOrdersOpen(true)}
        onSignOut={handleSignOutCustomer}
        onOpenTrackOrder={() => {
          setTrackInitialQuery('');
          setTrackOrderOpen(true);
        }}
        onOpenAdmin={handleOpenAdmin}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      <main className="flex-1">
        <Hero />

        <CatalogSection
          products={products}
          loading={loadingCatalog}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onSelectProduct={(prod) => setSelectedProductId(prod.id)}
        />

        <HowItWorks />

        <WhyRent />
      </main>

      <Footer
        onOpenTrackOrder={() => {
          setTrackInitialQuery('');
          setTrackOrderOpen(true);
        }}
        onOpenAdmin={handleOpenAdmin}
      />

      <BookingModal
        product={selectedProduct}
        customerProfile={customerProfile}
        onRequestAuth={() => setAuthModalOpen(true)}
        onClose={() => setSelectedProductId(null)}
        onCreateOrder={handleCreateOrder}
        onTrackCreatedOrder={(bookingCode) => {
          setSelectedProductId(null);
          setTrackInitialQuery(bookingCode);
          setTrackOrderOpen(true);
        }}
      />

      <TrackOrderModal
        isOpen={trackOrderOpen}
        initialQuery={trackInitialQuery}
        orders={orders}
        customerProfile={customerProfile}
        onClose={() => setTrackOrderOpen(false)}
        onOpenEmailAuth={() => {
          setTrackOrderOpen(false);
          setAuthModalOpen(true);
        }}
        onGoogleSignedIn={(msg) => addToast(msg)}
        onRentAgain={handleRentAgain}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(msg) => addToast(msg)}
      />

      <MyOrdersProfileModal
        isOpen={myOrdersOpen}
        profile={customerProfile}
        onClose={() => setMyOrdersOpen(false)}
        onSaveProfile={handleSaveCustomerProfile}
        onSignOut={handleSignOutCustomer}
        onRentAgain={handleRentAgain}
      />

      <AdminLoginModal
        isOpen={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onAuthenticated={handleAdminAuthenticated}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
