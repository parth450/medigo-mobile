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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = AuthStorage.getRefreshToken();
      if (!refreshToken) {
        AuthStorage.clear();
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        AuthStorage.setToken(newAccessToken);
        if (newRefreshToken) {
          AuthStorage.setRefreshToken(newRefreshToken);
        }

        axiosClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        AuthStorage.clear();
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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