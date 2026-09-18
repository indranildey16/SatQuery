import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  LayoutDashboard, 
  Crosshair, 
  FolderKanban, 
  History, 
  Boxes, 
  Sliders 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Analysis Workspace', path: '/analysis/ANL-2024-8841', icon: Crosshair },
    { label: 'Project Repository', path: '/projects', icon: FolderKanban },
    { label: 'History & Logs', path: '/history', icon: History },
    { label: 'Model Registry', path: '/models', icon: Boxes },
    { label: 'API & Settings', path: '/settings', icon: Sliders },
  ];

  return (
    <aside className="w-56 bg-[#fbfbfb] border-r border-slate-200 flex flex-col justify-between shrink-0 select-none">
      {/* Top Section */}
      <div className="p-3">
        {/* Navigation Deck Label */}
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            NAVIGATION DECK
          </span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 font-medium">
            EO-NODE
          </span>
        </div>

        {/* Primary CTA: + New Analysis */}
        <button
          onClick={() => navigate('/analysis/new')}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 mb-4 rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white font-medium text-xs shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Analysis</span>
        </button>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-medium transition ${
                    isActive
                      ? 'bg-[#fef4ee] text-[#c2410c] border border-[#fed7aa] shadow-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Telemetry Box */}
      <div className="p-3 border-t border-slate-200 bg-white/60">
        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between text-[10px] font-mono mb-1">
            <span className="text-slate-500 font-medium">TARGET ENGINE</span>
            <span className="text-amber-600 font-semibold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              <span>READY (MOCK)</span>
            </span>
          </div>
          <div className="text-[11px] font-mono font-medium text-slate-800 truncate mb-2">
            Colab GPU / T4 Tensor
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#c2410c] w-3/4 rounded-full"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};
