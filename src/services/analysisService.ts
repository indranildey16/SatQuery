import type { 
  Analysis, 
  AnalysisInput, 
  TaskType, 
  ExecutionTraceItem,
  CreateAnalysisPayload 
} from '../types';
import { MOCK_ANALYSES } from '../mocks/analysisMocks';
import { MOCK_MODELS } from '../mocks/modelMocks';
import { apiClient } from './apiClient';

const STORAGE_KEY = 'satquery_analyses';

const STAGES = [
  { stage: 'UPLOAD RECEIVED', delayMs: 250, progress: 12 },
  { stage: 'IMAGE VALIDATION', delayMs: 350, progress: 24 },
  { stage: 'MODALITY RESOLUTION', delayMs: 300, progress: 36 },
  { stage: 'QUERY INTERPRETATION', delayMs: 300, progress: 48 },
  { stage: 'MODEL SELECTION', delayMs: 250, progress: 60 },
  { stage: 'MODEL INFERENCE', delayMs: 650, progress: 78 },
  { stage: 'RESULT PROCESSING', delayMs: 400, progress: 90 },
  { stage: 'RESULT READY', delayMs: 200, progress: 100 }
];

const CHANGE_STAGES = [
  { stage: 'INPUT RECEIVED', delayMs: 150, progress: 12 },
  { stage: 'IMAGE VALIDATION', delayMs: 200, progress: 24 },
  { stage: 'IMAGE ALIGNMENT', delayMs: 250, progress: 36 },
  { stage: 'CHANGE ESTIMATION', delayMs: 350, progress: 50 },
  { stage: 'MASK PROCESSING', delayMs: 300, progress: 65 },
  { stage: 'REGION EXTRACTION', delayMs: 300, progress: 78 },
  { stage: 'VISUALIZATION GENERATION', delayMs: 300, progress: 88 },
  { stage: 'RESULT NORMALIZATION', delayMs: 250, progress: 95 },
  { stage: 'RESULT READY', delayMs: 150, progress: 100 }
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
      // Ignore storage errors in sandbox
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

    // REAL API MODE: Fetch from FastAPI backend
    const raw = await apiClient.get<any>(`/api/v1/analyses/${id}`);
    if (!raw) return null;

    // Normalizing response: backend returns status progression during processing
    if (raw.status === 'queued' || raw.status === 'processing') {
      const stageName = raw.currentStage || raw.stage || 'UPLOAD_RECEIVED';
      return {
        id: raw.analysis_id || raw.id || id,
        title: raw.title || raw.query?.text || 'Satellite Imagery Analysis Pipeline',
        status: raw.status,
        progress: raw.progress ?? 12,
        currentStage: stageName,
        enclaveCrs: raw.enclaveCrs || 'EPSG:4326 (WGS 84)',
        query: raw.query || { text: 'Remote-Sensing Inquiry', task: 'vqa' },
        input: raw.input || {
          imageUrl: '/samples/guinea-bissau-sample.jpg',
          metadata: {
            filename: 'satellite_scene.jpg',
            width: 3840,
            height: 3840,
            format: 'image/jpeg',
            fileSizeBytes: 5099039,
            modality: 'optical'
          }
        },
        model: raw.model || {
          id: 'qwen2.5-vl-3b',
          name: 'Qwen2.5-VL-3B-Instruct',
          version: '2.5',
          modality: ['optical', 'auto'],
          tasks: ['vqa', 'captioning', 'scene_understanding'],
          status: 'available',
          environment: 'google-colab',
          description: 'Vision-Language model running single-image VQA.'
        },
        results: raw.results,
        trace: raw.trace,
        createdAt: raw.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: raw.updatedAt || new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
    }

    // When completed, map full analysis
    return {
      id: raw.id || raw.analysis_id || id,
      title: raw.title || 'Remote-Sensing Scene Inspection',
      status: raw.status,
      progress: raw.progress ?? 100,
      currentStage: raw.currentStage || raw.stage || 'RESULT_READY',
      enclaveCrs: raw.enclaveCrs || 'EPSG:4326 (WGS 84)',
      query: raw.query,
      input: raw.input,
      model: raw.model,
      results: raw.results,
      trace: raw.trace,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    };
  }

  public async cancelAnalysis(id: string): Promise<void> {
    if (apiClient.getMockStatus()) {
      const index = this.analyses.findIndex(a => a.id === id);
      if (index !== -1) {
        this.analyses[index].status = 'cancelled';
        this.saveToStorage();
      }
    }
  }

  public async createAnalysis(payload: CreateAnalysisPayload | {
    input: AnalysisInput;
    query: { text: string; task: TaskType };
    modelId?: string;
  }): Promise<{ analysis_id: string; status: string; analysis?: Analysis }> {
    if (apiClient.getMockStatus()) {
      const newId = `ANL-2024-${Math.floor(1000 + Math.random() * 9000)}`;
      const isChange = payload.query.task === 'change_analysis' || 
                       Boolean((payload as any).fileAfter) || 
                       Boolean((payload as any).imageAfterUrl) || 
                       Boolean((payload as any).input?.afterImageUrl) ||
                       payload.query.text.toLowerCase().includes('change');

      const selectedModel = isChange
        ? (MOCK_MODELS.find(m => m.id === 'classical-change-baseline') || {
            id: 'classical-change-baseline',
            name: 'Classical Change Detection Baseline',
            version: 'Baseline v1.0',
            modality: ['optical', 'auto'],
            tasks: ['change_analysis'],
            status: 'available',
            environment: 'FastAPI Computational Specialist',
            description: 'Deterministic pixel differencing baseline.',
            isDemo: false
          })
        : (MOCK_MODELS.find((m) => m.id === payload.modelId) || MOCK_MODELS[0]);

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
      let changeStatsObj: any = undefined;
      let changedRegionsList: any = undefined;
      let visLayers: any = [];

      if (isChange) {
        summaryText = 'The baseline detected 4 spatially distinct changed regions, covering approximately 2.4% of the analyzed image (17,664 changed pixels out of 735,933 total valid pixels). The largest contiguous changed region encompasses 6,442 pixels.';
        rawAnswerText = `${summaryText}\n\nNote: The baseline detects image-level spatial differences. It does not establish the semantic cause of change (such as construction, flooding, or deforestation), which requires domain-specific remote-sensing models or multi-temporal calibration.`;
        findingsList = [
          'Detected 4 distinct changed spatial regions via pixel differencing.',
          'Total changed surface footprint covers 2.4% (17,664 pixels) of working resolution.',
          'Largest contiguous change zone measures 6,442 pixels.',
          'Observation represents image-level spatial change without inferring unverified semantic causes.'
        ];
        changeStatsObj = {
          changedPixelCount: 17664,
          totalValidPixelCount: 735933,
          changePercentage: 2.4,
          changedRegionCount: 4,
          largestRegionArea: 6442,
          largestRegionBbox: [310, 510, 391, 622],
          method: {
            type: 'pixel_difference_baseline',
            threshold: 35.0,
            minAreaPixels: 30,
            metric: 'Euclidean RGB Delta with Morphological Cleaning',
            workingDimensions: [957, 769]
          }
        };
        changedRegionsList = [
          { id: 'R-01', pixelArea: 6442, relativeAreaPercent: 0.875, bbox: [310, 510, 391, 622], bboxXywh: [510, 310, 112, 81], centroid: [565.0, 350.1] },
          { id: 'R-02', pixelArea: 5120, relativeAreaPercent: 0.696, bbox: [120, 200, 210, 310], bboxXywh: [200, 120, 110, 90], centroid: [255.0, 165.0] },
          { id: 'R-03', pixelArea: 3850, relativeAreaPercent: 0.523, bbox: [450, 600, 520, 680], bboxXywh: [600, 450, 80, 70], centroid: [640.0, 485.0] },
          { id: 'R-04', pixelArea: 2252, relativeAreaPercent: 0.306, bbox: [50, 400, 95, 460], bboxXywh: [400, 50, 60, 45], centroid: [430.0, 72.5] }
        ];
        visLayers = [
          {
            id: 'layer-before',
            type: 'before',
            label: 'Base Before (Scene)',
            badge: 'BEFORE',
            visible: true,
            opacity: 100,
            imageUrl: '/samples/bitemporal_before.jpg'
          },
          {
            id: 'layer-after',
            type: 'after',
            label: 'Base After (Scene)',
            badge: 'AFTER',
            visible: true,
            opacity: 100,
            imageUrl: '/samples/bitemporal_after.jpg'
          },
          {
            id: 'layer-mask',
            type: 'change_mask',
            label: 'Binary Change Mask',
            badge: 'MASK',
            visible: true,
            opacity: 85,
            imageUrl: '/samples/bitemporal_after.jpg'
          },
          {
            id: 'layer-overlay',
            type: 'change_overlay',
            label: 'Change Detection Baseline',
            badge: 'OVERLAY',
            visible: true,
            opacity: 85,
            imageUrl: '/samples/bitemporal_after.jpg'
          }
        ];
      } else if (isLandCover) {
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
        visLayers = [
          {
            id: 'v1',
            type: 'original',
            label: 'Base Optical Scene',
            badge: 'OPTICAL',
            visible: true,
            opacity: 100,
            imageUrl: ('imageUrl' in payload && payload.imageUrl) || '/samples/guinea-bissau-sample.jpg'
          }
        ];
      } else if (isMaritime) {
        summaryText = 'High-density maritime activity identified. Cargo transport vessels and shoreline berths assessed.';
        rawAnswerText = 'Maritime port assessment indicates active vessel navigation and dock facility utilization. Estuarine sediment runoff extends into the channel fairway with marked turbidity delineation.';
        findingsList = [
          'Active vessel operations and docked vessels detected in shipping corridor.',
          'Sediment dispersion plume traceable from estuarine mouth offshore.',
          'Optical true-color bands provide clear surface reflectance.'
        ];
        visLayers = [
          {
            id: 'v1',
            type: 'original',
            label: 'Base Optical Scene',
            badge: 'OPTICAL',
            visible: true,
            opacity: 100,
            imageUrl: ('imageUrl' in payload && payload.imageUrl) || '/samples/guinea-bissau-sample.jpg'
          }
        ];
      } else {
        summaryText = `Analytical response for query "${payload.query.text}". Visual evidence extracted from remote sensing scene.`;
        rawAnswerText = `Based on the multispectral analysis of the submitted scene:

1. **Target Feature Identification**: Surface features consistent with the prompt "${payload.query.text}" were evaluated.
2. **Spatial Distribution**: Observable patterns reflect natural terrain, hydrological boundaries, and surface reflectance characteristics.
3. **Observation Quality**: Visual features extracted cleanly from the remote sensing scene.`;
        findingsList = [
          'Target Feature: Spectral signatures correlated with user query.',
          'Hydrology: Coastal and fluvial boundaries delineated.',
          'Vegetation: Reflectance typical for regional ecosystem.'
        ];
        visLayers = [
          {
            id: 'v1',
            type: 'original',
            label: 'Base Optical Scene',
            badge: 'OPTICAL',
            visible: true,
            opacity: 100,
            imageUrl: ('imageUrl' in payload && payload.imageUrl) || '/samples/guinea-bissau-sample.jpg'
          }
        ];
      }

      const imgUrl = ('imageUrl' in payload && payload.imageUrl) || 
                     ('input' in payload && payload.input?.imageUrl) || 
                     (isChange ? '/samples/bitemporal_before.jpg' : '/samples/guinea-bissau-sample.jpg');
      const imgAfterUrl = ('imageAfterUrl' in payload && (payload as any).imageAfterUrl) || 
                          ('input' in payload && (payload as any).input?.afterImageUrl) || 
                          (isChange ? '/samples/bitemporal_after.jpg' : undefined);

      const meta = ('metadata' in payload && payload.metadata) || 
                   ('input' in payload && payload.input?.metadata) || {
                     filename: isChange ? 'Maritime_Port_Temporal_Pair.tif' : 'Earth_from_Space_Guinea-Bissau.jpg',
                     width: isChange ? 957 : 3840,
                     height: isChange ? 769 : 3840,
                     format: 'image/jpeg',
                     fileSizeBytes: 5099039,
                     modality: 'optical' as const
                   };

      const inputObj: AnalysisInput = {
        imageUrl: imgUrl,
        beforeImageUrl: imgUrl,
        afterImageUrl: imgAfterUrl,
        imageAfterUrl: imgAfterUrl,
        metadata: {
          filename: meta.filename || (isChange ? 'bitemporal_pair.jpg' : 'satellite_scene.jpg'),
          width: meta.width || (isChange ? 957 : 3840),
          height: meta.height || (isChange ? 769 : 3840),
          format: meta.format || 'image/jpeg',
          fileSizeBytes: meta.fileSizeBytes || 5099039,
          modality: meta.modality || 'optical',
          satellite: meta.satellite || (isChange ? 'Sentinel-2 Bi-Temporal' : 'Copernicus Sentinel-2'),
          sensor: meta.sensor || 'MSI Multispectral',
          acquisitionDate: meta.acquisitionDate || '2026-09-18 10:15 UTC',
          resolutionMeters: meta.resolutionMeters || 10.0,
          cloudCoveragePercent: meta.cloudCoveragePercent || 0.0,
          coordinates: meta.coordinates || { lat: 22.3326, lng: 114.1881, crs: 'EPSG 4326' }
        }
      };

      // Initial queued analysis object
      const initialAnalysis: Analysis = {
        id: newId,
        title: payload.query.text.length > 45 ? payload.query.text.slice(0, 42) + '...' : payload.query.text,
        status: 'queued',
        progress: 5,
        currentStage: 'UPLOAD RECEIVED',
        enclaveCrs: inputObj.metadata.coordinates?.crs || 'EPSG 4326',
        query: {
          text: payload.query.text,
          task: isChange ? 'change_analysis' : payload.query.task
        },
        input: inputObj,
        model: selectedModel,
        results: {
          summary: summaryText,
          rawAnswer: rawAnswerText,
          findings: findingsList,
          detections: [],
          segments: [],
          visualizations: visLayers,
          changeAnalysis: changeStatsObj,
          changedRegions: changedRegionsList,
          metrics: {
            runtimeMs: isChange ? 1850 : 2450,
            confidenceLabel: isChange ? 'Deterministic Baseline' : (isVqa ? 'Not calibrated (Demo)' : 'Demo confidence'),
            cloudOcclusionPercent: inputObj.metadata.cloudCoveragePercent || 0.0
          }
        },
        trace: {
          inputCount: isChange ? 2 : 1,
          task: isChange ? 'Bi-temporal Change Analysis' : payload.query.task,
          router: 'Rule-Based Query Router',
          routerReason: isChange ? 'Bi-temporal imagery change query' : 'Default task route',
          model: selectedModel.name,
          inference: isChange ? 'FastAPI Computational Specialist' : 'Mock',
          status: 'queued',
          runtimeSeconds: 0,
          confidenceNote: isChange ? 'Spatial change computed algorithmically.' : 'Not calibrated (Demo inference)',
          evidenceNote: isChange ? 'Observations derived via pixel-difference baseline.' : 'Multimodal vision-language spatial feature attention',
          stages: []
        },
        createdAt: now,
        updatedAt: now
      };

      // Add to beginning of array
      this.analyses.unshift(initialAnalysis);
      this.saveToStorage();

      // Start asynchronous mock progression in background
      this.simulateAsyncProgression(newId, isChange ? 'change_analysis' : payload.query.task, selectedModel.name);

      return Promise.resolve({
        analysis_id: newId,
        status: 'queued',
        analysis: initialAnalysis
      });
    }

    // REAL API MODE:
    const formData = new FormData();

    // 1. Resolve primary image file (before image)
    let imageFile: File | Blob | null = ('file' in payload && payload.file) ? payload.file : null;
    let fileName = ('metadata' in payload && payload.metadata?.filename) || 
                   ('input' in payload && payload.input?.metadata?.filename) || 
                   'satellite_scene.jpg';

    if (!imageFile) {
      const urlToFetch = ('imageUrl' in payload && payload.imageUrl) || 
                         ('input' in payload && payload.input?.imageUrl);
      if (urlToFetch) {
        try {
          const resp = await fetch(urlToFetch);
          imageFile = await resp.blob();
        } catch (fetchErr) {
          console.error('Failed to resolve sample image URL to blob:', fetchErr);
        }
      }
    }

    if (!imageFile) {
      throw new Error('Please select or upload a satellite image file.');
    }

    formData.append('image', imageFile, fileName);

    // 1b. Resolve secondary image file (after image for change analysis)
    let afterFile: File | Blob | null = ('fileAfter' in payload && (payload as any).fileAfter) ? (payload as any).fileAfter : null;
    let afterFileName = 'after_scene.jpg';

    if (!afterFile) {
      const afterUrl = ('imageAfterUrl' in payload && (payload as any).imageAfterUrl) ||
                       ('input' in payload && (payload as any).input?.afterImageUrl);
      if (afterUrl) {
        try {
          const resp = await fetch(afterUrl);
          afterFile = await resp.blob();
        } catch (fetchErr) {
          console.error('Failed to resolve sample after-image URL to blob:', fetchErr);
        }
      }
    }

    if (afterFile) {
      formData.append('image_before', imageFile, fileName);
      formData.append('image_after', afterFile, afterFileName);
    }

    // 2. Query
    const queryText = payload.query.text;
    formData.append('query', queryText);

    // 3. Modality
    const modality = ('modality' in payload && payload.modality) || 
                     ('input' in payload && payload.input?.metadata?.modality) || 
                     'auto';
    formData.append('modality', modality);

    // 4. Task
    const task = payload.query.task || 'auto';
    formData.append('task', task);

    // 5. Model Selection Mode & Model ID
    const modelSelectionMode = ('modelSelectionMode' in payload && payload.modelSelectionMode) || 'auto';
    formData.append('model_selection_mode', modelSelectionMode);

    if (payload.modelId) {
      formData.append('model_id', payload.modelId);
    }

    if ('projectId' in payload && payload.projectId) {
      formData.append('project_id', payload.projectId);
    }

    const res = await apiClient.postFormData<{ analysis_id: string; status: string }>('/api/v1/analyses', formData);
    return {
      analysis_id: res.analysis_id,
      status: res.status
    };
  }

  private simulateAsyncProgression(analysisId: string, taskName: string, modelName: string) {
    const isChange = taskName === 'change_analysis' || modelName.includes('Change');
    const stageList = isChange ? CHANGE_STAGES : STAGES;
    let currentStep = 0;
    const accumulatedStages: ExecutionTraceItem[] = [];
    const startTime = Date.now();

    const advance = () => {
      if (currentStep >= stageList.length) {
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

      const stageInfo = stageList[currentStep];
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
        const stageDetail = stageInfo.stage === 'CHANGE ESTIMATION'
          ? 'Computing Euclidean RGB pixel differences and intensity thresholding'
          : stageInfo.stage === 'MODEL INFERENCE'
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
