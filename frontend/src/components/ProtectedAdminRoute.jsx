import { Navigate, useLocation } from "react-router-dom";
import { getAdminToken } from "../lib/api";
import { useSessionKeepAlive } from "../hooks/useSessionKeepAlive";

// Gates admin-only routes. Without an admin token, redirect to login,
// preserving the intended destination so login can return there.
function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  // sliding-session refresh while any admin page is mounted (hook runs
  // unconditionally; it no-ops when there's no token)
  useSessionKeepAlive("admin");
  if (!getAdminToken()) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?redirect=${redirect}`} replace />;
  }
  return children;
}

export default ProtectedAdminRoute;
