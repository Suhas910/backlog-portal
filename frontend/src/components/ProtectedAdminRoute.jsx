import { Navigate, useLocation } from "react-router-dom";
import { getAdminToken } from "../lib/api";
import { useSessionTimeout } from "../hooks/useSessionTimeout";
import SessionWarningBanner from "./SessionWarningBanner";

// Gates admin-only routes: with no admin token, redirect to login, preserving the intended
// destination so login can return there.
function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  // sign out when the fixed session ends; runs unconditionally, no-ops without a token
  const minutesLeft = useSessionTimeout("admin");
  if (!getAdminToken()) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?redirect=${redirect}`} replace />;
  }
  return (
    <>
      <SessionWarningBanner minutesLeft={minutesLeft} />
      {children}
    </>
  );
}

export default ProtectedAdminRoute;
