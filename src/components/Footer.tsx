import { Boxes, Mail, MapPin, Phone } from 'lucide-react';

interface FooterProps {
  onOpenTrackOrder: () => void;
  onOpenAdmin: () => void;
}

export function Footer({ onOpenTrackOrder, onOpenAdmin }: FooterProps) {
  return (
    <footer className="bg-white border-t border-[#E4E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#E4E7EB]">
          <div className="md:col-span-5">
            <div className="inline-flex items-center gap-2.5 text-[#1F2933]">
              <span className="w-8 h-8 rounded-lg bg-[#1B4332] text-white flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </span>
              <span className="text-lg font-bold tracking-tight">Library of Things</span>
            </div>
            <p className="mt-3 text-sm text-[#52606D] max-w-sm leading-relaxed">
              Don&apos;t buy it. Rent it when you need it. Store-owned, quality-checked rentals serving Dehradun neighborhoods every day.
            </p>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold text-[#1F2933] mb-3">Quick Links</h3>
            <ul className="space-y-2.5 text-sm text-[#52606D]">
              <li>
                <a href="#catalog" className="hover:text-[#1B4332] transition-colors">
                  Browse Catalog
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#1B4332] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#why-rent" className="hover:text-[#1B4332] transition-colors">
                  Why Rent vs Buy
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenTrackOrder}
                  className="hover:text-[#1B4332] transition-colors cursor-pointer"
                >
                  My Orders
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-sm font-semibold text-[#1F2933] mb-3">Dehradun Store Hub</h3>
            <ul className="space-y-2.5 text-sm text-[#52606D]">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" />
                <span>Near Pacific Mall, Rajpur Road, Dehradun, Uttarakhand 248001</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                <span className="tabular-nums">+91 98765 43210 (10 AM – 8 PM IST)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                <span>hello@libraryofthings.in</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#52606D]">
          <p>© {new Date().getFullYear()} Library of Things · Dehradun, Uttarakhand</p>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="font-medium text-[#52606D] hover:text-[#1B4332] underline underline-offset-4 cursor-pointer"
          >
            Admin Portal
          </button>
        </div>
      </div>
    </footer>
  );
}
