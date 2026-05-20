import axiosClient from "./axiosClient";
import type { CreateUserDto } from "../types/api.types";
import type { User } from "../types/auth.types";

export const createUserApi = async (data: CreateUserDto): Promise<User> => {
  const response = await axiosClient.post<User>("/users", data);
  return response.data;
};

export const getUsersApi = async (): Promise<User[]> => {
  const response = await axiosClient.get<User[]>("/users");
  return response.data;
};

export const getUserDetailsApi = async (id: number): Promise<User> => {
  const response = await axiosClient.get<User>(`/users/${id}`);
  return response.data;
};
