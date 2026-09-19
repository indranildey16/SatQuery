import React from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Cpu, 
  Terminal, 
  Layers, 
  Compass, 
  Database 
} from 'lucide-react';
import type { Analysis } from '../../types';

interface ProcessingViewProps {
  analysis: Analysis;
}

const PIPELINE_STEPS = [
  { id: 'INPUT RECEIVED', label: 'Input Ingestion', description: 'Validating image buffer' },
  { id: 'IMAGE VALIDATED', label: 'Image Validation', description: 'Checking dimensions & format' },
  { id: 'MODALITY RESOLUTION', label: 'Modality Resolution', description: 'Resolving optical vs SAR spectral bands' },
  { id: 'QUERY ROUTING', label: 'Query Routing', description: 'Rule-Based Query Router (VQA vs Caption)' },
  { id: 'MODEL SELECTION', label: 'Model Selection', description: 'Routing to Qwen2.5-VL inference adapter' },
  { id: 'COLAB INFERENCE', label: 'Model Inference', description: 'Executing vision-language attention' },
  { id: 'RESULT NORMALIZATION', label: 'Result Normalization', description: 'Formatting findings & telemetry' },
  { id: 'RESULT READY', label: 'Result Ready', description: 'Finalizing visualization artifacts' }
];

export const ProcessingView: React.FC<ProcessingViewProps> = ({ analysis }) => {
  const normalizedCurrentStage = (analysis.currentStage || analysis.stage || '').replace(/_/g, ' ').toUpperCase();
  const currentStageIndex = PIPELINE_STEPS.findIndex(
    (s) => s.id.toUpperCase() === normalizedCurrentStage ||
           (s.id === 'INPUT RECEIVED' && normalizedCurrentStage === 'UPLOAD RECEIVED') ||
           (s.id === 'IMAGE VALIDATED' && normalizedCurrentStage === 'IMAGE VALIDATION') ||
           (s.id === 'QUERY ROUTING' && normalizedCurrentStage === 'QUERY INTERPRETATION') ||
           (s.id === 'COLAB INFERENCE' && normalizedCurrentStage === 'MODEL INFERENCE') ||
           (s.id === 'RESULT NORMALIZATION' && normalizedCurrentStage === 'RESULT PROCESSING')
  );
  const activeIndex = currentStageIndex === -1 ? 0 : currentStageIndex;
  const progressPercent = analysis.progress || Math.round(((activeIndex + 1) / PIPELINE_STEPS.length) * 100);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto p-6 select-none">
      {/* Top Banner */}
      <div className="max-w-4xl w-full mx-auto pb-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold text-[#c2410c] bg-orange-50 border border-orange-200">
              {analysis.id}
            </span>
            <span className="text-sm font-bold text-slate-900">
              / Analysis Pipeline Active
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-orange-50 text-[#c2410c] border border-orange-200 flex items-center space-x-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="uppercase">{analysis.status}</span>
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            Enclave: {analysis.enclaveCrs || 'EPSG 4326'}
          </span>
        </div>

        <div className="mt-2 flex items-center space-x-2 text-xs text-[#c2410c] italic">
          <Compass className="w-3.5 h-3.5 not-italic shrink-0" />
          <span className="truncate">"{analysis.query?.text || 'Remote-Sensing Scene Inquiry'}"</span>
        </div>
      </div>

      {/* Main Processing Content */}
      <div className="max-w-4xl w-full mx-auto my-6 space-y-6">
        {/* Progress Bar Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-[#c2410c]" />
              <span className="font-semibold text-slate-800">
                CURRENT STAGE: <span className="text-[#c2410c]">{normalizedCurrentStage || 'PROCESSING'}</span>
              </span>
            </div>
            <span className="font-bold text-slate-700">{progressPercent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#c2410c] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Model: {analysis.model?.name || 'Qwen2.5-VL-3B-Instruct'}</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Simulated Async Inference (~2.5s)</span>
            </span>
          </div>
        </div>

        {/* 8-Stage Visual Pipeline */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold font-mono text-slate-700 uppercase">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Execution Pipeline Stages</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              MOCK INFERENCE ADAPTER
            </span>
          </div>

          <div className="divide-y divide-slate-100 p-2">
            {PIPELINE_STEPS.map((step, idx) => {
              const isDone = idx < activeIndex;
              const isCurrent = idx === activeIndex;
              const isPending = idx > activeIndex;

              return (
                <div 
                  key={step.id} 
                  className={`flex items-center justify-between px-4 py-2.5 rounded transition ${
                    isCurrent 
                      ? 'bg-[#fef4ee] border border-[#fed7aa]' 
                      : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-[#c2410c] animate-spin" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                      )}
                    </div>

                    <div>
                      <div className={`text-xs font-medium ${
                        isCurrent 
                          ? 'text-[#c2410c] font-bold font-mono' 
                          : isDone 
                          ? 'text-slate-800' 
                          : 'text-slate-400'
                      }`}>
                        {idx + 1}. {step.label}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {step.description}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isDone && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        PASS
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-100 text-[#c2410c] font-semibold animate-pulse">
                        RUNNING
                      </span>
                    )}
                    {isPending && (
                      <span className="text-[10px] font-mono text-slate-300">
                        PENDING
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Input Parameters Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 mb-2">
              <Database className="w-4 h-4 text-slate-500" />
              <span>Target Imagery</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-16 h-16 rounded bg-slate-900 overflow-hidden border border-slate-200 shrink-0">
                <img
                  src={analysis.input?.imageUrl || '/samples/guinea-bissau-sample.jpg'}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs font-mono space-y-0.5">
                <div className="font-semibold text-slate-900 truncate max-w-[200px]">
                  {analysis.input?.metadata?.filename || 'satellite_scene.jpg'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  Modality: <span className="uppercase text-slate-600">{analysis.input?.metadata?.modality || 'optical'}</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Size: {analysis.input?.metadata?.fileSizeBytes ? (analysis.input.metadata.fileSizeBytes / (1024 * 1024)).toFixed(2) : '5.10'} MB
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 mb-2">
              <Cpu className="w-4 h-4 text-slate-500" />
              <span>Engine Worker</span>
            </div>
            <div className="text-xs font-mono space-y-1">
              <div className="font-semibold text-slate-900">{analysis.model?.name || 'Qwen2.5-VL-3B-Instruct'}</div>
              <div className="text-slate-500 text-[11px]">Environment: {analysis.model?.environment || 'Inference Worker'}</div>
              <div className="text-[10px] text-slate-400">
                Status: Pipeline Execution Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
