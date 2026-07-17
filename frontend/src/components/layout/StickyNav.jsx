import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import BrandIdentity from "./BrandIdentity";
import { useTheme } from "../../context/ThemeContext";

export default function StickyNav() {
  const [scrolled, setScrolled] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-white/10 bg-[var(--color-secondary)]/95 backdrop-blur transition-all duration-300 ${
        scrolled ? "py-2" : "py-3"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Go to homepage">
          {/* The wordmark collides with the theme toggle on phones,
              so it is hidden below sm (the logo image already carries the branding). */}
          <BrandIdentity compact={scrolled} wordmarkClassName="hidden sm:block" />
        </Link>

        <button
          type="button"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
