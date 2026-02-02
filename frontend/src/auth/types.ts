export type Role = "user" | "admin" | "developer";

export type AuthUser = {
  email: string;
  roles: Role[];
};
