import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Clock, ArrowRight } from 'lucide-react';
import type { Project } from '../types';
import { projectService } from '../services/projectService';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    projectService.getProjects().then(setProjects);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-6 select-none">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Project Repository</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-50 text-[#c2410c] border border-orange-200 font-medium">
              AOI COLLECTIONS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage geospatial projects, satellite imagery batches, and collaborative analysis runs.
          </p>
        </div>

        <button 
          onClick={() => navigate('/analysis/new')}
          className="flex items-center space-x-2 py-2 px-3.5 rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white font-medium text-xs shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
        {projects.map((p) => (
          <div key={p.id} className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#c2410c]">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {p.analysisCount} Analyses
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{p.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400">
                <Clock className="w-3 h-3" />
                <span>{p.lastUpdated}</span>
              </div>
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-xs font-semibold text-[#c2410c] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <span>Open AOI</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
