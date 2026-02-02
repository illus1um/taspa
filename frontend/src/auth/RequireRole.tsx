import { Navigate } from "react-router-dom";

import { useAuth } from "./AuthContext";
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
  if (!user.roles.includes(role)) {
    return <Navigate to="/user" replace />;
  }
  return children;
};
