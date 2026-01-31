import { useState } from 'react';
import SyncDashboard from './feature/SyncDashboard';
import TabletSync from './feature/TabletSync';
import { HardDrive, Tablet, FolderSync } from 'lucide-react';
import aniwheel from './assets/aniwheel.gif';
import './App.css';

function App() {
  // Shared State for Paths
  const [sharedDestination, setSharedDestination] = useState('/Volumes/NK-Working/Dummy/');
  const [activeTab, setActiveTab] = useState('media-sync');

  return (
    <div className="flex h-screen w-screen bg-dark-900 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-16 flex flex-col items-center py-6 border-r border-dark-800 bg-dark-900 z-50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-900/30 mb-8 overflow-hidden bg-black">
          <img src={aniwheel} alt="Logo" className="w-full h-full object-contain" />
        </div>

        <div className="flex flex-col gap-4 w-full px-2">
          <SidebarItem
            active={activeTab === 'media-sync'}
            onClick={() => setActiveTab('media-sync')}
            icon={<HardDrive className="w-6 h-6" />}
            label="Media Sync"
          />
          <SidebarItem
            active={activeTab === 'tablet-sync'}
            onClick={() => setActiveTab('tablet-sync')}
            icon={<Tablet className="w-6 h-6" />}
            label="Tablet Sync"
          />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'media-sync' ? (
          <SyncDashboard onDestinationChange={setSharedDestination} initialDestination={sharedDestination} />
        ) : (
          <TabletSync initialSourcePath={sharedDestination} />
        )}
      </main>
    </div>
  );
}

function SidebarItem({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 group relative
        ${active ? 'bg-dark-800 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300 hover:bg-dark-800/50'}
      `}
      title={label}
    >
      {icon}
      {active && <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary-500 rounded-r-full" />}
    </button>
  );
}

export default App;
