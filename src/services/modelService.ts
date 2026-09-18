import type { ModelInfo } from '../types';
import { MOCK_MODELS } from '../mocks/modelMocks';
import { apiClient } from './apiClient';

class ModelService {
  public async getModels(): Promise<ModelInfo[]> {
    if (apiClient.getMockStatus()) {
      return Promise.resolve([...MOCK_MODELS]);
    }
    return apiClient.get<ModelInfo[]>('/api/v1/models');
  }
}

export const modelService = new ModelService();
