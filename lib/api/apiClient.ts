import axios, { AxiosInstance, AxiosError } from 'axios';
import { ROUTES } from '@/config/routesConfig';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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
      (config) => config,
      (error) => Promise.reject(error),
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        // Extract the actual error message from the response data
        const responseData = error.response?.data as Record<string, unknown>;
        const errorMessage =
          (typeof responseData?.message === 'string'
            ? responseData.message
            : null) ||
          error.message ||
          'An error occurred';

        // Log error details (safe fields only, redacted in production)
        if (process.env.NODE_ENV === 'development') {
          // Development: log full details for debugging
          console.error('API Error Details:', {
            status: error.response?.status,
            message: errorMessage,
            data: responseData,
            url: error.config?.url,
          });
        } else {
          // Production: log only safe fields to prevent PII leakage
          console.error('API Error:', {
            status: error.response?.status,
            message: errorMessage,
            url: error.config?.url,
          });
        }

        // Create proper error response
        const errorResponse: ApiErrorResponse = {
          message: errorMessage,
          status: error.response?.status || 500,
          data: error.response?.data,
        };

        // Handle specific error statuses
        if (error.response?.status === 401) {
          // Unauthorized - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = ROUTES.AUTH.LOGIN;
          }
        }

        // Throw as Error to maintain instanceof Error check in error handling
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err: any = new Error(errorMessage);
        err.data = errorResponse.data;
        err.status = errorResponse.status;

        return Promise.reject(err);
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
