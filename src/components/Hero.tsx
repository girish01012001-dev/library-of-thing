import { ArrowRight, CheckCircle2, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { HERO_SHOWCASE_IMAGE } from '../data/seedCatalog';

export function Hero() {
  return (
    <section id="top" className="pt-8 pb-12 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20 border-b border-[#E4E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left editorial column */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-[#2D6A4F] mb-4">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>Dehradun, Uttarakhand</span>
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-[#9AA5B1]">·</span>
              <span className="text-[#52606D]">Don&apos;t buy it. Rent it when you need it.</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1F2933] leading-[1.12] text-balance">
              Why buy when you can borrow?
            </h1>

            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-[#52606D] leading-relaxed max-w-xl">
              Rent premium cameras, gaming consoles, camping gear, tools, and electronics in Dehradun — without the heavy price tag.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <a
                href="#catalog"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#143325] rounded-xl shadow-sm transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] focus-visible:ring-offset-2"
              >
                <span>Explore Catalog</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </a>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-[#1F2933] bg-white border border-[#E4E7EB] hover:border-[#1B4332] hover:text-[#1B4332] rounded-xl transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332]"
              >
                How It Works
              </a>
            </div>
          </div>

          {/* Right showcase photography */}
          <div className="lg:col-span-6">
            <div className="h-full min-h-[240px] sm:min-h-[320px] rounded-2xl overflow-hidden border border-[#E4E7EB] bg-[#F2F1EC] shadow-sm">
              <img
                src={HERO_SHOWCASE_IMAGE}
                alt="Curated cameras, gaming controllers, camping gear, and instruments ready to rent in Dehradun"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Full-width 3-item trust bar below the hero split */}
        <div className="mt-10 pt-8 border-t border-[#E4E7EB] grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D8F3DC]/60 text-[#1B4332] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1F2933]">Quality Checked &amp; Sanitized</p>
              <p className="text-xs text-[#52606D] mt-0.5">Store-owned gear inspected before every handover</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D8F3DC]/60 text-[#1B4332] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1F2933]">100% Refundable Deposit</p>
              <p className="text-xs text-[#52606D] mt-0.5">Returned in full via UPI or cash right on return</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D8F3DC]/60 text-[#1B4332] flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1F2933]">Same-Day Pickup or Dehradun Delivery</p>
              <p className="text-xs text-[#52606D] mt-0.5">Rajpur Road store pickup or ₹99 doorstep drop</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
