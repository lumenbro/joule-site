import type { Metadata } from "next";
import { WalletProvider } from "@/components/WalletProvider";
import { ConnectWallet } from "@/components/ConnectWallet";
import "./globals.css";

export const metadata: Metadata = {
  title: "JOULE — Prepaid AI Compute Credits on Stellar",
  description:
    "JOULE is a prepaid AI compute credit on the Stellar network. 1 JOULE = 1,000 Joules of estimated AI inference energy, priced by real GPU market data.",
  icons: {
    icon: "/joule-icon.jpg",
    apple: "/joule-icon.jpg",
  },
  openGraph: {
    title: "JOULE — Prepaid AI Compute Credits on Stellar",
    description:
      "Energy-denominated AI compute credits. Swap USDC for JOULE on SushiSwap V3.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0a] text-white antialiased">
        <WalletProvider>
          {/* Nav */}
          <nav className="sticky top-0 z-50 backdrop-blur-lg bg-[#0a0a0a]/80 border-b border-white/5">
            <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-3">
              <a href="/" className="flex items-center gap-2">
                <img
                  src="/joule-icon.jpg"
                  alt="JOULE"
                  className="w-8 h-8 rounded-lg"
                />
                <span className="font-semibold text-lg">JOULE</span>
              </a>
              <ConnectWallet />
            </div>
          </nav>

          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
