import { useState, useEffect } from 'react'
import { LayoutDashboard, Zap, Activity, Terminal, Download, Shield, Trash2, HardDrive, Rocket, X, Minus, Square } from 'lucide-react'
import clsx from 'clsx'
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
import { useLog } from './context/LogContext'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const { addLog } = useLog()

  useEffect(() => {
    addLog('SYSTEM', 'Pulse Engine v1.0.0 Initialized')
  }, [addLog])

  const handleWindowControl = (action: 'minimize' | 'maximize' | 'close') => {
    window.ipcRenderer?.invoke(`window-${action}`)
  }

  if (isLoading) {
    return <LoadingScreen onComplete={() => setIsLoading(false)} />
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'system', label: 'System Info', icon: Activity },
    { id: 'optimizer', label: 'Optimizer', icon: Zap },
    { id: 'startup', label: 'Startup', icon: Rocket },
    { id: 'storage', label: 'Storage', icon: HardDrive },
    { id: 'debloater', label: 'Debloater', icon: Trash2 },
    { id: 'software', label: 'Software', icon: Download },
    { id: 'tools', label: 'Tools', icon: Shield },
  ]

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans bg-grid-pattern relative">
      <div className="scanline" />

      {/* Top Navbar */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 titlebar-drag-region backdrop-blur-xl bg-gradient-to-r from-[#0f1419] via-[#0d1117] to-[#0a0e13] z-50 shadow-2xl shadow-black/50">
        {/* Logo */}
        <div className="flex items-center gap-3 no-drag">
          <Terminal className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.6)]" />
          <span className="font-bold tracking-wider text-lg">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-glow-purple">PULSE</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex items-center justify-center gap-1 px-4 no-drag">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium group relative",
                activeTab === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <item.icon className={clsx(
                "w-4 h-4 transition-all",
                activeTab === item.id && "drop-shadow-[0_0_6px_rgba(124,58,237,0.8)]"
              )} />
              <span>{item.label}</span>
              {activeTab === item.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
              )}
            </button>
          ))}
        </nav>

        {/* Window Controls */}
        <div className="flex items-center gap-2 no-drag">
          <button onClick={() => handleWindowControl('minimize')} className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => handleWindowControl('maximize')} className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors">
            <Square className="w-3 h-3" />
          </button>
          <button onClick={() => handleWindowControl('close')} className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

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
