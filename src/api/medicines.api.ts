import axiosClient from "./axiosClient";
import type {
  Medicine,
  MedicineBatch,
  CreateMedicineDto,
  CreateBatchDto,
  PaginatedResponse, // We will map this structure to hold meta flags safely
} from "../types/api.types";

export const getMedicinesApi = async (params?: {
  search?: string;
  category?: string;
  status?: string;
  page?: number;   //  Added page number tracking parameters
  limit?: number;  //  Added limit chunk sizing rules
}): Promise<Medicine[]> => {
  const response = await axiosClient.get<Medicine[]>("/medicines", { params });
  return response.data;
};

export const createMedicineApi = async (
  data: CreateMedicineDto
): Promise<Medicine> => {
  const response = await axiosClient.post<Medicine>("/medicines", data);
  return response.data;
};

export const getMedicineDetailsApi = async (id: number): Promise<Medicine> => {
  const response = await axiosClient.get<Medicine>(`/medicines/${id}`);
  return response.data;
};

export const updateMedicineApi = async (
  id: number,
  data: Partial<CreateMedicineDto>
): Promise<Medicine> => {
  const response = await axiosClient.patch<Medicine>(`/medicines/${id}`, data);
  return response.data;
};

export const getMedicineBatchesApi = async (
  medicineId: number
): Promise<MedicineBatch[]> => {
  const response = await axiosClient.get<MedicineBatch[]>(
    `/medicines/${medicineId}/batches`
  );
  return response.data;
};

export const createMedicineBatchApi = async (
  medicineId: number,
  data: CreateBatchDto
): Promise<MedicineBatch> => {
  const response = await axiosClient.post<MedicineBatch>(
    `/medicines/${medicineId}/batches`,
    data
  );
  return response.data;
};

export const updateMedicineBatchApi = async (
  batchId: number,
  data: Partial<CreateBatchDto>
): Promise<MedicineBatch> => {
  const response = await axiosClient.patch<MedicineBatch>(
    `/medicines/batches/${batchId}`,
    data
  );
  return response.data;
};