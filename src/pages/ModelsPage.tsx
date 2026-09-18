import React, { useEffect, useState } from 'react';
import type { ModelInfo } from '../types';
import { modelService } from '../services/modelService';

export const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);

  useEffect(() => {
    modelService.getModels().then(setModels);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-6 select-none">
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Model Registry & Engine Adapters</h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-50 text-[#c2410c] border border-orange-200 font-medium">
            AI WORKERS
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configured remote sensing models, Colab T4 GPU endpoints, and vision-language adapters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
        {models.map((m) => (
          <div key={m.id} className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {m.version}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                  m.status === 'available'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {m.status.toUpperCase()}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mb-1">{m.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>

              <div className="mt-4 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-500">
                  <span>Modality:</span>
                  <span className="font-semibold text-slate-700 uppercase">{m.modality.join(', ')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Environment:</span>
                  <span className="text-slate-700 truncate max-w-[170px]">{m.environment}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap gap-1">
              {m.tasks.map((t) => (
                <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
