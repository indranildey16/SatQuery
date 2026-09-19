export type Modality = 'optical' | 'sar' | 'auto';

export type TaskType = 
  | 'vqa' 
  | 'captioning' 
  | 'detection' 
  | 'segmentation' 
  | 'scene_understanding' 
  | 'change_analysis' 
  | 'custom';

export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ImageryMetadata {
  filename: string;
  width: number;
  height: number;
  format: string;
  fileSizeBytes: number;
  modality: Modality;
  satellite?: string;
  sensor?: string;
  acquisitionDate?: string;
  resolutionMeters?: number;
  cloudCoveragePercent?: number;
  coordinates?: {
    lat: number;
    lng: number;
    crs?: string;
  };
}

export interface AnalysisInput {
  imageId?: string;
  imageUrl: string;
  metadata: ImageryMetadata;
}

export interface Detection {
  id: string;
  label: string;
  confidence?: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  metrics?: Record<string, string | number>;
}

export interface Segment {
  id: string;
  label: string;
  color: string;
  areaKm2?: number;
  confidence?: number;
  visible?: boolean;
}

export interface VisualizationLayer {
  id: string;
  type: 'original' | 'overlay' | 'segmentation' | 'bounding_boxes' | 'heatmap' | 'sar_fusion';
  label: string;
  badge?: string;
  visible: boolean;
  opacity: number;
  imageUrl?: string;
  data?: unknown;
}

export interface ExecutionTraceItem {
  stage: string;
  timestamp: string;
  durationMs: number;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  details?: string;
}

export interface ExecutionTrace {
  inputCount: number;
  task: string;
  model: string;
  status: AnalysisStatus;
  runtimeSeconds: number;
  confidenceNote: string;
  evidenceNote: string;
  stages: ExecutionTraceItem[];
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  modality: Modality[];
  tasks: TaskType[];
  status: 'available' | 'unavailable' | 'loading' | 'maintenance';
  environment: string;
  description: string;
  isDemo?: boolean;
}

export interface AnalysisResultData {
  summary: string;
  rawAnswer?: string;
  findings: string[];
  detections: Detection[];
  segments: Segment[];
  visualizations: VisualizationLayer[];
  geojson?: unknown | null;
  metrics?: {
    runtimeMs: number;
    confidenceScore?: number;
    confidenceLabel?: string;
    detectedVessels?: number;
    dockFootprintKm2?: number;
    sedimentPlumeKm2?: number;
    cloudOcclusionPercent?: number;
    ndwiIndex?: number;
  };
}

export interface Analysis {
  id: string;
  title: string;
  status: AnalysisStatus;
  progress?: number;
  currentStage?: string;
  enclaveCrs?: string;
  query: {
    text: string;
    task: TaskType;
  };
  input: AnalysisInput;
  model: ModelInfo;
  results?: AnalysisResultData;
  trace?: ExecutionTrace;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnalysisPayload {
  file?: File | Blob | null;
  imageUrl?: string;
  query: {
    text: string;
    task: TaskType;
  };
  modality?: Modality;
  modelSelectionMode?: 'auto' | 'manual';
  modelId?: string;
  projectId?: string;
  metadata?: Partial<ImageryMetadata>;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  analysisCount: number;
  lastUpdated: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
