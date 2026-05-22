import { storage } from "./mmkv";
import type { User } from "../types/auth.types";

export const AuthStorage = {
  // --- Access Token Methods ---
  setToken(token: string) {
    storage.set("token", token);
  },

  getToken(): string | null {
    const token = storage.getString("token");
    return token && token.length > 0 ? token : null;
  },

  // ---  New Refresh Token Methods ---
  setRefreshToken(token: string) {
    storage.set("refresh_token", token);
  },

  getRefreshToken(): string | null {
    const token = storage.getString("refresh_token");
    return token && token.length > 0 ? token : null;
  },

  // --- User Profile Methods ---
  setUser(user: User) {
    storage.set("user", JSON.stringify(user));
  },

  getUser(): User | null {
    const user = storage.getString("user");
    return user ? JSON.parse(user) : null;
  },

  // --- Session Lifecycle Clear ---
  clear() {
    storage.set("token", "");
    storage.set("refresh_token", ""); 
    storage.set("user", "");
  },
};