import { useEffect, useRef, useState } from 'react';
import {
  Boxes,
  ChevronDown,
  LogOut,
  Menu,
  PackageCheck,
  ShieldCheck,
  User as UserIcon,
  X,
} from 'lucide-react';
import type { CustomerProfile } from '../types';

interface NavbarProps {
  customerProfile: CustomerProfile | null;
  activeOrderCount?: number;
  onOpenAuth: () => void;
  onOpenMyOrders: () => void;
  onSignOut: () => void;
  onOpenTrackOrder: () => void;
  onOpenAdmin: () => void;
  isAdminAuthenticated: boolean;
}

export function Navbar({
  customerProfile,
  activeOrderCount = 0,
  onOpenAuth,
  onOpenMyOrders,
  onSignOut,
  onOpenTrackOrder,
  onOpenAdmin,
  isAdminAuthenticated,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const firstName = customerProfile
    ? (customerProfile.name || customerProfile.email || 'Account').split(' ')[0]
    : '';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E4E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 text-[#1F2933] whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] rounded-lg"
        >
          <span className="w-8 h-8 rounded-lg bg-[#1B4332] text-white flex items-center justify-center shrink-0">
            <Boxes className="w-4 h-4" strokeWidth={2} />
          </span>
          <span className="text-base sm:text-lg font-bold tracking-tight whitespace-nowrap shrink-0">
            Library of Things
          </span>
        </a>

        {/* Zone 2: 4 concise single-line text links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-[#52606D]"
        >
          <a
            href="#catalog"
            className="hover:text-[#1B4332] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Catalog
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#1B4332] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            How It Works
          </a>
          <a
            href="#why-rent"
            className="hover:text-[#1B4332] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Why Rent
          </a>
          <button
            type="button"
            onClick={onOpenTrackOrder}
            className="inline-flex items-center gap-1.5 hover:text-[#1B4332] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer"
          >
            <span>My Orders</span>
            {customerProfile && activeOrderCount > 0 && (
              <span
                data-testid="navbar-active-orders-badge"
                className="px-1.5 py-0.5 rounded-md bg-[#D8F3DC] text-[#1B4332] text-[11px] font-bold leading-none tabular-nums"
              >
                {activeOrderCount}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Customer Account + Store Admin */}
        <div className="flex items-center gap-2 shrink-0">
          {customerProfile ? (
            <div className="relative" ref={accountDropdownRef}>
              <button
                type="button"
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-[#E4E7EB] hover:border-[#1B4332] text-xs sm:text-sm font-semibold text-[#1F2933] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {customerProfile.photoURL ? (
                  <img
                    src={customerProfile.photoURL}
                    alt={customerProfile.name}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-[#D8F3DC] text-[#1B4332] flex items-center justify-center text-xs font-bold shrink-0">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[90px] truncate">{firstName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#52606D] shrink-0" />
              </button>

              {accountMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 rounded-xl bg-white border border-[#E4E7EB] shadow-lg py-1.5 z-50"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onOpenMyOrders();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-medium text-[#1F2933] hover:bg-[#FAF9F6] flex items-center gap-2.5 cursor-pointer"
                  >
                    <PackageCheck className="w-4 h-4 text-[#1B4332]" />
                    <span>My Orders &amp; Profile</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs sm:text-sm font-medium text-[#52606D] hover:text-red-700 hover:bg-[#FAF9F6] flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#1F2933] bg-white border border-[#E4E7EB] hover:border-[#1B4332] hover:text-[#1B4332] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              <span>Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#1B4332] bg-white border border-[#E4E7EB] hover:border-[#1B4332] hover:bg-[#D8F3DC]/35 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332]"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{isAdminAuthenticated ? 'Admin Console' : 'Store Admin'}</span>
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E4E7EB] bg-white text-[#1F2933] hover:bg-[#F3F2EE] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Compact mobile drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-[#E4E7EB] bg-white px-4 py-3 flex flex-col gap-1"
        >
          <a
            href="#catalog"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2.5 text-sm font-medium text-[#1F2933] rounded-lg hover:bg-[#FAF9F6]"
          >
            Catalog
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2.5 text-sm font-medium text-[#1F2933] rounded-lg hover:bg-[#FAF9F6]"
          >
            How It Works
          </a>
          <a
            href="#why-rent"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2.5 text-sm font-medium text-[#1F2933] rounded-lg hover:bg-[#FAF9F6]"
          >
            Why Rent
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTrackOrder();
            }}
            className="flex items-center justify-between text-left px-3 py-2.5 text-sm font-medium text-[#1B4332] rounded-lg hover:bg-[#FAF9F6] cursor-pointer"
          >
            <span>My Orders</span>
            {customerProfile && activeOrderCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#D8F3DC] text-[#1B4332] text-xs font-bold leading-none tabular-nums">
                {activeOrderCount}
              </span>
            )}
          </button>
          {!customerProfile && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="text-left px-3 py-2.5 text-sm font-semibold text-[#1B4332] rounded-lg hover:bg-[#FAF9F6] cursor-pointer"
            >
              Sign In with Google / Email
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
