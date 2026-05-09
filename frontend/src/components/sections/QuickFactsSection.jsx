import { motion } from "framer-motion";
import { ClipboardCheck, FileCheck2, FileUp } from "lucide-react";

const facts = [
  {
    icon: ClipboardCheck,
    title: "Enter Your Details",
    text: "Provide your student information, semester, and select the backlog subjects.",
    col: "lg:col-span-1",
  },
  {
    icon: FileCheck2,
    title: "Download PDF",
    text: "Get your registration slip instantly and get it signed.",
    col: "lg:col-span-1",
  },
  {
    icon: FileUp,
    title: "Submit for Approval",
    text: "Bring the signed slip to the department office for final approval.",
    col: "lg:col-span-1",
  },
];

const container = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.12, duration: 0.55 },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export default function QuickFactsSection() {
  return (
    <section
      id="quick-facts"
      className="bg-[var(--surface-1)] px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="font-serif text-3xl text-[var(--color-primary)] sm:text-4xl">
          What to Do
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--text-main)]">
          Follow these three simple steps to complete your backlog registration.
        </p>

        <motion.div
          className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={container}
        >
          {facts.map((fact) => {
            const Icon = fact.icon;
            return (
              <motion.article
                key={fact.title}
                variants={item}
                className={`rounded-3xl border border-[var(--stroke)] bg-[var(--surface-1)] p-6 shadow-soft ${fact.col}`}
              >
                <div className="mb-4 inline-flex rounded-xl bg-[var(--color-secondary)] p-2 text-white">
                  <Icon size={18} />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-main)]">
                  {fact.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-main)]">
                  {fact.text}
                </p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
