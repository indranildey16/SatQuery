import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ArrowUpRight, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  Clock, 
  Terminal, 
  Server,
  Activity
} from 'lucide-react';
import type { Analysis } from '../types';
import { analysisService } from '../services/analysisService';
import { apiClient } from '../services/apiClient';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const isMock = apiClient.getMockStatus();

  useEffect(() => {
    analysisService.getRecentAnalyses().then(setAnalyses);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-6 select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Workspace</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-50 text-[#c2410c] border border-orange-200 font-medium">
              ORBIT CONSOLE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Analyze satellite imagery, inspect previous results, and manage analysis runs.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/analysis/new')}
            className="flex items-center space-x-2 py-2 px-4 rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white font-medium text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Analysis</span>
          </button>
        </div>
      </div>

      {/* System Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Frontend Client</span>
            </span>
            <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
              Ready
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-800">React + Vite Workstation</div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">Local Development v2.4-ORBIT</div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span className="flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-orange-600" />
              <span>Backend API</span>
            </span>
            <span className="text-[#c2410c] font-medium bg-orange-50 px-1.5 py-0.5 rounded text-[10px]">
              {isMock ? 'Demo / Mock' : 'Live Gateway'}
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-800">
            {isMock ? 'Mock Service Adapter' : 'FastAPI Gateway (Target)'}
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">
            {isMock ? 'Deterministic Mock Pipeline' : 'Endpoint: /api/v1'}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 mb-1">
            <span className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>Inference Engine</span>
            </span>
            <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
              Colab-Ready
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-800">Qwen2.5-VL-3B-Instruct</div>
          <div className="text-[11px] font-mono text-slate-400 mt-1">Colab Tesla T4 Architecture</div>
        </div>
      </div>

      {/* Section 1: Recent Analyses Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-mono">
              Recent Analyses
            </h2>
            <span className="text-xs font-mono text-slate-400">({analyses.length})</span>
          </div>
          <button 
            onClick={() => navigate('/history')}
            className="text-xs text-[#c2410c] hover:text-[#9a3412] font-medium flex items-center space-x-1 cursor-pointer"
          >
            <span>View Full History</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono uppercase text-slate-500">
                <th className="py-2.5 px-4 font-semibold">Analysis</th>
                <th className="py-2.5 px-4 font-semibold">Modality</th>
                <th className="py-2.5 px-4 font-semibold">Query</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Model</th>
                <th className="py-2.5 px-4 font-semibold">Created</th>
                <th className="py-2.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analyses.map((item) => (
                <tr 
                  key={item.id} 
                  className="hover:bg-slate-50/80 transition cursor-pointer"
                  onClick={() => navigate(`/analysis/${item.id}`)}
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{item.title}</div>
                    <div className="font-mono text-[11px] text-slate-400">{item.id}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-sky-50 text-sky-700 border border-sky-200">
                      {item.input.metadata.modality}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-600 italic">
                    "{item.query.text}"
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{item.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {item.model.name}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{item.createdAt}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/analysis/${item.id}`);
                      }}
                      className="text-xs font-mono text-[#c2410c] hover:underline font-semibold cursor-pointer"
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Available Capabilities */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-5">
        <div className="flex items-center space-x-2 mb-4">
          <Terminal className="w-4 h-4 text-slate-700" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-800 font-mono">
            Analytical Capabilities Matrix
          </h2>
          <span className="text-[11px] font-mono text-slate-400 ml-2">
            (Technical capability readiness, no fabricated benchmark metrics)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">Single-image VQA</span>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                WORKING POC
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Natural-language questions answered over satellite imagery using Qwen2.5-VL-3B-Instruct.
            </p>
            <div className="mt-2 text-[10px] font-mono text-slate-400">
              Modality: Optical (RGB) • Model: Qwen-VL
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">Scene Understanding</span>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                DEMONSTRATED
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Automated scene captioning, land-cover pattern recognition, and environmental descriptions.
            </p>
            <div className="mt-2 text-[10px] font-mono text-slate-400">
              Modality: Optical (Multispectral/RGB)
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">Vessel & Dock Detection</span>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-[#c2410c] border border-orange-200">
                DEMO / MOCK
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Bounding box regression and confidence estimation for maritime vessels and port infrastructure.
            </p>
            <div className="mt-2 text-[10px] font-mono text-slate-400">
              Modality: Optical v2.4.1 (YOLOv8)
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">SAR Amplitude Analysis</span>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                PLANNED
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              All-weather radar imaging and coherence change detection pipeline for cloud-penetrating surveillance.
            </p>
            <div className="mt-2 text-[10px] font-mono text-slate-400">
              Modality: SAR (Sentinel-1 C-Band)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
