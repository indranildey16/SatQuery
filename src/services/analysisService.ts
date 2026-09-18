import type { Analysis, AnalysisInput, TaskType, ExecutionTraceItem } from '../types';
import { MOCK_ANALYSES } from '../mocks/analysisMocks';
import { apiClient } from './apiClient';
import { MOCK_MODELS } from '../mocks/modelMocks';

const STORAGE_KEY = 'satquery_analyses';

const STAGES: { stage: string; progress: number; delayMs: number }[] = [
  { stage: 'UPLOAD RECEIVED', progress: 12, delayMs: 250 },
  { stage: 'IMAGE VALIDATION', progress: 28, delayMs: 300 },
  { stage: 'MODALITY RESOLUTION', progress: 42, delayMs: 250 },
  { stage: 'QUERY INTERPRETATION', progress: 56, delayMs: 350 },
  { stage: 'MODEL SELECTION', progress: 70, delayMs: 300 },
  { stage: 'MODEL INFERENCE', progress: 86, delayMs: 700 },
  { stage: 'RESULT PROCESSING', progress: 95, delayMs: 350 },
  { stage: 'RESULT READY', progress: 100, delayMs: 200 }
];

class AnalysisService {
  private analyses: Analysis[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.analyses = JSON.parse(stored);
      } else {
        this.analyses = [...MOCK_ANALYSES];
        this.saveToStorage();
      }
    } catch {
      this.analyses = [...MOCK_ANALYSES];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.analyses));
    } catch {
      // LocalStorage error fallback
    }
  }

  public async getRecentAnalyses(): Promise<Analysis[]> {
    if (apiClient.getMockStatus()) {
      return Promise.resolve(JSON.parse(JSON.stringify(this.analyses)));
    }
    return apiClient.get<Analysis[]>('/api/v1/analyses');
  }

  public async getAnalysisById(id: string): Promise<Analysis | null> {
    if (apiClient.getMockStatus()) {
      const found = this.analyses.find((a) => a.id === id);
      return Promise.resolve(found ? JSON.parse(JSON.stringify(found)) : null);
    }
    return apiClient.get<Analysis>(`/api/v1/analyses/${id}`);
  }

  public async createAnalysis(payload: {
    input: AnalysisInput;
    query: { text: string; task: TaskType };
    modelId?: string;
  }): Promise<{ analysis_id: string; status: string; analysis: Analysis }> {
    if (apiClient.getMockStatus()) {
      const newId = `ANL-2024-${Math.floor(1000 + Math.random() * 9000)}`;
      const selectedModel = MOCK_MODELS.find((m) => m.id === payload.modelId) || MOCK_MODELS[0];
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      const isVqa = payload.query.task === 'vqa';
      const isLandCover = payload.query.text.toLowerCase().includes('land-cover') ||
                          payload.query.text.toLowerCase().includes('land cover');
      const isMaritime = payload.query.text.toLowerCase().includes('vessel') ||
                         payload.query.text.toLowerCase().includes('cargo') ||
                         payload.query.text.toLowerCase().includes('port');

      let summaryText = '';
      let rawAnswerText = '';
      let findingsList: string[] = [];

      if (isLandCover) {
        summaryText = 'Multi-class land-cover assessment resolved via Qwen2.5-VL multimodal visual question answering.';
        rawAnswerText = `The main land-cover types visible in this image include:

1. **Forested Areas**: The dark green regions indicate dense forest canopy and tidal mangrove complexes.
2. **Water Bodies**: Major estuarine channels and ocean inlets, visible with distinct sediment-rich turbidity gradients.
3. **Urban or Developed Areas**: Lighter reflectance patches along riverbanks, indicating rural settlements and infrastructure.
4. **Dense Vegetation**: Inland vegetation and agricultural clearings displaying high vegetative index.

The exact boundaries and specific types of these land-cover types vary depending on the scale and resolution of the image.`;
        findingsList = [
          'Forested Areas: Dense mangrove and tidal forest canopies dominant along the delta coastline.',
          'Water Bodies: Extensive estuarine channels displaying distinct sediment gradients.',
          'Urban / Developed Patches: Settlement clusters and road clearings along waterways.',
          'Dense Vegetation: High chlorophyll spectral response throughout the inland drainage basin.'
        ];
      } else if (isMaritime) {
        summaryText = 'High-density maritime activity identified. Cargo transport vessels and shoreline berths assessed.';
        rawAnswerText = 'Maritime port assessment indicates active vessel navigation and dock facility utilization. Estuarine sediment runoff extends into the channel fairway with marked turbidity delineation.';
        findingsList = [
          'Active vessel operations and docked vessels detected in shipping corridor.',
          'Sediment dispersion plume traceable from estuarine mouth offshore.',
          'Optical true-color bands provide clear surface reflectance.'
        ];
      } else {
        summaryText = `Analytical response for query "${payload.query.text}". Visual evidence extracted from remote sensing scene.`;
        rawAnswerText = `Based on the multispectral analysis of the submitted scene:

1. **Target Feature Identification**: Surface features consistent with the prompt "${payload.query.text}" were evaluated.
2. **Spatial Distribution**: Observable patterns reflect natural terrain, hydrological boundaries, and surface reflectance characteristics.
3. **Observation Quality**: Scene resolution (${payload.input.metadata.resolutionMeters ? `${payload.input.metadata.resolutionMeters}m GSD` : 'Standard'}) allows clear macro-level feature discrimination.`;
        findingsList = [
          `Query "${payload.query.text}" evaluated against spectral bands.`,
          'Features correlated with remote sensing imagery characteristics.',
          'Inference simulated using Qwen2.5-VL-3B-Instruct model pipeline.'
        ];
      }

      // Initial queued analysis object
      const initialAnalysis: Analysis = {
        id: newId,
        title: payload.query.text.length > 45 ? payload.query.text.slice(0, 42) + '...' : payload.query.text,
        status: 'queued',
        progress: 5,
        currentStage: 'UPLOAD RECEIVED',
        enclaveCrs: payload.input.metadata.coordinates?.crs || 'EPSG 4326',
        query: payload.query,
        input: payload.input,
        model: selectedModel,
        results: {
          summary: summaryText,
          rawAnswer: rawAnswerText,
          findings: findingsList,
          detections: [],
          segments: [],
          visualizations: [
            {
              id: 'v1',
              type: 'original',
              label: 'Base Optical Scene',
              badge: 'OPTICAL',
              visible: true,
              opacity: 100,
              imageUrl: payload.input.imageUrl
            }
          ],
          metrics: {
            runtimeMs: 2450,
            confidenceLabel: isVqa ? 'Not calibrated (Demo)' : 'Demo confidence',
            cloudOcclusionPercent: payload.input.metadata.cloudCoveragePercent || 0.0
          }
        },
        trace: {
          inputCount: 1,
          task: payload.query.task,
          model: selectedModel.name,
          status: 'queued',
          runtimeSeconds: 0,
          confidenceNote: 'Not calibrated (Demo inference)',
          evidenceNote: 'Multimodal vision-language spatial feature attention',
          stages: []
        },
        createdAt: now,
        updatedAt: now
      };

      // Add to beginning of array
      this.analyses.unshift(initialAnalysis);
      this.saveToStorage();

      // Start asynchronous mock progression in background
      this.simulateAsyncProgression(newId, payload.query.task, selectedModel.name);

      return Promise.resolve({
        analysis_id: newId,
        status: 'queued',
        analysis: initialAnalysis
      });
    }

    const res = await apiClient.post<Analysis>('/api/v1/analyses', payload);
    return {
      analysis_id: res.id,
      status: res.status,
      analysis: res
    };
  }

  private simulateAsyncProgression(analysisId: string, taskName: string, modelName: string) {
    let currentStep = 0;
    const accumulatedStages: ExecutionTraceItem[] = [];
    const startTime = Date.now();

    const advance = () => {
      if (currentStep >= STAGES.length) {
        // Complete the analysis
        const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
        const index = this.analyses.findIndex((a) => a.id === analysisId);
        if (index !== -1) {
          const item = this.analyses[index];
          item.status = 'completed';
          item.progress = 100;
          item.currentStage = 'RESULT READY';
          item.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
          if (item.trace) {
            item.trace.status = 'completed';
            item.trace.runtimeSeconds = parseFloat(totalDuration);
            item.trace.stages = accumulatedStages;
          }
          this.saveToStorage();
        }
        return;
      }

      const stageInfo = STAGES[currentStep];
      const stepStartTime = Date.now();

      const index = this.analyses.findIndex((a) => a.id === analysisId);
      if (index !== -1) {
        this.analyses[index].status = 'processing';
        this.analyses[index].progress = stageInfo.progress;
        this.analyses[index].currentStage = stageInfo.stage;
        this.saveToStorage();
      }

      setTimeout(() => {
        const stepDuration = Date.now() - stepStartTime;
        const stageDetail = stageInfo.stage === 'MODEL INFERENCE'
          ? `Inference executed using ${modelName} for ${taskName}`
          : stageInfo.stage === 'MODEL SELECTION'
          ? `Selected target model: ${modelName}`
          : `Processed stage: ${stageInfo.stage}`;

        accumulatedStages.push({
          stage: stageInfo.stage,
          timestamp: new Date().toLocaleTimeString(),
          durationMs: stepDuration,
          status: 'completed',
          details: stageDetail
        });

        currentStep++;
        advance();
      }, stageInfo.delayMs);
    };

    setTimeout(advance, 150);
  }
}

export const analysisService = new AnalysisService();
