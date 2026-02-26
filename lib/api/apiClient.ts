import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ApiErrorResponse {
  message?: string;
  data?: unknown;
  status: number;
}

class ApiManager {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error: AxiosError) => {
        const errorResponse: ApiErrorResponse = {
          message: error.message,
          status: error.response?.status || 500,
          data: error.response?.data,
        };

        // Handle specific error statuses
        if (error.response?.status === 401) {
          // Unauthorized - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }

        return Promise.reject(errorResponse);
      },
    );
  }

  public getClient() {
    return this.instance;
  }
}

export const apiManager = new ApiManager();
export const apiClient = apiManager.getClient();

export default apiClient;
