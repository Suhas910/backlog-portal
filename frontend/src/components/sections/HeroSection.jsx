import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "../../assets/hero.png";
import { useTheme } from "../../context/ThemeContext";
import MagneticCta from "../ui/MagneticCta";

const heroItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function HeroSection() {
  const { isDark } = useTheme();

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pt-16">
      <div className="absolute inset-0 -z-10 bg-halo" />
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, staggerChildren: 0.15 }}
          className="space-y-6"
        >
          <motion.span
            variants={heroItem}
            className="inline-flex rounded-full border border-[var(--color-primary)]/30 bg-[var(--surface-muted)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]"
          >
            2026 Backlog Cycle Open
          </motion.span>

          <motion.h1
            variants={heroItem}
            className="font-serif text-4xl leading-tight text-[var(--color-primary)] sm:text-5xl lg:text-6xl"
          >
            Register for your backlog exam
          </motion.h1>

          <motion.p variants={heroItem} className="max-w-xl text-base leading-relaxed text-[var(--text-main)] sm:text-lg">
            Follow the simple steps below to submit your backlog registration.
            Download your form, get it signed, and submit for verification.
          </motion.p>

          <motion.div variants={heroItem} className="flex flex-wrap items-center gap-3">
            <MagneticCta as={Link} to="/register" className="gap-2">
              Start Registration <ArrowRight size={16} />
            </MagneticCta>
            <Link
              to="/admin/login"
              className={`inline-flex items-center gap-2 rounded-full border-2 px-5 py-3 text-sm font-semibold shadow-none transition-all ${
                isDark
                  ? "border-white bg-[rgba(36,42,82,0.16)] text-white hover:border-white hover:bg-[rgba(36,42,82,0.22)] hover:text-white"
                  : "border-[var(--color-secondary)] bg-transparent text-[var(--color-secondary)] hover:border-[var(--color-secondary)] hover:bg-[rgba(36,42,82,0.08)] hover:text-[var(--color-secondary)]"
              }`}
            >
              <ShieldCheck size={16} /> Admin Access
            </Link>
          </motion.div>


        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.75 }}
          className="relative"
        >
          <img
            src={heroImage}
            alt="Ramaiah campus"
            className="h-[400px] w-full rounded-[2rem] object-cover object-center shadow-soft sm:h-[480px]"
          />

          <div className="absolute inset-x-5 bottom-5 rounded-3xl border border-white/40 bg-white/30 p-5 backdrop-blur-xl dark:border-white/20 dark:bg-black/25">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[var(--color-primary)] p-2 text-white">
                <GraduationCap size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-secondary)] dark:text-white">
                  Student-First Process
                </p>
                <p className="text-xs text-[var(--text-main)] dark:text-white">
                  Guided submission flow with instant PDF generation.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
