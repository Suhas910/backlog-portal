import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "../../assets/front-page.jpeg";
import { useTheme } from "../../context/ThemeContext";
import MagneticCta from "../ui/MagneticCta";

const heroItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function HeroSection() {
  const { isDark } = useTheme();

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "3rem 1rem 5rem",
        background: isDark
          ? "linear-gradient(135deg, #1a2040 0%, #242A52 55%, #2d1a3a 100%)"
          : "var(--surface-1)",
      }}
    >
      {/* Light mode only — top-left maroon blob + bottom cta blob */}
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
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              width: "14rem",
              height: "14rem",
              borderRadius: "50%",
              background: "#ED145B",
              opacity: 0.06,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          margin: "0 auto",
          maxWidth: "80rem",
          display: "grid",
          gap: "2rem",
          alignItems: "center",
        }}
        className="lg:grid-cols-2"
      >
        {/* Left — text */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, staggerChildren: 0.15 }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            textAlign: "center",
          }}
        >
          <motion.span
            variants={heroItem}
            style={{
              display: "inline-flex",
              alignSelf: "center",
              borderRadius: "9999px",
              padding: "6px 16px",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: isDark
                ? "rgba(237,20,91,0.15)"
                : "rgba(145,25,28,0.08)",
              border: isDark
                ? "1px solid rgba(237,20,91,0.4)"
                : "1px solid rgba(145,25,28,0.3)",
              color: isDark ? "#f472a0" : "#91191C",
            }}
          >
            2026 Backlog Cycle Open
          </motion.span>

          <motion.h1
            variants={heroItem}
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: "clamp(2.5rem, 5vw, 3.75rem)",
              lineHeight: 1.15,
              margin: 0,
              color: isDark ? "#ffffff" : "#91191C",
            }}
          >
            Register for your backlog exam
          </motion.h1>

          <motion.p
            variants={heroItem}
            style={{
              maxWidth: "36rem",
              fontSize: "1.05rem",
              lineHeight: 1.65,
              margin: "0 auto",
              color: isDark ? "#ffffff" : "#91191C",
            }}
          >
            Follow the simple steps below to submit your backlog registration.
            Download your form, get it signed, and submit for verification.
          </motion.p>

          <motion.div
            variants={heroItem}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MagneticCta as={Link} to="/register" className="gap-2">
              Start Registration <ArrowRight size={16} />
            </MagneticCta>
            <Link
              to="/admin/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderRadius: "9999px",
                border: isDark
                  ? "2px solid rgba(255,255,255,0.55)"
                  : "2px solid #242A52",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 600,
                color: isDark ? "#ffffff" : "#242A52",
                background: isDark ? "rgba(255,255,255,0.06)" : "transparent",
                transition: "all 0.2s",
                textDecoration: "none",
              }}
            >
              <ShieldCheck size={16} /> Admin Access
            </Link>
          </motion.div>
        </motion.div>

        {/* Right — image */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.75 }}
        >
          <div
            style={{
              borderRadius: "2rem",
              padding: isDark ? "3px" : "0",
              background: isDark
                ? "linear-gradient(135deg, rgba(15,27,58,0.95), rgba(28,41,76,0.92), rgba(45,25,70,0.84))"
                : "transparent",
              boxShadow: isDark
                ? "0 0 60px rgba(20,37,79,0.22), 0 24px 60px rgba(0,0,0,0.35)"
                : "0 16px 48px rgba(36,42,82,0.13)",
            }}
          >
            <div
              style={{
                borderRadius: isDark ? "calc(2rem - 3px)" : "2rem",
                overflow: "hidden",
                position: "relative",
                background: isDark ? "#121b34" : "#f0f0f5",
              }}
            >
              <img
                src={heroImage}
                alt="Backlog registration illustration"
                style={{
                  height: "420px",
                  width: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
                  display: "block",
                  opacity: isDark ? 0.98 : 1,
                  filter: isDark
                    ? "brightness(0.95) saturate(1.2) contrast(1.02)"
                    : "none",
                }}
              />
              {isDark && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(14,28,57,0.24) 0%, rgba(26,40,74,0.32) 45%, rgba(37,27,68,0.45) 100%)",
                    mixBlendMode: "screen",
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
