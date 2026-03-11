import type { Metadata } from "next";
import { WalletProvider } from "@/components/WalletProvider";
import { ConnectWallet } from "@/components/ConnectWallet";
import "./globals.css";

export const metadata: Metadata = {
  title: "LumenJoule — Prepaid AI Compute Credits on Stellar",
  description:
    "LumenJoule is a prepaid AI compute credit on the Stellar network. 1 LumenJoule = 1,000 Joules of estimated AI inference energy, priced by real GPU market data.",
  icons: {
    icon: "/joule-icon.jpg",
    apple: "/joule-icon.jpg",
  },
  openGraph: {
    title: "LumenJoule — Prepaid AI Compute Credits on Stellar",
    description:
      "Energy-denominated AI compute credits. Swap USDC for LumenJoule on Soroswap.",
    type: "website",
    url: "https://joule.lumenbro.com",
    images: [
      {
        url: "https://joule.lumenbro.com/joule-icon.jpg",
        width: 512,
        height: 512,
        alt: "LumenJoule",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "LumenJoule — Prepaid AI Compute Credits on Stellar",
    description:
      "Energy-denominated AI compute credits. 1 LumenJoule = 1,000 Joules of AI inference energy.",
    images: ["https://joule.lumenbro.com/joule-icon.jpg"],
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
                  alt="LumenJoule"
                  className="w-8 h-8 rounded-lg"
                />
                <span className="font-semibold text-lg">LumenJoule</span>
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
