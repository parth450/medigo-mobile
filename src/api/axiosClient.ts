import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { AuthStorage } from "../store/auth.store";


const DEV_HOST = (() => {
  
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

 
  const manifestHost = (Constants.manifest as any)?.debuggerHost?.split(":")[0] || 
                       (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost?.split(":")[0];
  if (manifestHost) {
    return manifestHost;
  }

  
  return Platform.OS === "android" ? "10.0.2.2" : "localhost";
})();


console.log(`[MediGo Network] Target API base established at: http://${DEV_HOST}:3000/api`);

const BASE_URL = `http://${DEV_HOST}:3000/api`;

const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});


axiosClient.interceptors.request.use(
  (config) => {
    const token = AuthStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      AuthStorage.clear();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);


let onUnauthorizedCallback: (() => void) | null = null;
export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

export const triggerLogout = () => {
  AuthStorage.clear();
  if (onUnauthorizedCallback) {
    onUnauthorizedCallback();
  }
};

export default axiosClient;