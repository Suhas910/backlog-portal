import { motion } from "framer-motion";

function baseClasses(extra = "") {
  return [
    "inline-flex items-center justify-center rounded-full bg-[var(--color-cta)] px-5 py-3 text-sm font-semibold text-white",
    "shadow-soft transition-[box-shadow,transform] duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]",
    "hover:shadow-[0_10px_30px_rgba(237,20,91,0.35)]",
    extra,
  ].join(" ");
}

export default function MagneticCta({
  children,
  className,
  as: Component = "button",
  type = "button",
  ...props
}) {
  if (Component === "button") {
    return (
      <motion.button
        whileTap={{ scale: 0.98 }}
        className={baseClasses(className)}
        type={type}
        {...props}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div whileTap={{ scale: 0.98 }}>
      <Component className={baseClasses(className)} {...props}>
        {children}
      </Component>
    </motion.div>
  );
}
