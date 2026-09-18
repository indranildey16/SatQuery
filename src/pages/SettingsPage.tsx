import React, { useState } from 'react';
import { Server, Check, RefreshCw } from 'lucide-react';
import { apiClient, API_BASE_URL } from '../services/apiClient';

export const SettingsPage: React.FC = () => {
  const [apiUrl, setApiUrl] = useState(API_BASE_URL);
  const [isMock, setIsMock] = useState(apiClient.getMockStatus());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    apiClient.setMockStatus(isMock);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#f8fafc] p-6 select-none">
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">API & System Settings</h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
            CONFIG
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure backend connection endpoints, mock service runtime, and sensor defaults.
        </p>
      </div>

      <div className="max-w-2xl space-y-6 my-6">
        {/* Backend API Connection */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-900 mb-2">
            <Server className="w-4 h-4 text-[#c2410c]" />
            <span>FastAPI Gateway Endpoint</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            The target FastAPI inference service endpoint. When Mock Mode is disabled, requests route here.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-700 mb-1">
                VITE_API_BASE_URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 rounded-md border border-slate-300 text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#c2410c]"
              />
            </div>
          </div>
        </div>

        {/* Mock API Mode Toggle */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">Deterministic Mock Service Provider</div>
              <p className="text-xs text-slate-500 mt-0.5">
                Emulates the Qwen-VL Colab inference backend with instant pipeline responses.
              </p>
            </div>
            <button
              onClick={() => setIsMock(!isMock)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition cursor-pointer ${
                isMock ? 'bg-[#c2410c] text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isMock ? 'Mock Enabled' : 'Live Gateway'}
            </button>
          </div>
        </div>

        {/* Save button */}
        <div>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#c2410c] hover:bg-[#9a3412] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            <span>{saved ? 'Configuration Saved' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
