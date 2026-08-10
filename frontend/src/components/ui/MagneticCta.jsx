function baseClasses(extra = "") {
  return [
    "inline-flex items-center justify-center rounded-full bg-[var(--color-cta)] px-5 py-3 text-sm font-semibold text-[var(--color-cta-text)]",
    "shadow-soft transition-[box-shadow,transform] duration-200",
    // press feedback (formerly framer-motion whileTap={{ scale: 0.98 }})
    "active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-1)]",
    "hover:shadow-[0_10px_30px_var(--color-cta-glow)]",
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
      <button className={baseClasses(className)} type={type} {...props}>
        {children}
      </button>
    );
  }

  return (
    <Component className={baseClasses(className)} {...props}>
      {children}
    </Component>
  );
}
