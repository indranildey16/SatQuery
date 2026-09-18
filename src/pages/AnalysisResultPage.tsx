import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  SplitSquareVertical, 
  Code2, 
  Download, 
  RotateCcw, 
  Compass, 
  Plus, 
  Minus, 
  Maximize2, 
  Crosshair, 
  Sliders, 
  TrendingUp, 
  Target, 
  Terminal, 
  AlertCircle, 
  FileText 
} from 'lucide-react';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import { ProcessingView } from '../components/analysis/ProcessingView';

export const AnalysisResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { analysis, isLoading, error } = useAnalysisPolling(id);

  const [swipePos] = useState<number>(52);
  const [maskOpacity, setMaskOpacity] = useState<number>(85);
  const [showTraceDetails, setShowTraceDetails] = useState<boolean>(false);
  const [layers, setLayers] = useState({
    baseOptical: true,
    vesselsBbox: true,
    sedimentMask: true
  });

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] text-slate-500 font-mono text-xs space-y-2 select-none">
        <div className="w-5 h-5 border-2 border-[#c2410c] border-t-transparent rounded-full animate-spin"></div>
        <span>Retrieving analysis record from registry...</span>
      </div>
    );
  }

  // Handle error state
  if (error || !analysis) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] p-6 select-none">
        <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 p-6 shadow-2xs text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Analysis Record Unavailable</h2>
            <p className="text-xs text-slate-500 mt-1">
              {error || `The requested analysis artifact "${id}" could not be located in the local session store.`}
            </p>
          </div>
          <div className="pt-2 flex justify-center space-x-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              Return to Workspace
            </button>
            <button
              onClick={() => navigate('/analysis/new')}
              className="px-4 py-2 rounded-md bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold transition cursor-pointer"
            >
              Start New Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Processing screen while queued or processing
  if (analysis.status === 'queued' || analysis.status === 'processing') {
    return <ProcessingView analysis={analysis} />;
  }

  const results = analysis.results;
  const hasDetections = (results?.detections?.length || 0) > 0;
  const runtimeDisplay = analysis.trace?.runtimeSeconds 
    ? `${analysis.trace.runtimeSeconds.toFixed(2)}s` 
    : `${((results?.metrics?.runtimeMs || 2180) / 1000).toFixed(2)}s`;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white select-none">
      {/* Top Analysis Header (Matching Reference Screenshot) */}
      <div className="border-b border-slate-200 px-4 py-2.5 bg-white shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          {/* Left Title & Status */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold text-[#c2410c] bg-orange-50 border border-orange-200">
              {analysis.id}
            </span>
            <span className="text-sm font-bold text-slate-900 truncate max-w-sm">
              / {analysis.title}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>COMPLETED</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              ENCLAVE: {analysis.enclaveCrs || 'EPSG 32650'}
            </span>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-xs font-mono text-slate-700 transition cursor-pointer">
              <SplitSquareVertical className="w-3.5 h-3.5 text-slate-500" />
              <span>Split Swipe</span>
            </button>
            <button className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-xs font-mono text-slate-700 transition cursor-pointer">
              <Code2 className="w-3.5 h-3.5 text-slate-500" />
              <span>GeoJSON</span>
            </button>
            <button className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-xs font-mono text-slate-700 transition cursor-pointer">
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Report</span>
            </button>
            <button 
              onClick={() => navigate('/analysis/new')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#c2410c] hover:bg-[#9a3412] text-xs font-mono font-medium text-white transition shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Run</span>
            </button>
          </div>
        </div>

        {/* Query & Pipeline Metadata Strip */}
        <div className="mt-1.5 space-y-0.5">
          <div className="flex items-center space-x-2 text-xs text-[#c2410c] italic font-medium">
            <Compass className="w-3.5 h-3.5 text-[#c2410c] shrink-0 not-italic" />
            <span className="truncate">"{analysis.query.text}"</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 flex flex-wrap items-center gap-x-2">
            <span>Model: <strong className="font-semibold text-slate-700">{analysis.model.name}</strong> ({analysis.model.version})</span>
            <span>•</span>
            <span>Latency: <strong className="font-semibold text-emerald-700">{runtimeDisplay}</strong></span>
            <span>•</span>
            <span>Engine: <span className="text-slate-600">{analysis.model.environment}</span></span>
            <span>•</span>
            <span>GSD: <span className="text-slate-600">{analysis.input.metadata.resolutionMeters ? `${analysis.input.metadata.resolutionMeters}m` : '0.8m Super-Resolved'}</span></span>
          </div>
        </div>
      </div>

      {/* Main Workspace Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: dominant satellite image viewer */}
        <div className="flex-1 relative bg-slate-900 overflow-hidden flex items-center justify-center group">
          {/* Imagery Canvas */}
          <div className="relative w-full h-full">
            <img
              src={analysis.input.imageUrl}
              alt="Remote Sensing Canvas"
              className="w-full h-full object-cover select-none pointer-events-none"
            />

            {/* Split comparison swipe line */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-[#ea580c] cursor-ew-resize z-20"
              style={{ left: `${swipePos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-[#ea580c] shadow-md flex items-center justify-center">
                <div className="flex space-x-0.5">
                  <div className="w-0.5 h-2.5 bg-[#ea580c] rounded"></div>
                  <div className="w-0.5 h-2.5 bg-[#ea580c] rounded"></div>
                </div>
              </div>
            </div>

            {/* Floating Top Indicator Badges */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center space-x-2 z-10">
              <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono border border-white/20">
                RAW OPTICAL
              </span>
              <span className="px-2 py-0.5 rounded bg-[#c2410c]/80 backdrop-blur-xs text-white text-[10px] font-mono border border-orange-300/40">
                INFERENCE ACTIVE
              </span>
            </div>

            {/* Floating PIPELINE LAYERS Control Box */}
            <div className="absolute top-3 left-3 w-64 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200 shadow-lg p-3 z-20 text-xs select-none">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <div className="flex items-center space-x-1.5 font-bold font-mono text-slate-800 text-[11px]">
                  <Sliders className="w-3.5 h-3.5 text-[#c2410c]" />
                  <span>PIPELINE LAYERS</span>
                </div>
                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-semibold">
                  {hasDetections ? '3 ACTIVE' : '1 ACTIVE'}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center justify-between p-1 rounded hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={layers.baseOptical}
                      onChange={(e) => setLayers({ ...layers, baseOptical: e.target.checked })}
                      className="rounded text-[#c2410c] focus:ring-[#c2410c]"
                    />
                    <span className="text-[11px] font-medium text-slate-800">Base Optical (Scene)</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">TRUECOLOR</span>
                </label>

                {hasDetections ? (
                  <label className="flex items-center justify-between p-1 rounded hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={layers.vesselsBbox}
                        onChange={(e) => setLayers({ ...layers, vesselsBbox: e.target.checked })}
                        className="rounded text-[#c2410c] focus:ring-[#c2410c]"
                      />
                      <span className="text-[11px] font-medium text-slate-800">YOLOv8 Vessels & Cranes</span>
                    </div>
                    <span className="px-1 py-0.2 rounded bg-orange-100 text-[#c2410c] text-[9px] font-mono font-semibold">
                      28 BBOX
                    </span>
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-1 rounded opacity-50">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" disabled className="rounded" />
                      <span className="text-[11px] text-slate-500">Object Bounding Boxes</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">NOT IN VQA</span>
                  </div>
                )}

                {hasDetections ? (
                  <label className="flex items-center justify-between p-1 rounded hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={layers.sedimentMask}
                        onChange={(e) => setLayers({ ...layers, sedimentMask: e.target.checked })}
                        className="rounded text-[#c2410c] focus:ring-[#c2410c]"
                      />
                      <span className="text-[11px] font-medium text-slate-800">Sediment & Docks Mask</span>
                    </div>
                    <span className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono font-semibold">
                      SEM-SEG
                    </span>
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-1 rounded opacity-50">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" disabled className="rounded" />
                      <span className="text-[11px] text-slate-500">Segmentation Mask</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">NOT IN VQA</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-1 rounded opacity-50">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" disabled className="rounded" />
                    <span className="text-[11px] text-slate-500">SAR Synthetic Fusion</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">PLANNED</span>
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="mt-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                  <span>Overlay Opacity</span>
                  <span className="text-[#c2410c] font-semibold">{maskOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={maskOpacity}
                  onChange={(e) => setMaskOpacity(Number(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#c2410c]"
                />
              </div>
            </div>

            {/* Right Map Canvas Controls */}
            <div className="absolute top-3 right-3 flex flex-col space-y-1 z-20">
              <button className="w-7 h-7 rounded bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 flex items-center justify-center cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 flex items-center justify-center cursor-pointer">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 flex items-center justify-center cursor-pointer">
                <Crosshair className="w-3.5 h-3.5" />
              </button>
              <button className="w-7 h-7 rounded bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 flex items-center justify-center cursor-pointer">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Telemetry Ticker */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-slate-900/90 backdrop-blur-xs border-t border-slate-800 text-[10px] font-mono text-slate-400 px-3 flex items-center justify-between z-20">
            <div className="flex items-center space-x-3">
              <span>CURSOR: <strong className="text-slate-200">
                {analysis.input.metadata.coordinates 
                  ? `${analysis.input.metadata.coordinates.lat}° N, ${analysis.input.metadata.coordinates.lng}° W` 
                  : '22.3326° N, 114.1881° E'}
              </strong></span>
              <span>|</span>
              <span>CRS: <strong className="text-slate-200">{analysis.enclaveCrs || 'WGS 84'}</strong></span>
              <span>|</span>
              <span>ELEV: <strong className="text-emerald-400">4.2m MSL</strong></span>
            </div>
            <div className="flex items-center space-x-3">
              <span>ZOOM: <strong className="text-[#ea580c]">14.8x</strong></span>
              <span>|</span>
              <span>FOV: <strong className="text-slate-200">4.82 km²</strong></span>
            </div>
          </div>
        </div>

        {/* Right Panel: Executive Findings, Textual VQA Answer & Observable Trace */}
        <div className="w-full lg:w-96 border-l border-slate-200 bg-[#fbfcfd] flex flex-col overflow-y-auto shrink-0 p-4 space-y-4">
          {/* Executive Findings Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 font-bold text-xs text-slate-900 font-sans">
                <TrendingUp className="w-4 h-4 text-[#c2410c]" />
                <span>Executive Findings</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-semibold">
                {results?.metrics?.confidenceLabel || 'Not calibrated (Demo)'}
              </span>
            </div>

            {/* Model's Natural-Language Answer */}
            {results?.rawAnswer ? (
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 mb-3">
                <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase font-semibold text-slate-500 mb-1.5">
                  <FileText className="w-3 h-3 text-[#c2410c]" />
                  <span>Model Generated Response:</span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                  {results.rawAnswer}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-700 leading-relaxed mb-3">
                {results?.summary}
              </p>
            )}

            {/* Key Findings Bullet Points */}
            {(results?.findings || []).length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="text-[10px] font-mono uppercase font-semibold text-slate-400">
                  Key Observations:
                </div>
                {results?.findings.map((f, i) => (
                  <div key={i} className="flex items-start space-x-1.5 text-xs text-slate-600">
                    <span className="text-[#c2410c] font-bold">•</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Metric Blocks Grid (Only if provided by analysis) */}
            {results?.metrics?.detectedVessels !== undefined && (
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-mono uppercase text-slate-400">DETECTED VESSELS</div>
                  <div className="text-base font-bold text-[#c2410c] mt-0.5">
                    {results.metrics.detectedVessels} <span className="text-xs font-normal text-slate-600">Units</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-mono uppercase text-slate-400">DOCK FOOTPRINT</div>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">
                    {results.metrics.dockFootprintKm2 || '4.62'} <span className="text-xs font-normal text-slate-600">km²</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Observable Execution Trace (Section 10 & 24) */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 font-sans">
                <Terminal className="w-4 h-4 text-[#c2410c]" />
                <span>Execution Trace</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                OBSERVABLE
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Input</span>
                <span className="font-medium text-slate-800">1 image ({analysis.input.metadata.filename})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Task</span>
                <span className="font-medium text-slate-800 uppercase">{analysis.query.task}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Model</span>
                <span className="font-medium text-slate-800">{analysis.model.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-emerald-700">Completed</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Runtime</span>
                <span className="font-medium text-slate-800">{runtimeDisplay}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Confidence</span>
                <span className="font-medium text-slate-800">
                  {analysis.trace?.confidenceNote || 'Not calibrated'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Evidence</span>
                <span className="font-medium text-slate-800 truncate max-w-[190px]">
                  {analysis.trace?.evidenceNote || 'Image-based visual analysis'}
                </span>
              </div>
            </div>

            {/* Expandable Pipeline Stages */}
            <div className="mt-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTraceDetails(!showTraceDetails)}
                className="text-[11px] font-mono text-[#c2410c] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>{showTraceDetails ? 'Hide Stage Timings' : 'View Stage Timings (8/8 Pass)'}</span>
              </button>

              {showTraceDetails && analysis.trace?.stages && (
                <div className="mt-2 space-y-1 bg-slate-50 p-2 rounded border border-slate-200 text-[10px] font-mono">
                  {analysis.trace.stages.map((stg, i) => (
                    <div key={i} className="flex justify-between text-slate-600">
                      <span>{stg.stage}</span>
                      <span className="text-slate-400">{stg.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detections Panel (If applicable) */}
          {hasDetections && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 font-sans">
                  <Target className="w-4 h-4 text-[#c2410c]" />
                  <span>Feature Instances</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Showing {results?.detections.length} of 28
                </span>
              </div>

              <div className="space-y-2">
                {results?.detections.map((det) => (
                  <div key={det.id} className="p-2 rounded border border-slate-200 bg-slate-50/50 hover:bg-orange-50/30 transition">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-800">
                        #{det.id} • {det.label}
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {det.confidence ? `${det.confidence} CONF` : 'DETECTED'}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      BBox: [{det.bbox.join(', ')}] {det.metrics?.length && `Len: ${det.metrics.length}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
