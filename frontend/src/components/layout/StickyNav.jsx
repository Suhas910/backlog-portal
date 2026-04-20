import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import BrandIdentity from "./BrandIdentity";
import MagneticCta from "../ui/MagneticCta";
import { useTheme } from "../../context/ThemeContext";

const SECTION_LINKS = [
  { id: "quick-facts", label: "Quick Facts" },
  { id: "admissions", label: "Admissions" },
];

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

  function scrollToId(id) {
    const section = document.getElementById(id);
    if (!section) return;

    const navHeight = scrolled ? 70 : 92;
    const y = section.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b border-white/10 bg-[var(--color-secondary)]/95 backdrop-blur transition-all duration-300 ${
        scrolled ? "py-2" : "py-3"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Go to homepage">
          <BrandIdentity compact={scrolled} />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Section links">
          {SECTION_LINKS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToId(item.id)}
              className="rounded-lg border border-white/40 px-3 py-1.5 text-sm font-medium text-white transition-all hover:border-white/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {item.label}
            </button>
          ))}
          <Link
            to="/admin/login"
            className="rounded-lg border border-white/40 px-3 py-1.5 text-sm font-medium text-white transition-all hover:border-white/70 hover:bg-white/10"
          >
            Admin
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <MagneticCta onClick={() => scrollToId("admissions")} className="px-4 py-2">
            Brochure
          </MagneticCta>
        </div>
      </div>
    </header>
  );
}
