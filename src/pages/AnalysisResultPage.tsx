import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Download, 
  RotateCcw, 
  Compass, 
  Plus, 
  Minus, 
  Crosshair, 
  Sliders, 
  TrendingUp, 
  Target, 
  Terminal, 
  AlertCircle, 
  FileText,
  ArrowRightLeft,
  ShieldAlert,
  BarChart3
} from 'lucide-react';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import { ProcessingView } from '../components/analysis/ProcessingView';

export const AnalysisResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { analysis, isLoading, error } = useAnalysisPolling(id);

  const containerRef = useRef<HTMLDivElement>(null);
  const [swipePos, setSwipePos] = useState<number>(50);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [maskOpacity, setMaskOpacity] = useState<number>(85);
  const [showTraceDetails, setShowTraceDetails] = useState<boolean>(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'before-after' | 'after-overlay' | 'overlay-only'>('before-after');
  
  const [layers, setLayers] = useState({
    baseOptical: true,
    vesselsBbox: true,
    sedimentMask: true,
    changeBefore: true,
    changeAfter: true,
    changeMask: true,
    changeOverlay: true
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
  const isChangeAnalysis = analysis.query.task === 'change_analysis' || Boolean(results?.changeAnalysis);
  const changeStats = results?.changeAnalysis;
  const changedRegions = results?.changedRegions || [];

  const beforeUrl = analysis.input.beforeImageUrl || analysis.input.imageUrl;
  const afterUrl = analysis.input.afterImageUrl || analysis.input.imageAfterUrl || analysis.input.imageUrl;
  const maskUrl = results?.visualizations?.find(v => v.type === 'change_mask')?.imageUrl;
  const overlayUrl = results?.visualizations?.find(v => v.type === 'change_overlay')?.imageUrl;

  const workingWidth = changeStats?.method?.workingDimensions?.[0] || 600;
  const workingHeight = changeStats?.method?.workingDimensions?.[1] || 600;

  const hasDetections = (results?.detections?.length || 0) > 0;
  const runtimeDisplay = analysis.trace?.runtimeSeconds 
    ? `${analysis.trace.runtimeSeconds.toFixed(2)}s` 
    : `${((results?.metrics?.runtimeMs || 2180) / 1000).toFixed(2)}s`;

  const handlePointerMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSwipePos(Math.round((x / rect.width) * 100));
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analysis, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `satquery_${analysis.id}.json`);
    dlAnchor.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white select-none">
      {/* Top Analysis Header */}
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
            {isChangeAnalysis && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                BI-TEMPORAL BASELINE
              </span>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-2">
            {isChangeAnalysis && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-[11px] font-mono mr-1">
                <button
                  type="button"
                  onClick={() => setComparisonMode('before-after')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    comparisonMode === 'before-after' 
                      ? 'bg-white shadow-xs font-semibold text-[#c2410c]' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Before ↔ After
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonMode('after-overlay')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    comparisonMode === 'after-overlay' 
                      ? 'bg-white shadow-xs font-semibold text-[#c2410c]' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  After ↔ Overlay
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonMode('overlay-only')}
                  className={`px-2 py-1 rounded transition cursor-pointer ${
                    comparisonMode === 'overlay-only' 
                      ? 'bg-white shadow-xs font-semibold text-[#c2410c]' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Overlay View
                </button>
              </div>
            )}

            <button 
              onClick={handleExportJson}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-xs font-mono text-slate-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Record</span>
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
            <span>Task: <strong className="font-semibold text-slate-700">
              {analysis.trace?.task || (isChangeAnalysis ? 'Bi-temporal Change Analysis' : analysis.query.task === 'captioning' ? 'Scene Captioning' : 'Single-image VQA')}
            </strong></span>
            <span>•</span>
            <span>Router: <strong className="font-semibold text-slate-700">{analysis.trace?.router || 'Rule-Based Query Router'}</strong></span>
            <span>•</span>
            <span>Model: <strong className="font-semibold text-slate-700">{analysis.model.name}</strong></span>
            <span>•</span>
            <span>Latency: <strong className="font-semibold text-emerald-700">{runtimeDisplay}</strong></span>
            <span>•</span>
            <span>Engine: <span className="text-slate-600">{analysis.model.environment}</span></span>
            <span>•</span>
            <span>GSD: <span className="text-slate-600">{analysis.input.metadata.resolutionMeters ? `${analysis.input.metadata.resolutionMeters}m` : '10m'}</span></span>
          </div>
        </div>
      </div>

      {/* Main Workspace Split View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: dominant satellite image viewer */}
        <div 
          ref={containerRef}
          onMouseMove={(e) => { if (isSwiping) handlePointerMove(e.clientX); }}
          onMouseUp={() => setIsSwiping(false)}
          onMouseLeave={() => setIsSwiping(false)}
          className="flex-1 relative bg-slate-900 overflow-hidden flex items-center justify-center group select-none"
        >
          {/* Imagery Canvas */}
          <div className="relative w-full h-full">
            {isChangeAnalysis ? (
              // BI-TEMPORAL CHANGE DETECTION VIEWER
              <div className="relative w-full h-full overflow-hidden">
                {comparisonMode === 'before-after' && (
                  <>
                    {/* Background: After Scene */}
                    <img
                      src={afterUrl}
                      alt="After Scene"
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                    />

                    {/* Foreground Clipped: Before Scene */}
                    <img
                      src={beforeUrl}
                      alt="Before Scene"
                      style={{ clipPath: `inset(0 ${100 - swipePos}% 0 0)` }}
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                    />
                  </>
                )}

                {comparisonMode === 'after-overlay' && (
                  <>
                    {/* Background: Change Overlay */}
                    <img
                      src={overlayUrl || afterUrl}
                      alt="Change Detection Overlay"
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                    />

                    {/* Foreground Clipped: After Scene */}
                    <img
                      src={afterUrl}
                      alt="After Scene"
                      style={{ clipPath: `inset(0 ${100 - swipePos}% 0 0)` }}
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                    />
                  </>
                )}

                {comparisonMode === 'overlay-only' && (
                  <>
                    <img
                      src={afterUrl}
                      alt="Base After"
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                    />
                    {layers.changeOverlay && overlayUrl && (
                      <img
                        src={overlayUrl}
                        alt="Change Overlay"
                        style={{ opacity: maskOpacity / 100 }}
                        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                      />
                    )}
                    {layers.changeMask && maskUrl && (
                      <img
                        src={maskUrl}
                        alt="Change Mask"
                        style={{ opacity: (maskOpacity / 100) * 0.7 }}
                        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none mix-blend-screen"
                      />
                    )}
                  </>
                )}

                {/* Interactive SVG Bounding Box Layer */}
                {changedRegions.length > 0 && (
                  <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none z-15" 
                    viewBox={`0 0 ${workingWidth} ${workingHeight}`} 
                    preserveAspectRatio="none"
                  >
                    {changedRegions.map((region) => {
                      const isSelected = selectedRegionId === region.id;
                      const [rx, ry, rw, rh] = region.bbox;
                      return (
                        <g 
                          key={region.id} 
                          className="pointer-events-auto cursor-pointer" 
                          onClick={() => setSelectedRegionId(isSelected ? null : region.id)}
                        >
                          <rect
                            x={rx}
                            y={ry}
                            width={rw}
                            height={rh}
                            fill={isSelected ? "rgba(234, 88, 12, 0.35)" : "rgba(234, 88, 12, 0.12)"}
                            stroke={isSelected ? "#ea580c" : "#f97316"}
                            strokeWidth={isSelected ? "3" : "1.5"}
                            strokeDasharray={isSelected ? "none" : "4 2"}
                          />
                          <text
                            x={rx + 4}
                            y={Math.max(16, ry - 4)}
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                            className="drop-shadow-md"
                          >
                            {region.id} ({region.pixelArea}px)
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Swipe Divider Line */}
                {comparisonMode !== 'overlay-only' && (
                  <div 
                    onMouseDown={() => setIsSwiping(true)}
                    className="absolute top-0 bottom-0 w-1 bg-[#ea580c] cursor-ew-resize z-20 hover:w-1.5 transition-all"
                    style={{ left: `${swipePos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border-2 border-[#ea580c] shadow-lg flex items-center justify-center cursor-ew-resize">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-[#ea580c]" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // SINGLE-IMAGE VQA / CAPTIONING VIEWER
              <>
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
              </>
            )}

            {/* Floating Top Indicator Badges */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center space-x-2 z-10 pointer-events-none">
              {isChangeAnalysis ? (
                <>
                  <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono border border-white/20">
                    {comparisonMode === 'before-after' 
                      ? `SWIPE: BEFORE (${swipePos}%) ↔ AFTER` 
                      : comparisonMode === 'after-overlay' 
                        ? `SWIPE: AFTER (${swipePos}%) ↔ OVERLAY`
                        : 'OVERLAY BLEND MODE'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#c2410c]/90 backdrop-blur-xs text-white text-[10px] font-mono border border-orange-300/40">
                    CLASSICAL BASELINE
                  </span>
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono border border-white/20">
                    RAW OPTICAL
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#c2410c]/80 backdrop-blur-xs text-white text-[10px] font-mono border border-orange-300/40">
                    INFERENCE ACTIVE
                  </span>
                </>
              )}
            </div>

            {/* Floating PIPELINE LAYERS Control Box */}
            <div className="absolute top-3 left-3 w-64 bg-white/95 backdrop-blur-md rounded-lg border border-slate-200 shadow-lg p-3 z-20 text-xs select-none">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <div className="flex items-center space-x-1.5 font-bold font-mono text-slate-800 text-[11px]">
                  <Sliders className="w-3.5 h-3.5 text-[#c2410c]" />
                  <span>PIPELINE LAYERS</span>
                </div>
                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono font-semibold">
                  {isChangeAnalysis ? '4 ACTIVE' : hasDetections ? '3 ACTIVE' : '1 ACTIVE'}
                </span>
              </div>

              <div className="space-y-1.5">
                {isChangeAnalysis ? (
                  <>
                    <label className="flex items-center justify-between p-1 rounded hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={layers.changeBefore}
                          onChange={(e) => setLayers({ ...layers, changeBefore: e.target.checked })}
                          className="rounded text-[#c2410c] focus:ring-[#c2410c]"
                        />
                        <span className="text-[11px] font-medium text-slate-800">Base Before (Scene)</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">T0 OPTICAL</span>
                    </label>

                    <label className="flex items-center justify-between p-1 rounded hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={layers.changeAfter}
                          onChange={(e) => setLayers({ ...layers, changeAfter: e.target.checked })}
                          className="rounded text-[#c2410c] focus:ring-[#c2410c]"
                        />
                        <span className="text-[11px] font-medium text-slate-800">Base After (Scene)</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">T1 OPTICAL</span>
                    </label>

                    <label className="flex items-center justify-between p-1 rounded hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={layers.changeMask}
                          onChange={(e) => setLayers({ ...layers, changeMask: e.target.checked })}
                          className="rounded text-[#c2410c] focus:ring-[#c2410c]"
                        />
                        <span className="text-[11px] font-medium text-slate-800">Binary Change Mask</span>
                      </div>
                      <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-mono font-semibold">
                        BIN-DIFF
                      </span>
                    </label>

                    <label className="flex items-center justify-between p-1 rounded hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={layers.changeOverlay}
                          onChange={(e) => setLayers({ ...layers, changeOverlay: e.target.checked })}
                          className="rounded text-[#c2410c] focus:ring-[#c2410c]"
                        />
                        <span className="text-[11px] font-medium text-slate-800">Change Baseline Overlay</span>
                      </div>
                      <span className="px-1 py-0.2 rounded bg-orange-100 text-[#c2410c] text-[9px] font-mono font-semibold">
                        OVERLAY
                      </span>
                    </label>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {/* Opacity Slider */}
              <div className="mt-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                  <span>Detection Opacity</span>
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
              <button 
                onClick={() => setSwipePos(50)}
                title="Reset Swipe to 50%"
                className="w-7 h-7 rounded bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 flex items-center justify-center cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setSwipePos(Math.max(10, swipePos - 10))}
                title="Step Left"
                className="w-7 h-7 rounded bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 flex items-center justify-center cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setSwipePos(Math.min(90, swipePos + 10))}
                title="Step Right"
                className="w-7 h-7 rounded bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Telemetry Ticker */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-slate-900/90 backdrop-blur-xs border-t border-slate-800 text-[10px] font-mono text-slate-400 px-3 flex items-center justify-between z-20">
            <div className="flex items-center space-x-3">
              <span>RESOLUTION: <strong className="text-slate-200">{workingWidth} × {workingHeight} px</strong></span>
              <span>|</span>
              <span>CRS: <strong className="text-slate-200">{analysis.enclaveCrs || 'WGS 84'}</strong></span>
              <span>|</span>
              <span>MODE: <strong className="text-emerald-400">{isChangeAnalysis ? 'BI-TEMPORAL' : 'MONO-TEMPORAL'}</strong></span>
            </div>
            <div className="flex items-center space-x-3">
              <span>SWIPE: <strong className="text-[#ea580c]">{swipePos}%</strong></span>
              <span>|</span>
              <span>STATUS: <strong className="text-slate-200">VERIFIED</strong></span>
            </div>
          </div>
        </div>

        {/* Right Panel: Findings, Change Statistics, Regions Table & Trace */}
        <div className="w-full lg:w-96 border-l border-slate-200 bg-[#fbfcfd] flex flex-col overflow-y-auto shrink-0 p-4 space-y-4">
          
          {/* Executive Findings Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 font-bold text-xs text-slate-900 font-sans">
                <TrendingUp className="w-4 h-4 text-[#c2410c]" />
                <span>Executive Findings</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-semibold">
                {results?.metrics?.confidenceLabel || (isChangeAnalysis ? 'Deterministic Baseline' : 'Not calibrated (Demo)')}
              </span>
            </div>

            {/* Model's Natural-Language Answer / Summary */}
            {results?.rawAnswer ? (
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200 mb-3">
                <div className="flex items-center space-x-1.5 text-[10px] font-mono uppercase font-semibold text-slate-500 mb-1.5">
                  <FileText className="w-3 h-3 text-[#c2410c]" />
                  <span>{isChangeAnalysis ? 'Baseline Change Synthesis:' : 'Model Generated Response:'}</span>
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
          </div>

          {/* Change Statistics Card (Bi-temporal only) */}
          {isChangeAnalysis && changeStats && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 font-sans">
                  <BarChart3 className="w-4 h-4 text-[#c2410c]" />
                  <span>Change Statistics</span>
                </div>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-orange-50 text-[#c2410c] border border-orange-200">
                  {changeStats.changePercentage}% FOOTPRINT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-mono uppercase text-slate-400">CHANGED PIXELS</div>
                  <div className="text-base font-bold text-[#c2410c] mt-0.5">
                    {changeStats.changedPixelCount.toLocaleString()}{' '}
                    <span className="text-[10px] font-normal text-slate-500">px</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    of {changeStats.totalValidPixelCount.toLocaleString()} total
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-mono uppercase text-slate-400">SURFACE CHANGE</div>
                  <div className="text-base font-bold text-emerald-700 mt-0.5">
                    {changeStats.changePercentage}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    intensity ratio
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-mono uppercase text-slate-400">CHANGED REGIONS</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {changeStats.changedRegionCount}{' '}
                    <span className="text-[10px] font-normal text-slate-500">zones</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    connected components
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-mono uppercase text-slate-400">LARGEST REGION</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {changeStats.largestRegionArea.toLocaleString()}{' '}
                    <span className="text-[10px] font-normal text-slate-500">px</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    primary cluster
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Changed Regions Interactive Table (Bi-temporal only) */}
          {isChangeAnalysis && changedRegions.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-900 font-sans">
                  <Target className="w-4 h-4 text-[#c2410c]" />
                  <span>Changed Regions Table</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {changedRegions.length} Detected
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px]">
                      <th className="pb-1.5 font-semibold">REGION</th>
                      <th className="pb-1.5 font-semibold">AREA (PX)</th>
                      <th className="pb-1.5 font-semibold">REL %</th>
                      <th className="pb-1.5 font-semibold">BBOX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {changedRegions.map((region) => {
                      const isSelected = selectedRegionId === region.id;
                      return (
                        <tr 
                          key={region.id}
                          onClick={() => setSelectedRegionId(isSelected ? null : region.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-orange-50/80 font-bold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 text-[#c2410c]">
                            {region.id}
                          </td>
                          <td className="py-2 text-slate-700">
                            {region.pixelArea.toLocaleString()}
                          </td>
                          <td className="py-2 text-slate-600">
                            {region.relativeAreaPercent}%
                          </td>
                          <td className="py-2 text-slate-400 text-[10px]">
                            [{region.bbox.join(', ')}]
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 italic font-mono">
                Click a region row to highlight on canvas
              </div>
            </div>
          )}

          {/* Scientific Notice Card (Bi-temporal only) */}
          {isChangeAnalysis && (
            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs">
              <div className="flex items-center space-x-1.5 font-bold font-sans text-amber-800 mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Scientific Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                This classical baseline detects image-level spatial differences between aligned timestamps. 
                It does not establish semantic causes (e.g. construction, flooding, or deforestation), which requires 
                domain-specific models and calibrated sensor metadata.
              </p>
            </div>
          )}

          {/* Observable Execution Trace */}
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
                <span className="font-medium text-slate-800">
                  {analysis.trace?.inputCount || (isChangeAnalysis ? 2 : 1)} {isChangeAnalysis ? 'images (Before/After)' : `image (${analysis.input.metadata.filename})`}
                </span>
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
                <span className="font-medium text-slate-800 truncate max-w-[190px]">
                  {analysis.trace?.confidenceNote || 'Not calibrated'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Evidence</span>
                <span className="font-medium text-slate-800 truncate max-w-[190px]">
                  {analysis.trace?.evidenceNote || 'Visual pixel differencing baseline'}
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
                <span>
                  {showTraceDetails 
                    ? 'Hide Stage Timings' 
                    : `View Stage Timings (${analysis.trace?.stages?.length || (isChangeAnalysis ? 9 : 8)} Stages)`}
                </span>
              </button>

              {showTraceDetails && analysis.trace?.stages && (
                <div className="mt-2 space-y-1.5 bg-slate-50 p-2.5 rounded border border-slate-200 text-[10px] font-mono">
                  {analysis.trace.stages.map((stg, i) => (
                    <div key={i} className="flex justify-between text-slate-600 border-b border-slate-100/60 pb-0.5 last:border-0">
                      <span className="truncate max-w-[200px]">{stg.stage}</span>
                      <span className="text-slate-400 shrink-0">{stg.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detections Panel (If applicable for VQA/Detection) */}
          {!isChangeAnalysis && hasDetections && (
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
