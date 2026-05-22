import { createMMKV } from "react-native-mmkv";

class MemoryStorage {
  private map = new Map<string, string>();
  getString(key: string): string | undefined {
    return this.map.get(key);
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
}

let storageInstance: any;
try {
  storageInstance = createMMKV({ id: "medigo-storage" });
} catch (e) {
  storageInstance = new MemoryStorage();
}

export const storage = storageInstance;