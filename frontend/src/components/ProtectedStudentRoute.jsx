import { Navigate, useLocation } from "react-router-dom";
import { getStudentToken } from "../lib/api";

// Gates student-only routes. Without a student token, redirect to login,
// preserving where they were headed so we can return there after login.
function ProtectedStudentRoute({ children }) {
  const location = useLocation();
  if (!getStudentToken()) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/student/login?redirect=${redirect}`} replace />;
  }
  return children;
}

export default ProtectedStudentRoute;
