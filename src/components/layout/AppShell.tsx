import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';

export const AppShell: React.FC = () => {
  const [, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] text-slate-900 overflow-hidden select-none font-sans">
      {/* Top Application Bar */}
      <TopBar onToggleMock={() => setRefreshKey((k) => k + 1)} />

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Dynamic Page Content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <Outlet />
        </main>
      </div>

      {/* Persistent Technical Status Strip */}
      <StatusBar />
    </div>
  );
};
