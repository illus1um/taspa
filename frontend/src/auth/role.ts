import { Role } from "./types";

const ROLE_LEVEL: Record<Role, number> = {
  user: 1,
  admin: 2,
  developer: 3,
};

export const getRoleLevel = (roles: Role[]) => {
  if (!roles.length) return 0;
  return Math.max(...roles.map((role) => ROLE_LEVEL[role] ?? 0));
};

export const hasRole = (roles: Role[], required: Role) => {
  return getRoleLevel(roles) >= ROLE_LEVEL[required];
};

export const getDefaultPath = (_roles: Role[]) => {
  return "/home";
};
