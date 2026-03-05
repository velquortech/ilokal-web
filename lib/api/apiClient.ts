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
              ? Object.keys(responseData as any).length > 0
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
