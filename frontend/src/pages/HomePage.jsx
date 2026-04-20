import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import StickyNav from "../components/layout/StickyNav";
import HeroSection from "../components/sections/HeroSection";
import QuickFactsSection from "../components/sections/QuickFactsSection";
import AdmissionsSection from "../components/sections/AdmissionsSection";
import MobileActionBar from "../components/layout/MobileActionBar";

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

      <main id="main-content" className="pb-20 md:pb-0">
        <HeroSection />
        <QuickFactsSection />
        <AdmissionsSection />
      </main>

      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="border-t border-[var(--stroke)] bg-[var(--surface-1)] px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-main)]">
          <p>Ramaiah Institute of Technology</p>
          <div className="flex items-center gap-4">
            <Link to="/register" className="text-[var(--color-secondary)] hover:text-[var(--color-primary)]">
              Student Registration
            </Link>
            <Link to="/admin/login" className="text-[var(--color-secondary)] hover:text-[var(--color-primary)]">
              Admin Login
            </Link>
          </div>
        </div>
      </motion.footer>

      <MobileActionBar />
    </div>
  );
}

export default HomePage;
