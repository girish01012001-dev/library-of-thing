import { IndianRupee, Leaf, PackageCheck, Sparkles } from 'lucide-react';

const BENEFITS = [
  {
    title: 'Save 80%+ on Weekend Gear',
    detail:
      'Skip spending ₹50,000+ on a camera or console used twice a year. Pay only for the days you actually use it.',
    icon: IndianRupee,
  },
  {
    title: 'Zero Storage Clutter',
    detail:
      'Keep your hostel room or apartment free of bulky tents, drills, and hard cases when the trip is over.',
    icon: PackageCheck,
  },
  {
    title: 'Try Before You Buy',
    detail:
      'Test a mirrorless camera, projector, or acoustic guitar in real life before committing your savings.',
    icon: Sparkles,
  },
  {
    title: 'Circular Dehradun Living',
    detail:
      'One professionally maintained item shared across 30+ neighbors reduces e-waste and unnecessary manufacturing.',
    icon: Leaf,
  },
];

export function WhyRent() {
  return (
    <section id="why-rent" className="py-16 sm:py-20 bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left editorial comparison summary */}
          <div className="lg:col-span-5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2933] text-balance">
              Why rent instead of buying?
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#52606D] leading-relaxed">
              Most specialty gear sits in a cupboard 95% of the year. Library of Things keeps store-maintained equipment ready on demand.
            </p>

            {/* Concrete cost comparison */}
            <div className="mt-7 rounded-2xl border border-[#E4E7EB] bg-white p-6">
              <p className="text-xs font-semibold text-[#2D6A4F] mb-4">
                Weekend Trip Comparison · 3 Days
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EB]">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2933]">Canon EOS R50 Kit</p>
                    <p className="text-xs text-[#52606D]">Retail purchase vs 3-day rent</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-sm font-bold text-[#1B4332]">₹1,650</p>
                    <p className="text-xs text-[#52606D] line-through">₹68,990</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[#E4E7EB]">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2933]">PlayStation 5 + 2 Pads</p>
                    <p className="text-xs text-[#52606D]">Retail purchase vs 2-day weekend</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-sm font-bold text-[#1B4332]">₹1,300</p>
                    <p className="text-xs text-[#52606D] line-through">₹54,990</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2933]">Bosch Hammer Drill Kit</p>
                    <p className="text-xs text-[#52606D]">Retail purchase vs 1-day DIY</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-sm font-bold text-[#1B4332]">₹250</p>
                    <p className="text-xs text-[#52606D] line-through">₹9,499</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 2x2 value grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-[#E4E7EB] bg-white p-6"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#D8F3DC]/60 text-[#1B4332] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-base font-bold text-[#1F2933]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#52606D] leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
