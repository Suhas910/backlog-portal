import { Navigate, useLocation } from "react-router-dom";
import { getStudentToken } from "../lib/api";
import { useSessionKeepAlive } from "../hooks/useSessionKeepAlive";

// Gates student-only routes: with no student token, redirect to login, preserving where they
// were headed so login can return there.
function ProtectedStudentRoute({ children }) {
  const location = useLocation();
  // sliding-session refresh while any student page is mounted (no-ops without a token)
  useSessionKeepAlive("student");
  if (!getStudentToken()) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/student/login?redirect=${redirect}`} replace />;
  }
  return children;
}

export default ProtectedStudentRoute;
