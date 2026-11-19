import { CalendarCheck, RotateCcw, Truck } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Pick Your Item & Dates',
    description:
      'Browse our Dehradun store catalog, pick your start and return dates, and see exact daily rent plus refundable deposit upfront.',
    icon: CalendarCheck,
  },
  {
    number: '02',
    title: 'Store Pickup or Dehradun Delivery',
    description:
      'Collect directly from our Rajpur Road hub at ₹0 or choose ₹99 doorstep delivery across Prem Nagar, Jakhan, Clement Town, Bidholi, and nearby areas.',
    icon: Truck,
  },
  {
    number: '03',
    title: 'Enjoy & Return — Full Deposit Back',
    description:
      'Use the gear worry-free for your trip, event, or weekend. Return it on time and receive 100% of your security deposit back immediately.',
    icon: RotateCcw,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-white border-t border-b border-[#E4E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2933] text-balance">
            How renting works in 3 simple steps
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-[#52606D]">
            Transparent INR pricing, quick ID verification at handover, and zero hidden fees.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="rounded-2xl border border-[#E4E7EB] bg-[#FAF9F6] p-6 sm:p-7 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-sm font-semibold text-[#2D6A4F] tabular-nums">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#E4E7EB] text-[#1B4332] flex items-center justify-center">
                      <Icon className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-[#1F2933]">{step.title}</h3>
                  <p className="mt-2 text-sm text-[#52606D] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
