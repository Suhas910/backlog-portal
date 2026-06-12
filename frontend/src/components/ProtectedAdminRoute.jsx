import { Navigate, useLocation } from "react-router-dom";
import { getAdminToken } from "../lib/api";

// Gates admin-only routes. Without an admin token, redirect to login,
// preserving the intended destination so login can return there.
function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  if (!getAdminToken()) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?redirect=${redirect}`} replace />;
  }
  return children;
}

export default ProtectedAdminRoute;
