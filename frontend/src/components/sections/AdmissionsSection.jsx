import { motion } from "framer-motion";
import { CheckCircle2, Download, FilePenLine, FileUp } from "lucide-react";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: FilePenLine,
    title: "Submit Details",
    text: "Enter student information and select backlog subjects by year and semester.",
  },
  {
    icon: Download,
    title: "Print Form",
    text: "Download the generated PDF and complete physical signatures.",
  },
  {
    icon: FileUp,
    title: "Submit for Verification",
    text: "Submit the signed form to the department for admin verification.",
  },
  {
    icon: CheckCircle2,
    title: "Final Approval",
    text: "Admin marks completion and tracks submissions centrally.",
  },
];

export default function AdmissionsSection() {
  return (
    <section
      id="admissions"
      className="bg-[linear-gradient(180deg,var(--surface-1)_0%,var(--surface-tint)_44%,var(--surface-1)_100%)] px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            Registration Steps
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[var(--color-primary)] sm:text-4xl">
            How to Complete Your Registration
          </h2>
          <p className="mt-4 max-w-xl text-[var(--text-main)]">
            A step-by-step process designed for simplicity. Complete all steps
            to successfully submit your backlog registration.
          </p>
          <Link
            to="/register"
            className="mt-6 inline-flex items-center rounded-full border border-[var(--color-secondary)]/20 bg-[var(--surface-1)] px-5 py-3 text-sm font-semibold text-[var(--color-secondary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            Start Student Registration
          </Link>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl border border-[var(--stroke)] bg-[var(--surface-1)] p-4"
              >
                <div className="mb-2 inline-flex rounded-lg bg-[var(--color-secondary)] p-2 text-white">
                  <Icon size={16} />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-main)]">
                  {step.text}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
