"use client";

const steps = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 004.5 8.25v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: "GPU Market",
    desc: "Real-time H100 pricing data aggregated from compute marketplaces (Vast.ai)",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Oracle",
    desc: "On-chain oracle converts GPU energy cost to a JOULE price every 5 minutes",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: "JOULE Price",
    desc: "1 JOULE = 1,000 Joules of AI inference energy, tradeable on SushiSwap V3",
  },
];

export function Explainer() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">
          What is JOULE?
        </h2>
        <p className="text-center text-gray-400 mb-16 max-w-2xl mx-auto">
          JOULE is a prepaid AI compute credit on Stellar. Each JOULE represents
          1,000 Joules of estimated AI inference energy, priced by real GPU
          market data.
        </p>

        {/* 3-step flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-joule-600/50 to-transparent -translate-x-4" />
              )}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6 h-full">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-joule-600/20 text-joule-400 mb-4">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue model note */}
        <div className="mt-12 rounded-xl bg-joule-950/50 border border-joule-800/30 p-6 text-center">
          <p className="text-sm text-gray-400">
            <span className="text-joule-400 font-medium">Revenue model:</span>{" "}
            20% margin on AI inference via DeepInfra. No transfer fees, no token
            tax. Revenue comes from the compute service, not token mechanics.
          </p>
        </div>
      </div>
    </section>
  );
}
