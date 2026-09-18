import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { Analysis } from '../types';
import { analysisService } from '../services/analysisService';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    analysisService.getRecentAnalyses().then(setAnalyses);
  }, []);

  const filtered = analyses.filter((a) =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.query.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Analysis History & Execution Logs</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              AUDIT TRAIL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete historical record of remote sensing runs, queries, inference models, and confidence outputs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by ID, query, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-md border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#c2410c]"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden my-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-mono uppercase text-slate-500">
                <th className="py-2.5 px-4 font-semibold">Analysis ID</th>
                <th className="py-2.5 px-4 font-semibold">Title</th>
                <th className="py-2.5 px-4 font-semibold">Modality</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold">Model</th>
                <th className="py-2.5 px-4 font-semibold">Execution Time</th>
                <th className="py-2.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr 
                  key={item.id}
                  className="hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => navigate(`/analysis/${item.id}`)}
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#c2410c]">{item.id}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{item.title}</td>
                  <td className="py-3 px-4 font-mono uppercase text-[10px] text-sky-700">
                    {item.input.metadata.modality}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{item.model.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{item.createdAt}</td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-[#c2410c] font-mono text-xs font-semibold hover:underline cursor-pointer">
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
