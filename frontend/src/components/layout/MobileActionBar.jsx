import { Home, Shield, UserPlus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/register", label: "Register", icon: UserPlus },
  { to: "/admin/login", label: "Admin", icon: Shield },
];

function linkClasses(active) {
  const base = "flex min-w-[74px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold";
  const theme = active
    ? "bg-primary text-white"
    : "text-secondary-ink hover:bg-surface-muted";

  return `${base} ${theme}`;
}

export default function MobileActionBar() {
  const location = useLocation();

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stroke bg-surface-1/95 p-2 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center justify-around">
        {links.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;

          return (
            <li key={item.to}>
              <Link to={item.to} className={linkClasses(active)} aria-current={active ? "page" : undefined}>
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
