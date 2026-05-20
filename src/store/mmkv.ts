import * as MMKVModule from "react-native-mmkv";

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
  const createMMKV = (MMKVModule as any)?.createMMKV;
  if (createMMKV) {
    storageInstance = createMMKV({ id: "medigo-storage" });
  } else {
    const MMKVClass = (MMKVModule as any)?.MMKV;
    if (MMKVClass) {
      storageInstance = new MMKVClass({ id: "medigo-storage" });
    } else {
      storageInstance = new MemoryStorage();
    }
  }
} catch (e) {
  storageInstance = new MemoryStorage();
}

export const storage = storageInstance;