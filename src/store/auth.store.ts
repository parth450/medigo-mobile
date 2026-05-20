import { storage } from "./mmkv";

import type { User } from "../types/auth.types";

export const AuthStorage = {
  setToken(token: string) {
    storage.set("token", token);
  },

  getToken(): string | null {
    const token = storage.getString("token");

    return token && token.length > 0
      ? token
      : null;
  },

  setUser(user: User) {
    storage.set(
      "user",
      JSON.stringify(user)
    );
  },

  getUser(): User | null {
    const user = storage.getString("user");

    return user
      ? JSON.parse(user)
      : null;
  },

  clear() {
    storage.set("token", "");
    storage.set("user", "");
  },
};