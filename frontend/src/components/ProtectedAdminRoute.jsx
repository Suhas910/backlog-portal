import { Navigate, useLocation } from "react-router-dom";
import { getAdminToken } from "../lib/api";
import { useSessionKeepAlive } from "../hooks/useSessionKeepAlive";

// Gates admin-only routes: with no admin token, redirect to login, preserving the intended
// destination so login can return there.
function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  // sliding-session refresh while any admin page is mounted; the hook runs unconditionally and
  // no-ops without a token
  useSessionKeepAlive("admin");
  if (!getAdminToken()) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?redirect=${redirect}`} replace />;
  }
  return children;
}

export default ProtectedAdminRoute;
