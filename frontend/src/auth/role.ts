import { Role } from "./types";

export const getDefaultPath = (roles: Role[]) => {
  if (roles.includes("admin")) {
    return "/admin";
  }
  if (roles.includes("developer")) {
    return "/developer";
  }
  return "/user";
};
