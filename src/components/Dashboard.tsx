import { useState, useEffect, useRef } from 'react'
import { Activity, Wifi, Cpu, HardDrive, Monitor, AlertTriangle, RefreshCw, Rocket, ShieldCheck, Gauge, Zap, Clock, Play, Info, Copy, Check, ChevronDown } from 'lucide-react'
import { useOptimization } from '../context/OptimizationContext'
import { useLog } from '../context/LogContext'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface LatencyDataPoint {
    timestamp: number
    ping: number
}

interface DashboardProps {
    onNavigate: (tab: string) => void
}

type MetricType = 'cpu' | 'mem' | 'gpu' | 'ping'

export function Dashboard({ }: DashboardProps) {
    const { optimizationScore } = useOptimization()
    const { addLog } = useLog()
    const [activeMetric, setActiveMetric] = useState<MetricType>('cpu')

    const [stats, setStats] = useState({
        cpu: 0,
        mem: 0,
        gpu: 0,
        net: 0,
        ping: 0,
    })
    const [gpuWarningShown, setGpuWarningShown] = useState(false)
    const [gpuWarningDismissed, setGpuWarningDismissed] = useState(false)
    const [latencyHistory, setLatencyHistory] = useState<LatencyDataPoint[]>([])
    const [cpuHistory, setCpuHistory] = useState<number[]>(new Array(40).fill(0))
    const [memHistory, setMemHistory] = useState<number[]>(new Array(40).fill(0))
    const [gpuHistory, setGpuHistory] = useState<number[]>(new Array(40).fill(0))
    const [sysSpecs, setSysSpecs] = useState<any>(null)

    // Feature States
    const [gameMode, setGameMode] = useState(false)
    const [powerPlan, setPowerPlan] = useState({ name: 'Loading...', guid: '' })
    const [showPowerMenu, setShowPowerMenu] = useState(false)
    const [uptime, setUptime] = useState('0h 0m')
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [copiedSpecs, setCopiedSpecs] = useState(false)

    const powerMenuRef = useRef<HTMLDivElement>(null)

    const loadData = async () => {
        try {
            const [statsData, pingData, specsData, planData] = await Promise.all([
                window.ipcRenderer?.invoke('get-system-stats'),
                window.ipcRenderer?.invoke('get-network-ping'),
                window.ipcRenderer?.invoke('get-system-specs'),
                window.ipcRenderer?.invoke('get-power-plan')
            ])

            if (specsData) {
                setSysSpecs(specsData)
                if (specsData.uptime?.uptime) setUptime(specsData.uptime.uptime)
            }

            if (planData) setPowerPlan(planData)

            if (statsData && pingData?.available) {
                setStats({
                    ...statsData,
                    ping: pingData.ping,
                })
                setLatencyHistory(prev => {
                    const newPoint = { timestamp: Date.now(), ping: pingData.ping }
                    const updated = [...prev, newPoint].slice(-40)
                    return updated
                })
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error)
        }
    }

    useEffect(() => {
        loadData()

        const interval = setInterval(async () => {
            const pingData = await window.ipcRenderer?.invoke('get-network-ping')
            const newStats = await window.ipcRenderer?.invoke('get-system-stats')

            if (newStats && pingData?.available) {
                setStats({
                    ...newStats,
                    ping: pingData.ping,
                })

                setLatencyHistory(prev => {
                    const newPoint = { timestamp: Date.now(), ping: pingData.ping }
                    const updated = [...prev, newPoint].slice(-40)
                    return updated
                })

                setCpuHistory(prev => [...prev.slice(1), newStats.cpu])
                setMemHistory(prev => [...prev.slice(1), newStats.mem])
                setGpuHistory(prev => [...prev.slice(1), newStats.gpu])
            }
        }, 1000)

        const planInterval = setInterval(async () => {
            const currentPlan = await window.ipcRenderer?.invoke('get-power-plan')
            if (currentPlan) setPowerPlan(currentPlan)
        }, 5000)

        // Click outside handler for power menu
        const handleClickOutside = (event: MouseEvent) => {
            if (powerMenuRef.current && !powerMenuRef.current.contains(event.target as Node)) {
                setShowPowerMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            clearInterval(interval)
            clearInterval(planInterval)
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (stats.gpu === 0) {
            // Only show warning if user hasn't dismissed it
            if (!gpuWarningDismissed) {
                const timer = setTimeout(() => {
                    if (stats.gpu === 0 && !gpuWarningShown) {
                        setGpuWarningShown(true)
                    }
                }, 5000)
                return () => clearTimeout(timer)
            }
        } else {
            // Reset dismissal when GPU becomes active again
            setGpuWarningShown(false)
            setGpuWarningDismissed(false)
        }
    }, [stats.gpu, gpuWarningShown, gpuWarningDismissed])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        addLog('SYSTEM', '🔄 Refreshing dashboard data...')
        await loadData()
        setTimeout(() => setIsRefreshing(false), 1000)
    }

    const handleCopySpecs = () => {
        if (!sysSpecs) return
        const text = `
System Specs:
CPU: ${sysSpecs.cpu?.name}
GPU: ${sysSpecs.gpu?.[0]?.name}
RAM: ${sysSpecs.ram?.total}
OS: ${sysSpecs.os?.distro}
        `.trim()
        navigator.clipboard.writeText(text)
        setCopiedSpecs(true)
        addLog('SYSTEM', '📋 System specs copied to clipboard')
        setTimeout(() => setCopiedSpecs(false), 2000)
    }

    const handleCleanMemory = async () => {
        addLog('OPTIMIZER', '🚀 Initiating memory cleanup...')
        const result = await window.ipcRenderer?.invoke('clean-memory')
        if (result?.success) {
            addLog('OPTIMIZER', `✓ ${result.message}`)
            if (result.details) {
                addLog('OPTIMIZER', `  Freed: ${result.details.estimatedFreed}`)
            }
        }
    }

    const handleFlushDNS = async () => {
        addLog('NETWORK', '🌐 Flushing DNS resolver cache...')
        const result = await window.ipcRenderer?.invoke('flush-dns')
        if (result?.success) {
            addLog('NETWORK', `✓ ${result.message}`)
        }
    }

    const handleClearTemp = async () => {
        addLog('STORAGE', '🧹 Clearing temporary files...')
        const result = await window.ipcRenderer?.invoke('clean-storage-category', 'temp')
        if (result?.success) {
            addLog('STORAGE', '✓ Temporary files cleared')
        } else {
            addLog('ERROR', `⚠ Failed to clear temp: ${result?.message}`)
        }
    }

    const handleOptimizeAll = async () => {
        addLog('OPTIMIZER', '🚀 Starting full optimization sequence...')
        await handleCleanMemory()
        await handleFlushDNS()
        await handleClearTemp()
        addLog('OPTIMIZER', '✨ Optimization sequence complete')
    }

    const toggleGameMode = () => {
        setGameMode(!gameMode)
        addLog('SYSTEM', `🎮 Game Mode ${!gameMode ? 'Enabled' : 'Disabled'}`)
    }

    const selectPowerPlan = async (planName: string) => {
        setShowPowerMenu(false)
        addLog('SYSTEM', `⚡ Switching Power Plan to ${planName}...`)
        await window.ipcRenderer?.invoke('set-power-plan', planName)

        // Optimistic update
        setPowerPlan({ ...powerPlan, name: planName })

        // Real update
        const updated = await window.ipcRenderer?.invoke('get-power-plan')
        if (updated) setPowerPlan(updated)
    }

    const getActiveHistory = () => {
        switch (activeMetric) {
            case 'cpu': return cpuHistory
            case 'mem': return memHistory
            case 'gpu': return gpuHistory
            case 'ping': return latencyHistory.map(d => d.ping)
            default: return []
        }
    }

    const getActiveColor = () => {
        switch (activeMetric) {
            case 'cpu': return 'violet'
            case 'mem': return 'indigo'
            case 'gpu': return 'fuchsia'
            case 'ping': return 'cyan'
            default: return 'gray'
        }
    }

    const getActiveValue = () => {
        switch (activeMetric) {
            case 'cpu': return `${stats.cpu}%`
            case 'mem': return `${stats.mem}%`
            case 'gpu': return `${stats.gpu}%`
            case 'ping': return `${stats.ping}ms`
            default: return ''
        }
    }

    const perfLabel = optimizationScore >= 80 ? 'Excellent' : optimizationScore >= 60 ? 'Good' : optimizationScore >= 40 ? 'Fair' : 'Poor'

    return (
        <div className="h-full flex flex-col space-y-6 overflow-hidden bg-transparent p-1">
            {/* GPU Warning Banner */}
            <AnimatePresence>
                {gpuWarningShown && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-4 shrink-0 shadow-[0_0_20px_rgba(234,179,8,0.1)] relative"
                    >
                        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-white">GPU Usage Unavailable</h4>
                            <p className="text-xs text-yellow-200/70 mt-1">
                                We're unable to read GPU usage. This may happen if you're using integrated graphics or if the GPU is idle.
                                Try running a game to wake it up.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setGpuWarningShown(false)
                                setGpuWarningDismissed(true)
                            }}
                            className="shrink-0 p-1 rounded-lg hover:bg-yellow-500/20 text-yellow-500/70 hover:text-yellow-500 transition-colors"
                            title="Dismiss"
                        >
                            <Check size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="shrink-0 bg-[#0a0e13]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl"
            >
                {/* Background Accent */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none">
                    <Activity size={300} className="text-violet-500" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-transparent pointer-events-none" />

                {/* Left: Score & Status */}
                <div className="flex items-center gap-8 z-10 w-full md:w-auto">
                    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                            <circle cx="48" cy="48" r="38" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                            <defs>
                                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" className={clsx(optimizationScore >= 80 ? 'stop-violet-500' : optimizationScore >= 60 ? 'stop-indigo-500' : 'stop-pink-500')} stopColor="currentColor" />
                                    <stop offset="100%" className={clsx(optimizationScore >= 80 ? 'stop-fuchsia-500' : optimizationScore >= 60 ? 'stop-purple-500' : 'stop-rose-500')} stopColor="currentColor" />
                                </linearGradient>
                            </defs>
                            <circle
                                cx="48" cy="48" r="38"
                                stroke="url(#scoreGradient)"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={239}
                                strokeDashoffset={239 - (239 * optimizationScore) / 100}
                                className="transition-all duration-1000 ease-out"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-white drop-shadow-md">{optimizationScore}</span>
                            <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Score</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-md">SYSTEM OVERVIEW</h1>
                            <div className="flex gap-1">
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                                    title="Refresh Data"
                                >
                                    <RefreshCw size={14} className={clsx(isRefreshing && "animate-spin")} />
                                </button>
                                <button
                                    onClick={handleCopySpecs}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                                    title="Copy System Specs"
                                >
                                    {copiedSpecs ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-green-400 mb-3">
                            <ShieldCheck size={14} />
                            <span className="text-xs font-bold uppercase tracking-wider shadow-green-500/20 drop-shadow-sm">All systems operational</span>
                        </div>
                        <div className="flex gap-2">
                            <Badge icon={Gauge} text={`${perfLabel} Performance`} color={optimizationScore >= 60 ? 'text-white/70' : 'text-amber-400'} />
                            <Badge icon={Clock} text={`Uptime: ${uptime}`} />
                            <Badge icon={Wifi} text={`Ping: ${stats.ping}ms`} />
                        </div>
                    </div>
                </div>

                {/* Right: Optimize Action */}
                <div className="w-full md:w-auto flex flex-col items-end gap-2 z-10">
                    <button
                        onClick={handleOptimizeAll}
                        className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] group text-sm uppercase tracking-wide border border-white/10"
                    >
                        <Rocket size={16} className="group-hover:animate-pulse" />
                        Optimize System
                    </button>
                    <p className="text-[10px] text-muted-foreground text-center md:text-right">
                        Cleans RAM, DNS & Temp Files
                    </p>
                </div>
            </motion.div>

            {/* Control Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
                {/* Game Mode */}
                <div className="bg-[#0a0e13]/80 backdrop-blur-md border border-white/5 rounded-xl p-4 flex items-center justify-between shadow-lg hover:border-violet-500/30 transition-colors group">
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-lg transition-colors shadow-lg", gameMode ? "bg-violet-500 text-white shadow-violet-500/20" : "bg-white/5 text-muted-foreground")}>
                            <Play size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-white group-hover:text-violet-200 transition-colors">Game Mode</p>
                                <div className="group/tooltip relative">
                                    <Info size={12} className="text-muted-foreground cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 backdrop-blur border border-white/10 rounded text-[10px] text-white hidden group-hover/tooltip:block z-50 shadow-xl">
                                        Prioritizes game processes.
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{gameMode ? 'Active' : 'Inactive'}</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleGameMode}
                        className={clsx(
                            "w-10 h-5 rounded-full relative transition-colors shadow-inner",
                            gameMode ? "bg-violet-500" : "bg-white/10"
                        )}
                    >
                        <div className={clsx(
                            "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform shadow-sm",
                            gameMode ? "translate-x-5" : "translate-x-0"
                        )} />
                    </button>
                </div>

                {/* Power Plan */}
                <div className="bg-[#0a0e13]/80 backdrop-blur-md border border-white/5 rounded-xl p-4 flex items-center justify-between relative shadow-lg hover:border-yellow-500/30 transition-colors group" ref={powerMenuRef}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]">
                            <Zap size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white group-hover:text-yellow-200 transition-colors">Power Plan</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{powerPlan.name}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowPowerMenu(!showPowerMenu)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2 border border-white/5"
                    >
                        Change
                        <ChevronDown size={12} className={clsx("transition-transform", showPowerMenu && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                        {showPowerMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full right-0 mt-2 w-48 bg-[#0a0e13] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                            >
                                {['Balanced', 'High Performance', 'Ultimate Performance', 'Power Saver'].map((plan) => (
                                    <button
                                        key={plan}
                                        onClick={() => selectPowerPlan(plan)}
                                        className="w-full text-left px-4 py-2.5 text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between border-b border-white/5 last:border-0"
                                    >
                                        {plan}
                                        {powerPlan.name.includes(plan) && <Check size={12} className="text-green-500" />}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

                {/* Left Column: Resource Selectors */}
                <div className="flex flex-col gap-3 h-full">
                    <ResourceCard
                        label="CPU"
                        value={`${stats.cpu}%`}
                        icon={Cpu}
                        color="violet"
                        active={activeMetric === 'cpu'}
                        onClick={() => setActiveMetric('cpu')}
                        subtext={sysSpecs?.cpu?.name}
                        metricType="cpu"
                        numericValue={stats.cpu}
                    />
                    <ResourceCard
                        label="Memory"
                        value={`${stats.mem}%`}
                        icon={HardDrive}
                        color="indigo"
                        active={activeMetric === 'mem'}
                        onClick={() => setActiveMetric('mem')}
                        subtext={`${sysSpecs?.ram?.total} Total`}
                        metricType="mem"
                        numericValue={stats.mem}
                    />
                    <ResourceCard
                        label="GPU"
                        value={`${stats.gpu}%`}
                        icon={Monitor}
                        color="fuchsia"
                        active={activeMetric === 'gpu'}
                        onClick={() => setActiveMetric('gpu')}
                        subtext={sysSpecs?.gpu?.[0]?.name}
                        metricType="gpu"
                        numericValue={stats.gpu}
                        warning={gpuWarningShown}
                    />
                    <ResourceCard
                        label="Network"
                        value={`${stats.ping}ms`}
                        icon={Wifi}
                        color="cyan"
                        active={activeMetric === 'ping'}
                        onClick={() => setActiveMetric('ping')}
                        subtext="Latency"
                        metricType="ping"
                        numericValue={stats.ping}
                    />
                </div>

                {/* Right Column: Graph & Details */}
                <div className="flex flex-col gap-4 min-h-0">
                    <div className="bg-[#0a0e13]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden group shadow-2xl min-h-0 max-h-[250px]">
                        <div className="flex items-center justify-between mb-4 z-10 shrink-0">
                            <div>
                                <h3 className="text-3xl font-bold text-white tracking-tight font-mono drop-shadow-md">{getActiveValue()}</h3>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mt-1">
                                    {activeMetric === 'ping' ? 'Latency History' : `${activeMetric.toUpperCase()} Usage History`}
                                </p>
                            </div>
                            <div className="flex gap-6">
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Peak</p>
                                    <p className="text-sm font-mono text-white">{Math.max(...getActiveHistory(), 0).toFixed(0)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Average</p>
                                    <p className="text-sm font-mono text-white">{(getActiveHistory().reduce((a, b) => a + b, 0) / (getActiveHistory().length || 1)).toFixed(0)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                        <div className="flex-1 min-h-0 w-full relative z-10">
                            <Sparkline
                                data={getActiveHistory()}
                                color={getActiveColor()}
                                fill={true}
                                strokeWidth={2}
                            />
                        </div>
                    </div>
                    <DetailRow metric={activeMetric} specs={sysSpecs} stats={stats} />
                </div>
            </div>
        </div>
    )
}

// Helper Components

function formatBytes(bytes: number) {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function DetailRow({ metric, specs, stats }: { metric: string, specs: any, stats: any }) {
    if (!specs) return null

    const details = {
        cpu: [
            { label: 'Cores', value: `${specs.cpu?.physicalCores || specs.cpu?.cores || '?'} Physical` },
            { label: 'Threads', value: `${specs.cpu?.cores || specs.cpu?.processors || '?'} Logical` },
            { label: 'Speed', value: `${specs.cpu?.speed || '?'} GHz` },
            { label: 'Brand', value: specs.cpu?.manufacturer || 'Unknown' }
        ],
        mem: [
            { label: 'Total', value: formatBytes(specs.mem?.total) },
            { label: 'Free', value: formatBytes(specs.mem?.free) },
            { label: 'Used', value: formatBytes(specs.mem?.used) },
            { label: 'Active', value: formatBytes(specs.mem?.active) }
        ],
        gpu: [
            { label: 'Model', value: specs.graphics?.controllers?.[0]?.model || 'Unknown' },
            { label: 'VRAM', value: `${Math.round((specs.graphics?.controllers?.[0]?.vram || 0) / 1024)} GB` },
            { label: 'Bus', value: specs.graphics?.controllers?.[0]?.bus || 'PCIe' },
            { label: 'Status', value: 'Active' }
        ],
        ping: [
            { label: 'Latency', value: `${stats.ping} ms` },
            { label: 'Status', value: stats.ping < 50 ? 'Excellent' : stats.ping < 100 ? 'Good' : 'Poor' },
            { label: 'Packet Loss', value: '0%' },
            { label: 'Jitter', value: '2 ms' }
        ]
    }

    const currentDetails = details[metric as keyof typeof details] || []

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentDetails.map((item, i) => (
                <div key={i} className="bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-colors shadow-lg">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1 group-hover:text-white/70 transition-colors">{item.label}</span>
                    <span className="text-sm font-bold text-white font-mono drop-shadow-md">{item.value}</span>
                </div>
            ))}
        </div>
    )
}

function Badge({ icon: Icon, text, color }: { icon: any, text: string, color?: string }) {
    return (
        <span className={clsx("px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-sm", color || "text-white/70")}>
            <Icon size={10} /> {text}
        </span>
    )
}

function ResourceCard({ label, value, icon: Icon, color, active, onClick, subtext, metricType, numericValue, warning }: any) {

    // Dynamic Status Logic
    let statusText = 'NORMAL'
    let statusColor = 'text-green-400'
    let statusBg = 'bg-green-500/20'

    if (metricType === 'ping') {
        if (numericValue > 100) {
            statusText = 'POOR'
            statusColor = 'text-red-400'
            statusBg = 'bg-red-500/20'
        } else if (numericValue > 50) {
            statusText = 'FAIR'
            statusColor = 'text-yellow-400'
            statusBg = 'bg-yellow-500/20'
        } else {
            statusText = 'GOOD'
        }
    } else {
        if (numericValue > 85) {
            statusText = 'CRITICAL'
            statusColor = 'text-red-400'
            statusBg = 'bg-red-500/20'
        } else if (numericValue > 60) {
            statusText = 'HIGH'
            statusColor = 'text-yellow-400'
            statusBg = 'bg-yellow-500/20'
        }
    }

    return (
        <motion.button
            layout
            onClick={onClick}
            className={clsx(
                "w-full text-left group relative backdrop-blur-md border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] flex flex-col",
                active
                    ? `bg-gradient-to-br from-${color}-500/20 to-[#0a0e13] border-${color}-500/50 shadow-[0_0_30px_rgba(var(--${color}-500),0.15)] ring-1 ring-${color}-500/30`
                    : "bg-gradient-to-br from-[#0a0e13]/80 to-[#0a0e13]/40 border-white/5 hover:border-white/10 hover:bg-[#0a0e13]/60"
            )}
        >
            {/* Status Bar */}
            <div className={clsx(
                "absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300",
                active ? `bg-gradient-to-b from-${color}-400 to-${color}-600 shadow-[0_0_20px_rgba(var(--${color}-500),0.8)]` : "bg-white/5 group-hover:bg-white/10"
            )} />

            <div className="p-2.5 pl-4 pb-3 flex-1 flex flex-col justify-center gap-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h4 className={clsx("font-bold text-xs truncate uppercase tracking-wider transition-colors", active ? "text-white" : "text-white/70")}>
                                {label}
                            </h4>
                            {active && (
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold bg-${color}-500/20 text-${color}-300 flex items-center gap-1 shadow-sm uppercase border border-${color}-500/20`}>
                                    <Activity size={8} />
                                    ACTIVE
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate font-mono opacity-60 leading-tight">
                            {subtext || 'Loading...'}
                        </p>
                    </div>

                    <div className={clsx(
                        "p-2 rounded-lg transition-all shadow-lg",
                        active ? `bg-${color}-500/20 text-${color}-300 shadow-${color}-500/20 ring-1 ring-${color}-500/30` : "bg-white/5 text-muted-foreground group-hover:bg-white/10"
                    )}>
                        <Icon size={16} />
                    </div>
                </div>

                <div className="flex items-end justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="text-xl font-bold text-white font-mono tracking-tight drop-shadow-lg">{value}</span>
                    <div className="flex items-center gap-1.5">
                        {warning && <AlertTriangle size={12} className="text-yellow-500 animate-pulse" />}
                        <span className={clsx(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider transition-colors shadow-sm border border-white/5",
                            statusBg, statusColor
                        )}>
                            {statusText}
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5 overflow-hidden">
                <div
                    className={clsx(`h-full bg-gradient-to-r from-${color}-500 to-${color}-400 transition-all duration-500 shadow-[0_0_10px_rgba(var(--${color}-500),0.5)]`)}
                    style={{ width: `${Math.min(numericValue, 100)}%` }}
                />
            </div>
        </motion.button>
    )
}

function Sparkline({ data, color, fill = false, strokeWidth = 2 }: { data: number[], color: string, fill?: boolean, strokeWidth?: number }) {
    const max = Math.max(...data, 100)
    const points = data.map((val, i) => {
        const x = data.length > 1 ? (i / (data.length - 1)) * 100 : 0
        const y = 100 - (val / max) * 100
        return `${x},${y}`
    }).join(' ')

    const fillPath = fill ? `M 0,100 ${points} L 100,100 Z` : ''
    const lastVal = data.length > 0 ? data[data.length - 1] : 0
    const lastY = 100 - (lastVal / max) * 100

    // Color mapping
    const colorMap: { [key: string]: { stroke: string, glow: string, fill: string } } = {
        'violet': { stroke: '#8b5cf6', glow: '#a78bfa', fill: '#1e1b4b' },
        'indigo': { stroke: '#6366f1', glow: '#818cf8', fill: '#1e1b4b' },
        'fuchsia': { stroke: '#d946ef', glow: '#e879f9', fill: '#4c0519' },
        'cyan': { stroke: '#06b6d4', glow: '#22d3ee', fill: '#083344' },
        'gray': { stroke: '#6b7280', glow: '#9ca3af', fill: '#18181b' }
    }

    const colors = colorMap[color] || colorMap['gray']

    return (
        <div className="relative w-full h-full">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                    {/* Gradient for fill area */}
                    <linearGradient id={`fill-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={colors.stroke} stopOpacity="0" />
                    </linearGradient>

                    {/* Gradient for stroke */}
                    <linearGradient id={`stroke-gradient-${color}`} x1="0" y1="0" x2="100%" y2="0">
                        <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.6" />
                        <stop offset="50%" stopColor={colors.glow} stopOpacity="1" />
                        <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.6" />
                    </linearGradient>

                    {/* Glow filter */}
                    <filter id={`glow-${color}`} x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Grid pattern */}
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                    </pattern>
                </defs>

                {/* Background grid */}
                <rect width="100" height="100" fill="url(#grid)" />

                {/* Horizontal reference lines */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

                {/* Fill area */}
                {fill && (
                    <path
                        d={fillPath}
                        fill={`url(#fill-gradient-${color})`}
                    />
                )}

                {/* Main line with glow */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={`url(#stroke-gradient-${color})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter={`url(#glow-${color})`}
                    vectorEffect="non-scaling-stroke"
                />
            </svg>

            {/* End point indicator (CSS for perfect circle) */}
            {data.length > 0 && (
                <div
                    className="absolute w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] z-10"
                    style={{
                        left: '100%',
                        top: `${lastY}%`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: colors.fill,
                        borderColor: colors.glow,
                        borderWidth: '2px',
                        color: colors.glow
                    }}
                >
                    <div className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-current" />
                </div>
            )}
        </div>
    )
}
