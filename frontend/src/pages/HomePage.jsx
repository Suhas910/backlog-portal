import { motion } from "framer-motion";
import StickyNav from "../components/layout/StickyNav";
import HeroSection from "../components/sections/HeroSection";
import ProcessSection from "../components/sections/ProcessSection";

function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--surface-1)] text-[var(--text-main)]">
      <a
        href="#main-content"
        className="sr-only left-4 top-4 z-[60] rounded-md bg-[var(--color-cta)] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed"
      >
        Skip to main content
      </a>
      <StickyNav />

      <main id="main-content">
        <HeroSection />
        <ProcessSection />
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="border-t border-[var(--stroke)] bg-[var(--surface-1)] px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-main)]">
          <p>Ramaiah Institute of Technology</p>
        </div>
      </motion.footer>
    </div>
  );
}

export default HomePage;
