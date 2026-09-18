import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  CheckCircle2, 
  Play, 
  Eye, 
  Sparkles, 
  Database,
  AlertCircle,
  X
} from 'lucide-react';
import type { Modality, TaskType, ImageryMetadata } from '../types';
import { MOCK_MODELS } from '../mocks/modelMocks';
import { analysisService } from '../services/analysisService';

export const NewAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [imagePreview, setImagePreview] = useState<string>('/samples/guinea-bissau-sample.jpg');
  const [metadata, setMetadata] = useState<ImageryMetadata>({
    filename: 'Earth_from_Space_Guinea-Bissau.jpg',
    width: 3840,
    height: 3840,
    format: 'image/jpeg',
    fileSizeBytes: 5099039,
    modality: 'optical',
    satellite: 'Copernicus Sentinel-2',
    sensor: 'MSI Multispectral Instrument',
    acquisitionDate: '2026-09-18 10:15 UTC',
    resolutionMeters: 10.0,
    cloudCoveragePercent: 0.05,
    coordinates: {
      lat: 11.8037,
      lng: -15.1804,
      crs: 'EPSG:4326 (WGS 84)'
    }
  });

  const [modality, setModality] = useState<Modality>('auto');
  const [queryText, setQueryText] = useState<string>(
    'What are the main land-cover types visible in this image?'
  );
  const [taskType, setTaskType] = useState<TaskType>('vqa');
  const [modelMode, setModelMode] = useState<'auto' | 'manual'>('auto');
  const [selectedModelId, setSelectedModelId] = useState<string>(MOCK_MODELS[0].id);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Suggested Technical Queries
  const sampleQueries = [
    { text: 'What are the main land-cover types visible in this image?', task: 'vqa' as TaskType },
    { text: 'Identify all cargo shipping vessels and maritime infrastructure.', task: 'detection' as TaskType },
    { text: 'Describe the scene and major geomorphological features.', task: 'scene_understanding' as TaskType },
    { text: 'Segment built-up urban structures versus vegetation and water.', task: 'segmentation' as TaskType },
    { text: 'Detect recent changes or anomalous clearing along the river banks.', task: 'change_analysis' as TaskType }
  ];

  // Handle Drag & Drop and File Selection
  const handleFileProcess = (file: File) => {
    setErrorMessage(null);
    const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff'];
    const isTiff = file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff');

    if (!validFormats.includes(file.type) && !isTiff) {
      setErrorMessage(`Unsupported format (${file.type || 'unknown'}). Please provide PNG, JPEG, or TIFF remote sensing imagery.`);
      return;
    }

    if (isTiff && file.type === '') {
      // Browser cannot directly render TIFF without specialized WebGL/Canvas reader, notify user
      setErrorMessage('Notice: GeoTIFF metadata accepted. Browser preview will display fallback canvas for unrasterized TIFF.');
    }

    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      setMetadata({
        filename: file.name,
        width: img.width || 2048,
        height: img.height || 2048,
        format: file.type || 'image/tiff',
        fileSizeBytes: file.size,
        modality: modality === 'auto' ? 'optical' : modality,
        satellite: 'User Uploaded Scene',
        sensor: 'Optical RGB / Multispectral',
        acquisitionDate: new Date().toISOString().substring(0, 10),
        resolutionMeters: undefined,
        cloudCoveragePercent: undefined,
        coordinates: undefined
      });
    };
    img.onerror = () => {
      // For TIFF or binary files
      setMetadata({
        filename: file.name,
        width: 3840,
        height: 3840,
        format: 'image/tiff',
        fileSizeBytes: file.size,
        modality: modality === 'auto' ? 'optical' : modality,
        satellite: 'User Uploaded Scene',
        sensor: 'Optical RGB / Multispectral',
        acquisitionDate: new Date().toISOString().substring(0, 10),
        resolutionMeters: undefined,
        cloudCoveragePercent: undefined,
        coordinates: undefined
      });
    };
  };

  const handleSelectSample = (type: 'guinea-bissau' | 'port') => {
    setErrorMessage(null);
    if (type === 'guinea-bissau') {
      setImagePreview('/samples/guinea-bissau-sample.jpg');
      setMetadata({
        filename: 'Earth_from_Space_Guinea-Bissau.jpg',
        width: 3840,
        height: 3840,
        format: 'image/jpeg',
        fileSizeBytes: 5099039,
        modality: 'optical',
        satellite: 'Copernicus Sentinel-2',
        sensor: 'MSI Multispectral Instrument',
        acquisitionDate: '2026-09-18 10:15 UTC',
        resolutionMeters: 10.0,
        cloudCoveragePercent: 0.05,
        coordinates: {
          lat: 11.8037,
          lng: -15.1804,
          crs: 'EPSG:4326 (WGS 84)'
        }
      });
      setQueryText('What are the main land-cover types visible in this image?');
      setTaskType('vqa');
    } else {
      setImagePreview('/samples/port-assessment-reference.jpg');
      setMetadata({
        filename: 'Sentinel2_Maritime_Bay_L2A.tif',
        width: 3840,
        height: 3840,
        format: 'image/jpeg',
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
      });
      setQueryText('Identify all cargo shipping vessels, maritime dock infrastructure, and analyze sediment plume dispersion.');
      setTaskType('detection');
    }
  };

  const handleRunAnalysis = async () => {
    setErrorMessage(null);

    // Validation
    if (!imagePreview) {
      setErrorMessage('Please upload a remote-sensing scene or select a sample image.');
      setCurrentStep(1);
      return;
    }

    if (!queryText.trim()) {
      setErrorMessage('Please enter an analytical question or choose one of the suggested inquiries.');
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);
    try {
      const resolvedModality = modality === 'auto' ? 'optical' : modality;
      const res = await analysisService.createAnalysis({
        input: {
          imageUrl: imagePreview,
          metadata: {
            ...metadata,
            modality: resolvedModality
          }
        },
        query: {
          text: queryText.trim(),
          task: taskType
        },
        modelId: modelMode === 'manual' ? selectedModelId : MOCK_MODELS[0].id
      });

      // Navigate to analysis workspace for live processing progression
      navigate(`/analysis/${res.analysis_id}`);
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to launch analysis pipeline.');
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Imagery' },
    { num: 2, label: 'Modality' },
    { num: 3, label: 'Query' },
    { num: 4, label: 'Model' },
    { num: 5, label: 'Review' }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">New Remote-Sensing Analysis</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-50 text-[#c2410c] border border-orange-200 font-medium">
              PIPELINE SETUP
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure imagery source, analytical query, task constraints, and inference model.
          </p>
        </div>

        {/* Step Progress Pills */}
        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                currentStep === s.num
                  ? 'bg-[#c2410c] text-white'
                  : currentStep > s.num
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="font-mono text-[10px] opacity-80">{s.num}.</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner if validation fails */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Multi-step Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
        {/* Left 7 Columns: Step Configuration */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: IMAGERY UPLOAD */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#c2410c] text-white flex items-center justify-center text-xs font-bold font-mono">
                  1
                </span>
                <h2 className="text-sm font-bold text-slate-900">Remote-Sensing Imagery Source</h2>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-500">Quick Demo Sample:</span>
                <button
                  type="button"
                  onClick={() => handleSelectSample('guinea-bissau')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                >
                  Guinea-Bissau (Sentinel-2)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSample('port')}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                >
                  Maritime Port
                </button>
              </div>
            </div>

            {/* Upload Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files?.[0]) {
                  handleFileProcess(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#c2410c] bg-slate-50/50 hover:bg-orange-50/20 rounded-lg p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileProcess(e.target.files[0]);
                }}
                accept="image/png,image/jpeg,image/tiff,.tif,.tiff"
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#c2410c]">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  Drop GeoTIFF, PNG, or JPEG satellite scenes here
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Supports optical multispectral and SAR C-band products up to 50MB
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: MODALITY SELECTION */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center space-x-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-[#c2410c] text-white flex items-center justify-center text-xs font-bold font-mono">
                2
              </span>
              <h2 className="text-sm font-bold text-slate-900">Sensor Modality</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { 
                  id: 'auto', 
                  title: 'Auto-Detect', 
                  desc: 'DEMO: Resolves to Optical for sample. In real pipeline, resolved by backend metadata.' 
                },
                { 
                  id: 'optical', 
                  title: 'Optical (RGB / MSI)', 
                  desc: 'Visible & near-infrared bands (Sentinel-2, Landsat-9).' 
                },
                { 
                  id: 'sar', 
                  title: 'SAR (Radar)', 
                  desc: 'DEMO / PLANNED: Synthetic Aperture Radar (Sentinel-1 C-Band).' 
                }
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setModality(item.id as Modality)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    modality === item.id
                      ? 'border-[#c2410c] bg-[#fef4ee] shadow-2xs'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{item.title}</span>
                    {modality === item.id && (
                      <CheckCircle2 className="w-4 h-4 text-[#c2410c]" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 3: ANALYTICAL QUERY & TASK */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#c2410c] text-white flex items-center justify-center text-xs font-bold font-mono">
                  3
                </span>
                <h2 className="text-sm font-bold text-slate-900">Analytical Query & Task Specification</h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Natural Language Prompt</span>
            </div>

            <textarea
              value={queryText}
              onChange={(e) => {
                setQueryText(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              rows={3}
              placeholder="Enter your natural-language remote sensing question..."
              className="w-full text-xs font-sans p-3 rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#c2410c] focus:border-[#c2410c] text-slate-800 bg-white leading-relaxed"
            />

            {/* Clickable Suggested Queries */}
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                Suggested Technical Inquiries:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sampleQueries.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQueryText(q.text);
                      setTaskType(q.task);
                    }}
                    className="text-[11px] font-sans px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-left transition cursor-pointer"
                  >
                    "{q.text}"
                  </button>
                ))}
              </div>
            </div>

            {/* Task Type Badges */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-600 mb-2">Target Task Type:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'vqa', label: 'Single-image VQA', badge: 'WORKING POC' },
                  { id: 'scene_understanding', label: 'Scene Captioning', badge: 'DEMONSTRATED' },
                  { id: 'detection', label: 'Object Detection', badge: 'DEMO' },
                  { id: 'segmentation', label: 'Land-Cover Segmentation', badge: 'DEMO' },
                  { id: 'change_analysis', label: 'Change Analysis', badge: 'PLANNED' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTaskType(t.id as TaskType)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium border transition cursor-pointer ${
                      taskType === t.id
                        ? 'bg-[#c2410c] text-white border-[#c2410c]'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className={`text-[9px] font-mono px-1 rounded ${
                      taskType === t.id 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {t.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* STEP 4: MODEL SELECTION */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#c2410c] text-white flex items-center justify-center text-xs font-bold font-mono">
                  4
                </span>
                <h2 className="text-sm font-bold text-slate-900">Inference Engine Routing</h2>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setModelMode('auto')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    modelMode === 'auto'
                      ? 'bg-[#c2410c] text-white font-medium'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Auto Routing
                </button>
                <button
                  type="button"
                  onClick={() => setModelMode('manual')}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    modelMode === 'manual'
                      ? 'bg-[#c2410c] text-white font-medium'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Manual Selection
                </button>
              </div>
            </div>

            {modelMode === 'auto' ? (
              <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-start space-x-3">
                <Sparkles className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-emerald-900">
                    Automatic Dispatch: Qwen2.5-VL-3B-Instruct
                  </div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">
                    SatQuery routes single-image VQA & scene understanding queries to the Colab Tesla T4 inference worker adapter.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {MOCK_MODELS.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModelId(m.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition flex items-center justify-between ${
                      selectedModelId === m.id
                        ? 'border-[#c2410c] bg-[#fef4ee]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                        <span>{m.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {m.version}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{m.description}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        Environment: {m.environment}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      {m.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Live Preview, Extracted Metadata & Action */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Preview Panel */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-800">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Imagery Canvas Preview</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {metadata.width} × {metadata.height} PX
              </span>
            </div>

            <div className="w-full aspect-video bg-slate-900 rounded-md overflow-hidden relative border border-slate-200 flex items-center justify-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Satellite Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs font-mono text-slate-500">No Image Loaded</div>
              )}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px] backdrop-blur-xs border border-white/20">
                {metadata.filename}
              </div>
            </div>
          </div>

          {/* Technical Metadata Panel */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-800 font-mono uppercase">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>Remote-Sensing Metadata</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                Extracted
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Filename</span>
                <span className="font-medium text-slate-800 truncate max-w-[200px]">
                  {metadata.filename}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Resolution (GSD)</span>
                <span className="font-medium text-slate-800">
                  {metadata.resolutionMeters ? `${metadata.resolutionMeters}m / pixel` : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Platform / Sensor</span>
                <span className="font-medium text-slate-800">
                  {metadata.satellite ? `${metadata.satellite} (${metadata.sensor})` : 'Not available'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Acquisition Date</span>
                <span className="font-medium text-slate-800">
                  {metadata.acquisitionDate || 'Not available'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Spatial Ref (CRS)</span>
                <span className="font-medium text-slate-800">
                  {metadata.coordinates?.crs || 'Not available'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Cloud Occlusion</span>
                <span className="font-medium text-slate-800">
                  {metadata.cloudCoveragePercent !== undefined 
                    ? `${(metadata.cloudCoveragePercent * 100).toFixed(1)}%` 
                    : 'Not available'}
                </span>
              </div>
            </div>
          </div>

          {/* STEP 5: REVIEW & RUN ANALYSIS */}
          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="text-xs font-bold text-slate-900">Step 5: Pipeline Review</div>
            
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200 space-y-1 text-xs font-mono">
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-400">Modality:</span>
                <span className="font-semibold uppercase">{modality}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-400">Task:</span>
                <span className="font-semibold">{taskType}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="text-slate-400">Model:</span>
                <span className="font-semibold">{modelMode === 'auto' ? 'Auto (Qwen-VL)' : selectedModelId}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isSubmitting ? 'Starting Pipeline...' : 'Run Analysis Pipeline'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
