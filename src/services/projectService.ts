import type { Project } from '../types';
import { MOCK_PROJECTS } from '../mocks/projectMocks';
import { apiClient } from './apiClient';

class ProjectService {
  public async getProjects(): Promise<Project[]> {
    if (apiClient.getMockStatus()) {
      return Promise.resolve([...MOCK_PROJECTS]);
    }
    return apiClient.get<Project[]>('/api/v1/projects');
  }
}

export const projectService = new ProjectService();
