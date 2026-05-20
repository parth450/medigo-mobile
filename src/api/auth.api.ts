import axiosClient from "./axiosClient";

import type {
  LoginPayload,
} from "../types/auth.types";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export const loginApi = async (
  data: LoginPayload
): Promise<LoginResponse> => {

  const response =
    await axiosClient.post<LoginResponse>(
      "/auth/login",
      data
    );

  return response.data;
};

export const getProfileApi =
  async () => {

    const response =
      await axiosClient.get(
        "/auth/profile"
      );

    return response.data;
  };