import type { Analysis } from '../types';
import { MOCK_MODELS } from './modelMocks';

export const MOCK_ANALYSES: Analysis[] = [
  {
    id: 'ANL-2024-8841',
    title: 'Urban Maritime Port Assessment',
    status: 'completed',
    enclaveCrs: 'EPSG 32650',
    query: {
      text: 'Identify all cargo shipping vessels, maritime dock infrastructure, and analyze sediment plume dispersion.',
      task: 'detection'
    },
    input: {
      imageUrl: '/samples/guinea-bissau-sample.jpg',
      metadata: {
        filename: 'Sentinel2_Maritime_Bay_L2A.tif',
        width: 3840,
        height: 3840,
        format: 'GeoTIFF / PNG',
        fileSizeBytes: 14280000,
        modality: 'optical',
        satellite: 'Sentinel-2A',
        sensor: 'MSI Multispectral',
        acquisitionDate: '2026-09-12 10:44 UTC',
        resolutionMeters: 0.8,
        cloudCoveragePercent: 0.0,
        coordinates: {
          lat: 22.3326,
          lng: 114.1881,
          crs: 'WGS 84 / UTM 18N'
        }
      }
    },
    model: MOCK_MODELS[1],
    results: {
      summary: 'High-density maritime port activity identified. 28 cargo vessels actively docked or navigating the delta channel fairway. Severe estuarine sediment runoff plume extends 3.8 km offshore with clear thermal & reflectance demarcation.',
      findings: [
        '28 cargo vessels actively docked or navigating the delta fairway.',
        'Dock footprint calculated at 4.62 km² across 3 active deep-water berths.',
        'Estuarine sediment runoff plume extends 3.8 km offshore with elevated turbidity (+12%).',
        'Optical spectrum clear of cloud occlusion (0.00% coverage).'
      ],
      detections: [
        {
          id: 'DET-01',
          label: 'Container Vessel',
          confidence: 0.96,
          bbox: [1420, 890, 180, 75],
          metrics: { length: '184m', heading: '134°' }
        },
        {
          id: 'DET-02',
          label: 'Panamax Bulk Carrier',
          confidence: 0.94,
          bbox: [2180, 1420, 228, 58],
          metrics: { length: '228m', status: 'Anchored' }
        },
        {
          id: 'DET-03',
          label: 'Gantry Crane Terminal',
          confidence: 0.91,
          bbox: [840, 610, 318, 180],
          metrics: { area: '55,800 m²' }
        },
        {
          id: 'DET-04',
          label: 'Harbor Tug / Pilot Vessel',
          confidence: 0.88,
          bbox: [1840, 990, 65, 30],
          metrics: { length: '38m', heading: '82°' }
        }
      ],
      segments: [
        { id: 'SEG-01', label: 'Base Optical (10m TrueColor)', color: '#38bdf8', visible: true },
        { id: 'SEG-02', label: 'YOLOv8 Vessels & Cranes (28 BBOX)', color: '#ea580c', visible: true },
        { id: 'SEG-03', label: 'Sediment & Docks Mask (SEM-SEG)', color: '#10b981', areaKm2: 7.15, visible: true },
        { id: 'SEG-04', label: 'Feature Attention Heatmap', color: '#f59e0b', visible: false },
        { id: 'SEG-05', label: 'SAR C-Band Synthetic Fusion', color: '#8b5cf6', visible: false }
      ],
      visualizations: [
        { id: 'v1', type: 'original', label: 'Base Optical (10m TrueColor)', badge: 'RAW OPTICAL', visible: true, opacity: 100 },
        { id: 'v2', type: 'bounding_boxes', label: 'YOLOv8 Vessels & Cranes', badge: '28 BBOX', visible: true, opacity: 90 },
        { id: 'v3', type: 'segmentation', label: 'Sediment & Docks Mask', badge: 'SEM-SEG', visible: true, opacity: 85 }
      ],
      metrics: {
        runtimeMs: 2180,
        confidenceScore: 0.942,
        confidenceLabel: 'CONF: 94.2%',
        detectedVessels: 28,
        dockFootprintKm2: 4.62,
        sedimentPlumeKm2: 7.15,
        cloudOcclusionPercent: 0.0,
        ndwiIndex: 0.48
      }
    },
    trace: {
      inputCount: 1,
      task: 'Object Detection & Segmentation',
      model: 'DeepLabV3+ & S2-YOLOv8 (Optical v2.4.1)',
      status: 'completed',
      runtimeSeconds: 2.18,
      confidenceNote: 'Demo / Calibrated Pipeline',
      evidenceNote: 'Multispectral feature alignment & bounding box instance validation',
      stages: [
        { stage: 'UPLOAD RECEIVED', timestamp: '10:44:01', durationMs: 120, status: 'completed' },
        { stage: 'IMAGE VALIDATION', timestamp: '10:44:01', durationMs: 80, status: 'completed' },
        { stage: 'MODALITY RESOLUTION', timestamp: '10:44:01', durationMs: 60, status: 'completed' },
        { stage: 'QUERY INTERPRETATION', timestamp: '10:44:01', durationMs: 140, status: 'completed' },
        { stage: 'MODEL INFERENCE', timestamp: '10:44:02', durationMs: 1320, status: 'completed' },
        { stage: 'RESULT PROCESSING', timestamp: '10:44:03', durationMs: 340, status: 'completed' },
        { stage: 'RESULT READY', timestamp: '10:44:03', durationMs: 120, status: 'completed' }
      ]
    },
    createdAt: '2026-09-18 10:44:00',
    updatedAt: '2026-09-18 10:44:03'
  },
  {
    id: 'ANL-2024-8842',
    title: 'Guinea-Bissau Land-Cover VQA',
    status: 'completed',
    enclaveCrs: 'EPSG 4326',
    query: {
      text: 'What are the main land-cover types visible in this image?',
      task: 'vqa'
    },
    input: {
      imageUrl: '/samples/guinea-bissau-sample.jpg',
      metadata: {
        filename: 'Earth_from_Space_Guinea-Bissau.jpg',
        width: 3840,
        height: 3840,
        format: 'JPEG',
        fileSizeBytes: 5099033,
        modality: 'optical',
        satellite: 'Copernicus Sentinel-2',
        sensor: 'MSI',
        acquisitionDate: '2026-09-18 10:15 UTC',
        resolutionMeters: 10.0,
        cloudCoveragePercent: 0.05,
        coordinates: {
          lat: 11.8037,
          lng: -15.1804,
          crs: 'WGS 84'
        }
      }
    },
    model: MOCK_MODELS[0],
    results: {
      summary: 'The main land-cover types visible in this image include forested coastal estuaries, tidal mangrove networks, sediment-rich brackish river inlets, and interspersed savanna/developed clearings.',
      findings: [
        'Forested Areas: Dense coastal forest cover and mangrove systems dominant along the delta coastline.',
        'Water Bodies: Extensive estuarine water channels and ocean inlets displaying sediment transition gradients.',
        'Urban / Developed Clearings: Lighter reflectance patches indicating settlement centers and regional road corridors.',
        'Dense Vegetation & Wetlands: High chlorophyll spectral response throughout the inland drainage basin.'
      ],
      detections: [],
      segments: [],
      visualizations: [
        { id: 'v1', type: 'original', label: 'Base Satellite Scene', badge: 'OPTICAL', visible: true, opacity: 100 }
      ],
      metrics: {
        runtimeMs: 3410,
        confidenceScore: 0.91,
        confidenceLabel: 'Calibrated VQA',
        cloudOcclusionPercent: 0.05
      }
    },
    trace: {
      inputCount: 1,
      task: 'Single-image VQA',
      model: 'Qwen2.5-VL-3B-Instruct',
      status: 'completed',
      runtimeSeconds: 3.41,
      confidenceNote: 'Colab Verified Output',
      evidenceNote: 'Multimodal vision-language spatial feature attention',
      stages: [
        { stage: 'UPLOAD RECEIVED', timestamp: '10:15:00', durationMs: 110, status: 'completed' },
        { stage: 'IMAGE VALIDATION', timestamp: '10:15:00', durationMs: 95, status: 'completed' },
        { stage: 'MODALITY RESOLUTION', timestamp: '10:15:00', durationMs: 50, status: 'completed' },
        { stage: 'QUERY INTERPRETATION', timestamp: '10:15:01', durationMs: 160, status: 'completed' },
        { stage: 'MODEL INFERENCE', timestamp: '10:15:01', durationMs: 2700, status: 'completed' },
        { stage: 'RESULT READY', timestamp: '10:15:03', durationMs: 120, status: 'completed' }
      ]
    },
    createdAt: '2026-09-18 10:15:00',
    updatedAt: '2026-09-18 10:15:03'
  }
];
