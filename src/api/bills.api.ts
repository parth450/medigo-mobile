import axiosClient from "./axiosClient";
import type { Bill, CreateBillDto } from "../types/api.types";

export const createBillApi = async (data: CreateBillDto): Promise<Bill> => {
  const response = await axiosClient.post<Bill>("/bills", data);
  return response.data;
};

export const getBillsApi = async (): Promise<Bill[]> => {
  const response = await axiosClient.get<Bill[]>("/bills");
  return response.data;
};

export const getBillDetailsApi = async (id: number): Promise<Bill> => {
  const response = await axiosClient.get<Bill>(`/bills/${id}`);
  return response.data;
};
