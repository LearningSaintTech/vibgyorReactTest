import axios from 'axios';

/**
 * Enhanced API Service with comprehensive error handling and retry logic
 */
class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'https://vibgyornode.onrender.com';
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    
    this.createAxiosInstance();
    this.setupInterceptors();
  }
  
  createAxiosInstance() {
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  
  setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request timestamp for debugging
        config.metadata = { startTime: Date.now() };
        
        return config;
      },
      (error) => {
        console.error('[ApiService] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        // Log response time
        if (response.config.metadata) {
          const responseTime = Date.now() - response.config.metadata.startTime;
          console.log(`[ApiService] ${response.config.method?.toUpperCase()} ${response.config.url} - ${responseTime}ms`);
        }
        
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh token
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await axios.post(`${this.baseURL}/user/auth/refresh`, {
                refreshToken
              });
              
              const { accessToken } = response.data.data;
              localStorage.setItem('accessToken', accessToken);
              
              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            console.error('[ApiService] Token refresh failed:', refreshError);
            // Clear tokens and redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        }
        
        // Handle network errors with retry
        if (!error.response && originalRequest._retryCount < this.retryAttempts) {
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
          
          console.log(`[ApiService] Retrying request (${originalRequest._retryCount}/${this.retryAttempts})`);
          
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, originalRequest._retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.api(originalRequest);
        }
        
        return Promise.reject(this.handleError(error));
      }
    );
  }
  
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      return {
        type: 'response_error',
        status,
        message: data?.message || 'An error occurred',
        errors: data?.errors || {},
        data: data?.data || null
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        type: 'network_error',
        message: 'Network error. Please check your connection.',
        status: 0
      };
    } else {
      // Something else happened
      return {
        type: 'request_error',
        message: error.message || 'An unexpected error occurred',
        status: 0
      };
    }
  }
  
  // Generic HTTP methods
  async get(url, config = {}) {
    try {
      const response = await this.api.get(url, config);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta
      };
    } catch (error) {
      throw error;
    }
  }
  
  async post(url, data = {}, config = {}) {
    try {
      const response = await this.api.post(url, data, config);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta
      };
    } catch (error) {
      throw error;
    }
  }
  
  async put(url, data = {}, config = {}) {
    try {
      const response = await this.api.put(url, data, config);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta
      };
    } catch (error) {
      throw error;
    }
  }
  
  async delete(url, config = {}) {
    try {
      const response = await this.api.delete(url, config);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta
      };
    } catch (error) {
      throw error;
    }
  }
  
  // File upload method
  async uploadFile(url, formData, onProgress = null) {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      };
      
      const response = await this.api.post(url, formData, config);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Set auth token
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('accessToken', token);
      this.api.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('accessToken');
      delete this.api.defaults.headers.Authorization;
    }
  }
  
  // Clear auth token
  clearAuthToken() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete this.api.defaults.headers.Authorization;
  }
  
  // Get current user info from token
  getCurrentUser() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user || null;
    } catch (error) {
      console.error('[ApiService] Error decoding token:', error);
      return null;
    }
  }
  
  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
