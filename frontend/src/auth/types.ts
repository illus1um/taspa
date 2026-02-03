export type Role = "user" | "admin" | "developer";

export type AuthUser = {
  email: string;
  roles: Role[];
  first_name?: string | null;
  last_name?: string | null;
};
