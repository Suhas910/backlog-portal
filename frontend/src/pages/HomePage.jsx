import { Link } from "react-router-dom";
import msritLogo from "../assets/MSRIT.png";

function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-white/20 bg-[var(--brand-secondary)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-left sm:gap-4">
            <img
              src={msritLogo}
              alt="Ramaiah Institute of Technology"
              className="h-12 w-auto sm:h-14"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cta)]">
                Ramaiah Institute of Technology
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/85 sm:text-xs">
                Autonomous Institute, Affiliated to VTU
              </p>
              <p className="text-base font-semibold text-white sm:text-lg">
                Backlog Registration Portal
              </p>
            </div>
          </div>

          <Link
            to="/admin/login"
            className="inline-flex items-center rounded-xl border border-white/25 bg-white px-4 py-2 text-sm font-medium text-[var(--brand-secondary)] shadow-[var(--shadow)] transition-transform transition-colors duration-200 motion-safe:hover:scale-105 hover:border-[var(--cta)] hover:text-[var(--cta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-secondary)]"
          >
            Admin Login
          </Link>
        </div>
      </header>

      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(36,42,82,0.12),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(237,20,91,0.14),transparent_38%),linear-gradient(to_bottom,rgba(36,42,82,0.04),transparent_45%)]" />

        <section className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 md:py-18 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:py-24 opacity-0 motion-safe:animate-[heroFade_700ms_ease-out_forwards]">
          <div className="lg:col-span-7 text-left">
            <p className="mb-4 inline-flex rounded-full border border-[var(--accent-border)] bg-[var(--accent-bg)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
              Streamlined Academic Workflow
            </p>
            <h1 className="mb-4 text-4xl font-semibold leading-tight text-[var(--text-h)] sm:text-5xl lg:text-6xl">
              Register, verify, and manage backlog applications with confidence.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[var(--text)] sm:text-lg">
              A modern portal for students and administrators with clear role-based
              pathways, fast actions, and accessible interactions designed for
              daily use.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow)] transition-transform duration-200 motion-safe:hover:scale-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                Start Student Registration
              </Link>
              <Link
                to="/admin/login"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-6 py-3 text-sm font-semibold text-[var(--text-h)] shadow-[var(--shadow)] transition-transform transition-colors duration-200 motion-safe:hover:scale-105 hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                Open Admin Dashboard
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Link
                to="/register"
                className="group rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 text-left shadow-[var(--shadow)] transition-transform transition-colors duration-200 motion-safe:hover:translate-y-[-2px] hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  Student Role
                </p>
                <h2 className="mb-2 text-2xl font-semibold text-[var(--text-h)]">
                  Student
                </h2>
                <p className="text-sm leading-relaxed text-[var(--text)]">
                  Submit backlog registration details and continue to verification
                  in a guided flow.
                </p>
                <span className="mt-5 inline-flex items-center text-sm font-semibold text-[var(--cta)] transition-transform duration-200 group-hover:translate-x-1">
                  Continue as Student →
                </span>
              </Link>

              <Link
                to="/admin/login"
                className="group rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 text-left shadow-[var(--shadow)] transition-transform transition-colors duration-200 motion-safe:hover:translate-y-[-2px] hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                  Admin Role
                </p>
                <h2 className="mb-2 text-2xl font-semibold text-[var(--text-h)]">
                  Admin
                </h2>
                <p className="text-sm leading-relaxed text-[var(--text)]">
                  Review submissions, manage records, and handle operations from
                  a secure administrator view.
                </p>
                <span className="mt-5 inline-flex items-center text-sm font-semibold text-[var(--cta)] transition-transform duration-200 group-hover:translate-x-1">
                  Continue as Admin →
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
