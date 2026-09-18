import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Radio } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const workflow = [
    { step: '01', title: 'Upload', desc: 'Ingest optical multispectral or SAR C-band satellite imagery.' },
    { step: '02', title: 'Query', desc: 'Input natural-language analytical questions or targeted inquiries.' },
    { step: '03', title: 'Route', desc: 'Automatic task resolution and model routing (Qwen2.5-VL / YOLOv8).' },
    { step: '04', title: 'Analyze', desc: 'Execute multimodal inference with Colab GPU worker adapter.' },
    { step: '05', title: 'Inspect', desc: 'Interact with visual overlays, bounding boxes, and execution trace.' }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] text-slate-900 select-none">
      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#c2410c] text-xs font-mono mb-6">
          <Radio className="w-3.5 h-3.5" />
          <span>V2.4-ORBIT • Remote-Sensing Image Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
          SatQuery AI
        </h1>
        <p className="text-lg font-medium text-slate-700 mb-2">
          Remote-Sensing Image Intelligence
        </p>
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed mb-8">
          Query satellite imagery using natural-language analysis. Inspect multimodal vision-language evidence, marine infrastructure, and land-cover dynamics.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => navigate('/analysis/new')}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold shadow-sm transition cursor-pointer"
          >
            <span>Start Analysis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/analysis/ANL-2024-8841')}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-2xs transition cursor-pointer"
          >
            <span>Explore Demo</span>
          </button>
        </div>
      </div>

      {/* Prominent Satellite Image Hero Preview */}
      <div className="max-w-4xl mx-auto px-6 mb-14">
        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm overflow-hidden">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900">
            <img
              src="/samples/guinea-bissau-sample.jpg"
              alt="Sentinel-2 Satellite Scene"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-mono">
              <div className="flex items-center space-x-2 bg-black/60 px-2.5 py-1 rounded backdrop-blur-xs border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <span>Copernicus Sentinel-2 • 10m Ground Sample Distance</span>
              </div>
              <div className="hidden sm:block text-[11px] text-slate-300">
                Lat: 11.8037° N, Lng: -15.1804° W
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Step Compact Workflow */}
      <div className="max-w-5xl mx-auto px-6 mb-16">
        <div className="text-center mb-8">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
            SYSTEM WORKFLOW
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">End-to-End Analysis Pipeline</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {workflow.map((w) => (
            <div key={w.step} className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs">
              <div className="text-xs font-mono font-bold text-[#c2410c] mb-1">{w.step}</div>
              <div className="text-xs font-bold text-slate-900 mb-1">{w.title}</div>
              <div className="text-[11px] text-slate-500 leading-relaxed">{w.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Technical Capabilities */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-white border border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 mb-1">Optical Multispectral</h3>
            <p className="text-[11px] text-slate-600">
              Sentinel-2 & Landsat-9 band combinations, TrueColor, NDVI vegetation indexing, and water delineation.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white border border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 mb-1">Natural-Language Queries</h3>
            <p className="text-[11px] text-slate-600">
              Direct remote sensing inquiries interpreted through multimodal visual question answering.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white border border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 mb-1">Colab Inference Adapter</h3>
            <p className="text-[11px] text-slate-600">
              Clean API abstraction for Qwen2.5-VL-3B-Instruct model pipeline running on Tesla T4 compute.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
