"use client";

import { JOULE_TOKEN, USDC_SAC, SUSHI_ROUTER, STELLAR_EXPERT_BASE } from "@/lib/constants";

const contracts = [
  { label: "JOULE Token", address: JOULE_TOKEN },
  { label: "USDC (SAC)", address: USDC_SAC },
  { label: "SushiSwap V3 Router", address: SUSHI_ROUTER },
];

const links = [
  { label: "StellarExpert", href: `${STELLAR_EXPERT_BASE}/${JOULE_TOKEN}` },
  { label: "GitHub", href: "https://github.com/brandonsurh/joule-contracts" },
  { label: "x402 Protocol", href: "https://x402.org" },
  { label: "lumenbro.com", href: "https://lumenbro.com" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contract addresses */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Contract Addresses
            </h3>
            <div className="space-y-3">
              {contracts.map((c) => (
                <div key={c.address}>
                  <div className="text-xs text-gray-500 mb-0.5">{c.label}</div>
                  <a
                    href={`${STELLAR_EXPERT_BASE}/${c.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-joule-400 hover:text-joule-300 transition break-all"
                  >
                    {c.address}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Links
            </h3>
            <div className="space-y-2">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-gray-400 hover:text-white transition"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/5 text-center text-xs text-gray-600">
          JOULE is a prepaid compute credit, not a currency, investment, or security.
        </div>
      </div>
    </footer>
  );
}
