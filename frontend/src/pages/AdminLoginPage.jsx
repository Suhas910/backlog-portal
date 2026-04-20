import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import msritLogo from "../assets/MSRIT.png";

function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:8080/api/auth/login", {
        username,
        password,
      });

      if (res.data.role === "ADMIN" && res.data.token) {
        sessionStorage.setItem("adminRole", "ADMIN");
        sessionStorage.setItem("adminToken", res.data.token);
        window.location.href = "/admin";
      } else {
        sessionStorage.removeItem("adminRole");
        sessionStorage.removeItem("adminToken");
        alert("Unauthorized role");
      }
    } catch {
      alert("Login failed");
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[var(--bg)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(36,42,82,0.1),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(237,20,91,0.12),transparent_40%),linear-gradient(to_bottom,rgba(36,42,82,0.03),transparent_45%)]" />
      <div className="relative mx-auto w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-[var(--shadow)] opacity-0 motion-safe:animate-[heroFade_600ms_ease-out_forwards] sm:p-8">
        <div className="mb-6 text-left">
          <img
            src={msritLogo}
            alt="Ramaiah Institute of Technology"
            className="mb-2 h-11 w-auto"
          />
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cta)]">
            Ramaiah Institute of Technology
          </p>
          <p className="mb-2 inline-flex rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
            Restricted Access
          </p>
          <h1 className="font-[var(--heading)] text-3xl font-semibold text-[var(--text-h)]">Admin Login</h1>
          <p className="mt-2 text-sm text-[var(--text)]">
            Sign in to verify and manage backlog registrations.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text)]">
            Username
          </label>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-colors duration-200 placeholder:text-[var(--text)]/70 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          />

          <label className="block text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text)]">
            Password
          </label>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm text-[var(--text-h)] outline-none transition-colors duration-200 placeholder:text-[var(--text)]/70 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          />

          <button
            type="button"
            onClick={handleLogin}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:scale-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            Login
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-sm font-medium text-[var(--cta)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;