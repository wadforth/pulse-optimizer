import { useState, useEffect } from 'react'

import { Dashboard } from './components/Dashboard'
import { SystemInfo } from './components/SystemInfo'
import { Optimizer } from './components/Optimizer'
import { Tools } from './components/Tools'
import { Settings } from './components/Settings'
import { StartupManager } from './components/StartupManager'
import { StorageCleaner } from './components/StorageCleaner'
import { Debloater } from './components/Debloater'
import { SoftwareStore } from './components/SoftwareStore'
import { Footer } from './components/Footer'
import { LoadingScreen } from './components/LoadingScreen'
import { Navbar } from './components/Navbar'
import { useLog } from './context/LogContext'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const { addLog } = useLog()

  useEffect(() => {
    addLog('SYSTEM', 'Pulse Engine v2.0.0 Initialized')
  }, [addLog])

  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
    window.ipcRenderer?.invoke(`window-${action}`)
  }

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />
  }



  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans bg-grid-pattern relative">
      <div className="scanline" />

      {/* Top Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onWindowControl={handleWindowControl} />

      {/* Main Content Area */}
      < div className="flex-1 flex overflow-hidden relative" >
        {/* Content */}
        < main className="flex-1 overflow-hidden relative flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-7xl mx-auto animate-in fade-in zoom-in duration-300">
              {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
              {activeTab === 'system' && <SystemInfo />}
              {activeTab === 'optimizer' && <Optimizer />}
              {activeTab === 'tools' && <Tools />}
              {activeTab === 'software' && <SoftwareStore />}
              {activeTab === 'settings' && <Settings />}
              {activeTab === 'debloater' && <Debloater />}
              {activeTab === 'startup' && <StartupManager />}
              {activeTab === 'storage' && <StorageCleaner />}
            </div>
          </div>

          {/* Footer */}
          <Footer onNavigate={setActiveTab} />
        </main>
      </div>
    </div >
  )
}

export default App
