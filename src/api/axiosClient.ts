import axios from "axios";
import { Platform } from "react-native";
import { AuthStorage } from "../store/auth.store";

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

// Handles local loops securely across platform testing layers
const BASE_URL = Platform.OS === "android"
  ? "http://10.0.2.2:3000/api"
  : "http://localhost:3000/api";


const axiosClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10s timeout prevents infinite app hangs
  headers: {
    "Content-Type": "application/json",
  }
});

// Dynamic Outbound Request Interceptor Engine
axiosClient.interceptors.request.use(
  (config) => {
    const token = AuthStorage.getToken();
    
    if (token && config.headers) {
      // Clean, standardized method to attach auth headers in Axios
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    // CRITICAL FIX: Rejects the request error cleanly so the promise chain fails explicitly
    return Promise.reject(error);
  }
);

// Inbound Response Interceptor Engine (Auto-Logout on 401 Unauthorized)
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

export default axiosClient;