export type UserRole =
  | "admin"
  | "pharmacist"
  | "store_manager";

export interface User {
  id: number;
  name: string;
  username?: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}