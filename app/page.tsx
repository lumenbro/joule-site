import { Hero } from "@/components/Hero";
import { Explainer } from "@/components/Explainer";
import { GpuChart } from "@/components/GpuChart";
import { JouleChart } from "@/components/JouleChart";
import { WalletDashboard } from "@/components/WalletDashboard";
import { SwapCard } from "@/components/SwapCard";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <Explainer />

      {/* Charts Section */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Live Oracle Data
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GpuChart />
            <JouleChart />
          </div>
        </div>
      </section>

      <WalletDashboard />
      <SwapCard />
      <Footer />
    </main>
  );
}
