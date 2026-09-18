import type { ModelInfo } from '../types';

export const MOCK_MODELS: ModelInfo[] = [
  {
    id: 'qwen2.5-vl-3b',
    name: 'Qwen2.5-VL-3B-Instruct',
    version: 'v2.5-Colab',
    modality: ['optical', 'auto'],
    tasks: ['vqa', 'captioning', 'scene_understanding'],
    status: 'available',
    environment: 'Demo / Google Colab T4 Tensor',
    description: 'Demonstrated Vision-Language model running single-image VQA & scene understanding.',
    isDemo: true
  },
  {
    id: 'deeplab-yolov8-fusion',
    name: 'DeepLabV3+ & S2-YOLOv8',
    version: 'Optical v2.4.1',
    modality: ['optical'],
    tasks: ['detection', 'segmentation'],
    status: 'available',
    environment: 'PyTorch Colab-Ready T4',
    description: 'Dual pipeline for marine infrastructure segmentation & high-resolution vessel bounding boxes.',
    isDemo: true
  },
  {
    id: 'sar-sentinel1-detector',
    name: 'Sentinel-1 C-Band SAR Feature Extractor',
    version: 'SAR v1.2',
    modality: ['sar'],
    tasks: ['detection', 'change_analysis'],
    status: 'loading',
    environment: 'Cloud Inference Server',
    description: 'Synthetic Aperture Radar amplitude & coherence detector for all-weather monitoring.',
    isDemo: true
  }
];
