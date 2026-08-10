import StickyNav from "../components/layout/StickyNav";
import HeroSection from "../components/sections/HeroSection";
import ProcessSection from "../components/sections/ProcessSection";
// One fixed, full-viewport backdrop for the whole page: content scrolls over it, so hero, steps
// and footer read as one continuous surface rather than each section starting its own background.
// --page-backdrop is a flat surface in light, the brand gradient in dark; the corner blobs go
// transparent in dark, so this stays theme-agnostic (no isDark branch).
function FixedBackdrop() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        background: "var(--page-backdrop)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-6rem",
          left: "-5rem",
          width: "18rem",
          height: "18rem",
          borderRadius: "50%",
          background: "var(--hero-blob-1)",
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
          background: "var(--hero-blob-2)",
          opacity: 0.06,
        }}
      />
    </div>
  );
}

function HomePage() {
  return (
    <div className="min-h-screen text-ink">
      <FixedBackdrop />
      <a
        href="#main-content"
        className="sr-only left-4 top-4 z-[60] rounded-md bg-cta px-4 py-2 text-sm font-semibold text-cta-text focus:not-sr-only focus:fixed"
      >
        Skip to main content
      </a>
      <StickyNav />

      <main id="main-content" className="relative z-10">
        <HeroSection />
        <ProcessSection />
      </main>

      <footer className="relative z-10 border-t border-stroke px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-sm text-ink">
          <p className="font-bold">Ramaiah Institute of Technology</p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
