/**
 * SatQuery AI Core API Client Layer
 * Encapsulates all network communication and cleanly isolates mock vs real API calls.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiClient {
  private baseUrl: string;
  private isMock: boolean;

  constructor(baseUrl = API_BASE_URL, isMock = USE_MOCK_API) {
    this.baseUrl = baseUrl;
    let effectiveMock = isMock;
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('satquery_use_mock_api');
      if (stored !== null) {
        effectiveMock = stored === 'true';
      }
    }
    this.isMock = effectiveMock;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getMockStatus(): boolean {
    return this.isMock;
  }

  public setMockStatus(enabled: boolean) {
    this.isMock = enabled;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('satquery_use_mock_api', String(enabled));
    }
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorMessage = `API Error [${res.status}]: ${res.statusText}`;
      try {
        const errorJson = (await res.json()) as ApiErrorResponse;
        if (errorJson?.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Response wasn't JSON, retain statusText
      }
      throw new Error(errorMessage);
    }
    return res.json() as Promise<T>;
  }

  public async get<T>(endpoint: string): Promise<T> {
    if (this.isMock) {
      throw new Error(`Mock mode active: Route ${endpoint} must be handled by mock provider.`);
    }
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`);
      return await this.handleResponse<T>(res);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error(`Unable to connect to the analysis service at ${this.baseUrl}. Please verify the backend server is running.`);
      }
      throw err;
    }
  }

  public async post<T>(endpoint: string, data: unknown): Promise<T> {
    if (this.isMock) {
      throw new Error(`Mock mode active: Route ${endpoint} must be handled by mock provider.`);
    }
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await this.handleResponse<T>(res);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error(`Unable to connect to the analysis service at ${this.baseUrl}. Please verify the backend server is running.`);
      }
      throw err;
    }
  }

  public async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    if (this.isMock) {
      throw new Error(`Mock mode active: Route ${endpoint} must be handled by mock provider.`);
    }
    try {
      // Intentionally do NOT set Content-Type header so the browser sets multipart/form-data with boundary
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
      });
      return await this.handleResponse<T>(res);
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        throw new Error(`Unable to connect to the analysis service at ${this.baseUrl}. Please verify the backend server is running.`);
      }
      throw err;
    }
  }
}

export const apiClient = new ApiClient();
