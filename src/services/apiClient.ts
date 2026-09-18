/**
 * SatQuery AI Core API Client Layer
 * Encapsulates all network communication and cleanly isolates mock vs real API calls.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';

export class ApiClient {
  private baseUrl: string;
  private isMock: boolean;

  constructor(baseUrl = API_BASE_URL, isMock = USE_MOCK_API) {
    this.baseUrl = baseUrl;
    this.isMock = isMock;
  }

  public getMockStatus(): boolean {
    return this.isMock;
  }

  public setMockStatus(enabled: boolean) {
    this.isMock = enabled;
  }

  public async get<T>(endpoint: string): Promise<T> {
    if (this.isMock) {
      throw new Error(`Mock mode active: Route ${endpoint} must be handled by mock provider.`);
    }
    const res = await fetch(`${this.baseUrl}${endpoint}`);
    if (!res.ok) {
      throw new Error(`API Error [${res.status}]: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  public async post<T>(endpoint: string, data: unknown): Promise<T> {
    if (this.isMock) {
      throw new Error(`Mock mode active: Route ${endpoint} must be handled by mock provider.`);
    }
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`API Error [${res.status}]: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }
}

export const apiClient = new ApiClient();
