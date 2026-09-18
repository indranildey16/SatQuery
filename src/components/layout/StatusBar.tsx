import React from 'react';
import { apiClient } from '../../services/apiClient';

export const StatusBar: React.FC = () => {
  const isMock = apiClient.getMockStatus();

  return (
    <footer className="h-6 bg-[#f8fafc] border-t border-slate-200 px-3 flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0 select-none">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
          <span className="text-slate-400">VITE_API_BASE_URL:</span>
          <span className={isMock ? 'text-[#c2410c] font-medium' : 'text-emerald-700 font-medium'}>
            {isMock ? '[Mock Mode Active]' : '[Live API Connected]'}
          </span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="hidden sm:flex items-center space-x-1.5 text-slate-500">
          <span>Sensors: Optical (Sentinel-2/Landsat-9) • SAR (Sentinel-1 C-Band)</span>
        </div>
      </div>

      <div className="flex items-center space-x-3 text-slate-500">
        <div>
          <span>EPSG: </span>
          <span className="text-emerald-700 font-medium">4326</span>
          <span className="text-slate-300"> / </span>
          <span className="text-emerald-700 font-medium">32618</span>
        </div>
        <span className="text-slate-300">•</span>
        <div>
          <span>LATENCY: </span>
          <span className="text-slate-700 font-medium">24ms</span>
        </div>
      </div>
    </footer>
  );
};
