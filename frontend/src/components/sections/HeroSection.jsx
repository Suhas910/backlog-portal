import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { useTheme } from "../../context/ThemeContext";
import MagneticCta from "../ui/MagneticCta";

export default function HeroSection() {
  const { isDark } = useTheme();
  // null = still checking; otherwise { open, cycleName?, examMonthYear? }
  const [regStatus, setRegStatus] = useState(null);

  useEffect(() => {
    api
      .get("/registration-status")
      // fail closed, same as the registration page: never claim a cycle is
      // open unless the backend confirms it
      .then((res) => setRegStatus(res.data))
      .catch(() => setRegStatus({ open: false }));
  }, []);

  return (
    // Transparent — the page-wide fixed backdrop in HomePage provides the
    // gradient (dark) / blobs (light); the text scrolls over it.
    <section
      style={{
        position: "relative",
        padding: "3rem 1rem 5rem",
      }}
    >
      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          margin: "0 auto",
          maxWidth: "80rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            textAlign: "center",
          }}
        >
          {regStatus !== null && (
            <span
              style={{
                display: "inline-flex",
                alignSelf: "center",
                borderRadius: "9999px",
                padding: "6px 16px",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: regStatus.open
                  ? isDark
                    ? "rgba(237,20,91,0.15)"
                    : "rgba(145,25,28,0.08)"
                  : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(36,42,82,0.06)",
                border: regStatus.open
                  ? isDark
                    ? "1px solid rgba(237,20,91,0.4)"
                    : "1px solid rgba(145,25,28,0.3)"
                  : isDark
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(36,42,82,0.25)",
                color: regStatus.open
                  ? isDark
                    ? "#f472a0"
                    : "#91191C"
                  : isDark
                    ? "rgba(255,255,255,0.75)"
                    : "#242A52",
              }}
            >
              {regStatus.open
                ? `${regStatus.cycleName ? `${regStatus.cycleName} — ` : ""}Registrations Open`
                : "Registrations Currently Closed"}
            </span>
          )}

          <h1
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontSize: "clamp(2.5rem, 5vw, 3.75rem)",
              lineHeight: 1.15,
              margin: 0,
              color: isDark ? "#ffffff" : "#91191C",
            }}
          >
            Register for your backlog exam
          </h1>

          <p
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
          </p>

          <div
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
          </div>
        </div>
      </div>
    </section>
  );
}
