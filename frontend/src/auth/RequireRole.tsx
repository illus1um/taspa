import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";
import { hasRole } from "./role";
import { Role } from "./types";

export const RequireRole = ({
  role,
  children,
}: {
  role: Role;
  children: JSX.Element;
}) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRole(user.roles, role)) {
    return <Navigate to="/home" replace />;
  }
  return children;
};
