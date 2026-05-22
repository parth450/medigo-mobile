import axiosClient from "./axiosClient";
import type { Bill, CreateBillDto } from "../types/api.types";

/*Generates a new invoice/bill.*/

export const createBillApi = async (data: CreateBillDto): Promise<Bill> => {
  const response = await axiosClient.post<Bill>("/bills", data);
  return response.data;
};

/*Retrieves the complete list of generated bills.*/
export const getBillsApi = async (): Promise<Bill[]> => {
  const response = await axiosClient.get<Bill[]>("/bills");
  return response.data;
};

/*Retrieves details for an individual bill by its ID.*/
export const getBillDetailsApi = async (id: number): Promise<Bill> => {
  const response = await axiosClient.get<Bill>(`/bills/${id}`);
  return response.data;
};