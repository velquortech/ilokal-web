import axios, { AxiosInstance, AxiosError } from 'axios';
import { ROUTES } from '@/config/routeConfig';

export interface ApiErrorResponse {
  message?: string;
  data?: unknown;
  status: number;
}

export interface ApiError extends Error {
  status: number;
  data?: unknown;
}

class ApiManager {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
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
        const responseData = error.response?.data;
        let errorMessage = 'An error occurred';

        // Try multiple ways to extract error message
        if (responseData && typeof responseData === 'object') {
          const data = responseData as Record<string, unknown>;
          if (typeof data.message === 'string') {
            errorMessage = data.message;
          } else if (typeof data.error === 'string') {
            errorMessage = data.error;
          } else if (data.errors && typeof data.errors === 'object') {
            const errorObj = data.errors as Record<string, unknown>;
            const firstError = Object.values(errorObj)[0];
            if (typeof firstError === 'string') {
              errorMessage = firstError;
            }
          }
        }

        // Fallback to axios error message
        if (!errorMessage && error.message) {
          errorMessage = error.message;
        }

        // For network errors without response
        if (!error.response && error.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout - server took too long to respond';
        } else if (!error.response && error.message) {
          errorMessage = `Network error: ${error.message}`;
        }

        // Log error details (safe fields only, redacted in production)
        if (process.env.NODE_ENV === 'development') {
          // Development: log full details for debugging
          console.error('API Error:', {
            method: error.config?.method?.toUpperCase(),
            url: error.config?.url,
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: errorMessage,
            responseData: responseData
              ? Object.keys(responseData as Record<string, unknown>).length > 0
                ? responseData
                : '(empty)'
              : '(no response)',
          });
        } else {
          // Production: log only safe fields to prevent PII leakage
          console.error('API Error:', {
            method: error.config?.method?.toUpperCase(),
            url: error.config?.url,
            status: error.response?.status,
            message: errorMessage,
          });
        }

        // Create proper error response
        const errorResponse: ApiErrorResponse = {
          message: errorMessage,
          status: error.response?.status || 0,
          data: error.response?.data,
        };

        // Handle specific error statuses
        if (error.response?.status === 401) {
          // Unauthorized - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = ROUTES.AUTH.LOGIN;
          }
        }

        // Create typed error response with proper error interface
        const err: ApiError = new Error(errorMessage) as ApiError;
        err.status = error.response?.status || 0;
        err.data = errorResponse.data;

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
