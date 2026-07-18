import { motion } from "framer-motion";
import { CheckCircle2, FileSignature, ListChecks, LogIn } from "lucide-react";

const steps = [
  {
    icon: LogIn,
    title: "Log In",
    text: "Sign in with your USN and date of birth.",
  },
  {
    icon: ListChecks,
    title: "Select Subjects",
    text: "Pick the backlog subjects you are eligible to register for.",
  },
  {
    icon: FileSignature,
    title: "Download & Sign",
    text: "Download the pre-filled PDF form and get it signed by your Proctor and HOD.",
  },
  {
    icon: CheckCircle2,
    title: "Submit for Verification",
    text: "Hand the signed form to your department office — it is verified and tracked centrally.",
  },
];

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ProcessSection() {
  return (
    <section id="how-it-works" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            How It Works
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[var(--color-primary)] sm:text-4xl">
            From Login to Verification
          </h2>
          <p className="mt-3 max-w-xl text-[var(--text-muted)]">
            Four steps take your backlog registration from start to verified.
          </p>
        </motion.div>

        <motion.ol
          className="mt-10"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={list}
        >
          {steps.map((step, index) => {
            const Icon = step.icon;
            const last = index === steps.length - 1;

            return (
              <motion.li key={step.title} variants={item} className="relative flex gap-5 pb-10 last:pb-0">
                {/* connector line between the numbered dots */}
                {!last && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[22px] top-12 h-[calc(100%-2.5rem)] w-px bg-[var(--stroke)]"
                  />
                )}
                <span className="relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-white shadow-soft">
                  <Icon size={18} />
                </span>
                <div className="pt-1">
                  <h3 className="text-lg font-semibold text-[var(--text-main)]">
                    <span className="mr-2 text-sm font-bold text-[var(--color-primary)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {step.title}
                  </h3>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">{step.text}</p>
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}
