import React, { useState } from 'react';
import { Radio, Crosshair, Bell, LayoutGrid, Cpu } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface TopBarProps {
  onToggleMock?: (enabled: boolean) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMock }) => {
  const [mockActive, setMockActive] = useState(apiClient.getMockStatus());

  const handleToggle = () => {
    const next = !mockActive;
    setMockActive(next);
    apiClient.setMockStatus(next);
    onToggleMock?.(next);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Left: Branding & Tagline */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#c2410c] shadow-xs">
          <Radio className="w-4 h-4 text-[#c2410c] stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-tight text-slate-900 text-sm font-sans">
              SATQUERY AI
            </span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 leading-none">
              V2.4-ORBIT
            </span>
          </div>
          <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-medium leading-none mt-0.5">
            GEOSPATIAL INTELLIGENCE ENGINE
          </div>
        </div>
      </div>

      {/* Center: System Status & Telemetry */}
      <div className="hidden md:flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-[11px]">Mock Inference Engine (Colab-Ready)</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-500">
          <Crosshair className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px]">40°42'46" N, 74°00'21" W</span>
          <span className="text-slate-300">•</span>
          <span className="text-[10px] text-slate-400">WGS 84 / UTM 18N</span>
        </div>
      </div>

      {/* Right: Controls & Mock Toggle */}
      <div className="flex items-center space-x-3">
        {/* API Mock Mode Switch */}
        <div 
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer transition text-xs font-mono"
          title="Toggle Mock / Live API integration mode"
        >
          <Cpu className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-700 font-medium text-[11px]">API MOCK</span>
          <div className={`w-8 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${mockActive ? 'bg-[#c2410c]' : 'bg-slate-300'}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform ${mockActive ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </div>

        <button 
          className="w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition"
          aria-label="Layout view"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        <button 
          className="w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition relative"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#c2410c]"></span>
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-[#c2410c] flex items-center justify-center text-white text-xs font-semibold shadow-xs">
          SQ
        </div>
      </div>
    </header>
  );
};
