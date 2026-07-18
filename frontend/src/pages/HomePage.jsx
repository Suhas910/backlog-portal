import StickyNav from "../components/layout/StickyNav";
import HeroSection from "../components/sections/HeroSection";
import ProcessSection from "../components/sections/ProcessSection";
import { useTheme } from "../context/ThemeContext";

// One fixed, full-viewport backdrop shared by the whole page: the content
// scrolls over it, so the hero, the steps and the footer read as one continuous
// surface instead of each section starting its own background. Dark mode shows
// the brand gradient; light mode shows the pale corner blobs.
function FixedBackdrop() {
  const { isDark } = useTheme();

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background: isDark
          ? "linear-gradient(135deg, #1a2040 0%, #242A52 55%, #2d1a3a 100%)"
          : "var(--surface-1)",
      }}
    >
      {!isDark && (
        <>
          <div
            style={{
              position: "absolute",
              top: "-6rem",
              left: "-5rem",
              width: "18rem",
              height: "18rem",
              borderRadius: "50%",
              background: "#91191C",
              opacity: 0.07,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-4rem",
              left: "50%",
              width: "14rem",
              height: "14rem",
              borderRadius: "50%",
              background: "#ED145B",
              opacity: 0.06,
            }}
          />
        </>
      )}
    </div>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen text-[var(--text-main)]">
      <FixedBackdrop />
      <a
        href="#main-content"
        className="sr-only left-4 top-4 z-[60] rounded-md bg-[var(--color-cta)] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed"
      >
        Skip to main content
      </a>
      <StickyNav />

      <main id="main-content" className="relative z-10">
        <HeroSection />
        <ProcessSection />
      </main>

      <footer className="relative z-10 border-t border-[var(--stroke)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm text-[var(--text-main)]">
          <p>Ramaiah Institute of Technology</p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
