import { useState, useEffect } from 'react'
import { Activity, Zap, Wifi, Cpu, HardDrive, Monitor, TrendingDown, AlertTriangle, RefreshCw, Trash2, Rocket, CheckCircle2, AlertOctagon } from 'lucide-react'
import { useOptimization } from '../context/OptimizationContext'
import { useLog } from '../context/LogContext'
import clsx from 'clsx'
import { motion } from 'framer-motion'

interface TopProcess {
    Name: string
    CPU?: number
    MemoryMB?: number
}

interface LatencyDataPoint {
    timestamp: number
    ping: number
}

interface DashboardProps {
    onNavigate: (tab: string) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
    const { optimizationScore } = useOptimization()
    const { addLog } = useLog()
    const [stats, setStats] = useState({
        cpu: 0,
        mem: 0,
        gpu: 0,
        net: 0,
        ping: 0,
    })
    const [topCPU, setTopCPU] = useState<TopProcess[]>([])
    const [topMemory, setTopMemory] = useState<TopProcess[]>([])
    const [topGPU, setTopGPU] = useState<TopProcess[]>([])
    const [gpuWarningShown, setGpuWarningShown] = useState(false)
    const [latencyHistory, setLatencyHistory] = useState<LatencyDataPoint[]>([])
    const [cpuHistory, setCpuHistory] = useState<number[]>(new Array(20).fill(0))
    const [memHistory, setMemHistory] = useState<number[]>(new Array(20).fill(0))
    const [gpuHistory, setGpuHistory] = useState<number[]>(new Array(20).fill(0))
    const [networkStability, setNetworkStability] = useState<'Stable' | 'Fluctuating' | 'Unstable'>('Stable')
    const [sysSpecs, setSysSpecs] = useState<any>(null)

    useEffect(() => {
        const systemProcesses = ['System', 'Registry', 'smss', 'csrss', 'wininit', 'services', 'lsass', 'svchost', 'dwm', 'explorer', 'SearchHost', 'RuntimeBroker', 'ShellExperienceHost', 'StartMenuExperienceHost', 'TextInputHost', 'SecurityHealthService', 'MsMpEng', 'NVDisplay.Container', 'conhost', 'fontdrvhost']

        const loadInitialData = async () => {
            try {
                const [statsData, pingData, specsData] = await Promise.all([
                    window.ipcRenderer?.invoke('get-system-stats'),
                    window.ipcRenderer?.invoke('get-network-ping'),
                    window.ipcRenderer?.invoke('get-system-specs')
                ])

                if (specsData) setSysSpecs(specsData)

                if (statsData && pingData?.available) {
                    setStats({
                        ...statsData,
                        ping: pingData.ping,
                    })
                    setLatencyHistory([{ timestamp: Date.now(), ping: pingData.ping }])
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error)
            }
        }

        loadInitialData()

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
                    const updated = [...prev, newPoint]

                    // Calculate stability
                    const recentPings = updated.slice(-10).map(p => p.ping)
                    const avg = recentPings.reduce((a, b) => a + b, 0) / recentPings.length
                    const variance = recentPings.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / recentPings.length
                    const stdDev = Math.sqrt(variance)

                    if (stdDev > 20) setNetworkStability('Unstable')
                    else if (stdDev > 5) setNetworkStability('Fluctuating')
                    else setNetworkStability('Stable')

                    return updated.slice(-50)
                })

                setCpuHistory(prev => [...prev.slice(1), newStats.cpu])
                setMemHistory(prev => [...prev.slice(1), newStats.mem])
                setGpuHistory(prev => [...prev.slice(1), newStats.gpu])
            }

            const cpuProcs = await window.ipcRenderer?.invoke('get-top-processes', 'cpu')
            if (cpuProcs?.available) {
                setTopCPU(cpuProcs.processes)
            }

            const memProcs = await window.ipcRenderer?.invoke('get-top-processes', 'memory')
            if (memProcs?.available) {
                const filtered = memProcs.processes.filter((p: TopProcess) =>
                    !systemProcesses.some(sys => p.Name.toLowerCase().includes(sys.toLowerCase()))
                )
                setTopMemory(filtered)
            }

            const gpuProcs = await window.ipcRenderer?.invoke('get-top-processes', 'gpu')
            if (gpuProcs?.available) {
                setTopGPU(gpuProcs.processes)
            }
        }, 2000)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (stats.gpu === 0) {
            const timer = setTimeout(() => {
                if (stats.gpu === 0 && !gpuWarningShown) {
                    setGpuWarningShown(true)
                    addLog('SYSTEM', 'GPU is not reporting data (don\'t worry, it\'s not broken, we just can\'t see the data)')
                }
            }, 10000)
            return () => clearTimeout(timer)
        } else {
            setGpuWarningShown(false)
        }
    }, [stats.gpu, gpuWarningShown, addLog])

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

    const handleRestartExplorer = async () => {
        addLog('SYSTEM', '🔄 Restarting Windows Explorer...')
        const result = await window.ipcRenderer?.invoke('restart-explorer')
        if (result?.success) {
            addLog('SYSTEM', '✓ Explorer restarted successfully')
        } else {
            addLog('ERROR', `⚠ Failed to restart Explorer: ${result?.message}`)
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

    const perfLabel = optimizationScore >= 80 ? 'Excellent' : optimizationScore >= 60 ? 'Good' : optimizationScore >= 40 ? 'Fair' : 'Poor'

    const Sparkline = ({ data, color }: { data: number[], color: string }) => {
        const max = 100
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = 100 - (val / max) * 100
            return `${x},${y}`
        }).join(' ')

        return (
            <svg className="w-full h-8 overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline
                    points={points}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={color}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        )
    }

    const AreaChart = ({ data }: { data: LatencyDataPoint[] }) => {
        if (data.length < 2) return null

        const maxPing = Math.max(...data.map(d => d.ping), 100)
        const width = 100
        const height = 100

        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * width
            const y = height - (d.ping / maxPing) * height
            return `${x},${y}`
        }).join(' ')

        const areaPath = `M 0,${height} ${points} L ${width},${height} Z`

        return (
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
                <defs>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(124, 58, 237)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="rgb(124, 58, 237)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#netGradient)" />
                <polyline
                    points={points}
                    fill="none"
                    stroke="rgb(124, 58, 237)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-8">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1f2e] via-[#0a0e13] to-[#0a0e13] border border-white/10 p-8 shadow-2xl group"
            >
                <div className="absolute top-0 right-0 p-64 bg-primary/5 blur-[150px] rounded-full pointer-events-none group-hover:bg-primary/10 transition-colors duration-1000" />
                <div className="absolute bottom-0 left-0 p-40 bg-secondary/5 blur-[120px] rounded-full pointer-events-none group-hover:bg-secondary/10 transition-colors duration-1000" />

                <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                    {/* Left: Title & Status */}
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-4xl font-bold tracking-tight text-white mb-2 drop-shadow-lg">System Overview</h2>
                            <p className="text-muted-foreground font-medium flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                All systems operational
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-md shadow-inner">
                                <Activity className="w-4 h-4 text-primary" />
                                <span className="text-sm font-bold text-white">{perfLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] backdrop-blur-md shadow-inner">
                                <Wifi className="w-4 h-4 text-secondary" />
                                <span className="text-sm font-bold text-white">{stats.ping}ms</span>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Hardware Specs */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                                <Cpu className="w-5 h-5" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Processor</p>
                                <p className="text-sm font-medium text-white truncate" title={sysSpecs?.cpu?.name}>{sysSpecs?.cpu?.name || 'Loading...'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                            <div className="p-2.5 rounded-lg bg-secondary/10 text-secondary">
                                <Monitor className="w-5 h-5" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Graphics</p>
                                <p className="text-sm font-medium text-white truncate" title={sysSpecs?.gpu?.[0]?.name}>{sysSpecs?.gpu?.[0]?.name || 'Loading...'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Score */}
                    <div className="flex flex-col items-end justify-center">
                        <div className="relative">
                            <svg className="w-32 h-32 transform -rotate-90">
                                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                                <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * optimizationScore) / 100} className="text-primary transition-all duration-1000 ease-out" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-white">{optimizationScore}%</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Efficiency</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CPU */}
                <div
                    onClick={() => onNavigate('system')}
                    className="group relative bg-[#0a0e13]/80 backdrop-blur-sm rounded-2xl border border-white/5 p-6 hover:border-primary/40 transition-all cursor-pointer hover:shadow-[0_0_30px_-10px_rgba(124,58,237,0.3)] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all">
                                    <Cpu className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">CPU</span>
                            </div>
                            <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity bg-primary/10 px-2 py-1 rounded-md">DETAILS</span>
                        </div>
                        <div className="flex items-end justify-between mb-6">
                            <span className="text-4xl font-mono font-bold text-white tracking-tight drop-shadow-md">{stats.cpu}%</span>
                            <div className="w-24 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Sparkline data={cpuHistory} color="text-primary" />
                            </div>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">Top Processes</div>
                            {topCPU.slice(0, 3).map((proc, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs font-mono group/item">
                                    <span className="truncate max-w-[120px] text-white/70 group-hover/item:text-white transition-colors">{proc.Name}</span>
                                    <span className="text-primary/80 font-bold bg-primary/5 px-1.5 py-0.5 rounded">{proc.CPU?.toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Memory */}
                <div
                    onClick={() => onNavigate('system')}
                    className="group relative bg-[#0a0e13]/80 backdrop-blur-sm rounded-2xl border border-white/5 p-6 hover:border-secondary/40 transition-all cursor-pointer hover:shadow-[0_0_30px_-10px_rgba(236,72,153,0.3)] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary ring-1 ring-secondary/20 group-hover:ring-secondary/50 transition-all">
                                    <HardDrive className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Memory</span>
                            </div>
                            <span className="text-[10px] font-bold text-secondary opacity-0 group-hover:opacity-100 transition-opacity bg-secondary/10 px-2 py-1 rounded-md">DETAILS</span>
                        </div>
                        <div className="flex items-end justify-between mb-6">
                            <span className="text-4xl font-mono font-bold text-white tracking-tight drop-shadow-md">{stats.mem}%</span>
                            <div className="w-24 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Sparkline data={memHistory} color="text-secondary" />
                            </div>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">Top Processes</div>
                            {topMemory.slice(0, 3).map((proc, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs font-mono group/item">
                                    <span className="truncate max-w-[120px] text-white/70 group-hover/item:text-white transition-colors">{proc.Name}</span>
                                    <span className="text-secondary/80 font-bold bg-secondary/5 px-1.5 py-0.5 rounded">{proc.MemoryMB?.toFixed(0)} MB</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* GPU */}
                <div
                    onClick={() => onNavigate('system')}
                    className="group relative bg-[#0a0e13]/80 backdrop-blur-sm rounded-2xl border border-white/5 p-6 hover:border-green-500/40 transition-all cursor-pointer hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.3)] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-green-500/10 text-green-500 ring-1 ring-green-500/20 group-hover:ring-green-500/50 transition-all">
                                    <Monitor className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">GPU</span>
                            </div>
                            <span className="text-[10px] font-bold text-green-500 opacity-0 group-hover:opacity-100 transition-opacity bg-green-500/10 px-2 py-1 rounded-md">DETAILS</span>
                        </div>
                        <div className="flex items-end justify-between mb-6">
                            <span className="text-4xl font-mono font-bold text-white tracking-tight drop-shadow-md">{stats.gpu}%</span>
                            <div className="w-24 opacity-60 group-hover:opacity-100 transition-opacity">
                                <Sparkline data={gpuHistory} color="text-green-500" />
                            </div>
                        </div>
                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">Top Processes</div>
                            {topGPU.length > 0 ? (
                                topGPU.slice(0, 3).map((proc, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs font-mono group/item">
                                        <span className="truncate max-w-[120px] text-white/70 group-hover/item:text-white transition-colors">{proc.Name}</span>
                                        <span className="text-green-500/80 font-bold bg-green-500/5 px-1.5 py-0.5 rounded">{proc.CPU?.toFixed(1)}%</span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-yellow-500/80 italic bg-yellow-500/5 p-2 rounded border border-yellow-500/10">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>No active GPU processes found</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Network */}
                <div
                    onClick={() => onNavigate('tools')}
                    className="group relative bg-[#0a0e13]/80 backdrop-blur-sm rounded-2xl border border-white/5 p-6 hover:border-orange-500/40 transition-all cursor-pointer hover:shadow-[0_0_30px_-10px_rgba(249,115,22,0.3)] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20 group-hover:ring-orange-500/50 transition-all">
                                    <Wifi className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Latency</span>
                            </div>
                            <span className="text-[10px] font-bold text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity bg-orange-500/10 px-2 py-1 rounded-md">TOOLS</span>
                        </div>

                        <div className="flex flex-col mb-4">
                            <span className="text-5xl font-mono font-bold text-white tracking-tighter drop-shadow-lg">{stats.ping}<span className="text-xl text-muted-foreground ml-1 font-sans font-medium">ms</span></span>
                        </div>

                        {/* Integrated Sparkline */}
                        <div className="h-12 w-full opacity-40 group-hover:opacity-80 transition-opacity mb-4 relative">
                            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                            <Sparkline data={latencyHistory.map(p => p.ping)} color="text-orange-500" />
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Jitter:</span>
                                <span className="text-xs font-bold text-white font-mono">
                                    ±{latencyHistory.length > 1 ? Math.round(Math.sqrt(latencyHistory.slice(-10).reduce((a, b) => a + Math.pow(b.ping - (latencyHistory.slice(-10).reduce((x, y) => x + y.ping, 0) / latencyHistory.slice(-10).length), 2), 0) / latencyHistory.slice(-10).length)) : 0}ms
                                </span>
                            </div>

                            <div className={clsx(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                networkStability === 'Stable' ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                    networkStability === 'Fluctuating' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                            )}>
                                <div className={clsx("w-1.5 h-1.5 rounded-full animate-pulse",
                                    networkStability === 'Stable' ? "bg-green-400" :
                                        networkStability === 'Fluctuating' ? "bg-yellow-400" : "bg-red-400"
                                )} />
                                {networkStability}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Network Graph */}
                <div className="lg:col-span-2 rounded-2xl bg-[#0a0e13] border border-white/10 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <TrendingDown className="w-4 h-4" />
                                Network Stability
                            </h3>
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider",
                                    networkStability === 'Stable' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                                        networkStability === 'Fluctuating' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                                            "bg-red-500/10 border-red-500/20 text-red-500"
                                )}>
                                    {networkStability === 'Stable' ? <CheckCircle2 className="w-3 h-3" /> : <AlertOctagon className="w-3 h-3" />}
                                    {networkStability}
                                </div>
                                <div className="flex items-center gap-4 text-xs font-mono bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.05]">
                                    <span className="text-muted-foreground">AVG: <span className="text-white font-bold">{latencyHistory.length > 0 ? Math.round(latencyHistory.reduce((a, b) => a + b.ping, 0) / latencyHistory.length) : 0}ms</span></span>
                                    <span className="w-px h-3 bg-white/10" />
                                    <span className="text-muted-foreground">MAX: <span className="text-white font-bold">{Math.max(...latencyHistory.map(p => p.ping), 0)}ms</span></span>
                                </div>
                            </div>
                        </div>
                        <div className="h-56 w-full relative">
                            <AreaChart data={latencyHistory} />
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4" />
                        Quick Actions
                    </h3>

                    <div className="relative group">
                        <button
                            onClick={handleOptimizeAll}
                            className="w-full flex items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 border border-primary/20 hover:border-primary/40 transition-all shadow-lg shadow-primary/5 group-hover:shadow-primary/20 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <div className="text-left relative z-10">
                                <div className="font-bold text-white group-hover:text-primary transition-colors flex items-center gap-2 text-lg">
                                    <Rocket className="w-5 h-5 animate-pulse" />
                                    Optimize All
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 font-medium">One-click system optimization</div>
                            </div>
                            <CheckCircle2 className="w-6 h-6 text-primary opacity-50 group-hover:opacity-100 transition-opacity relative z-10" />
                        </button>
                        {/* Tooltip for Optimize All */}
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-64 p-3 rounded-xl bg-[#1a1f2e] border border-white/10 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl z-20 text-center translate-y-2 group-hover:translate-y-0">
                            Cleans RAM, Flushes DNS, and Clears Temp Files.
                            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1a1f2e] border-b border-r border-white/10 rotate-45"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleCleanMemory}
                            className="p-4 rounded-xl bg-[#0a0e13] hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all text-left group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <RefreshCw className="w-5 h-5 text-muted-foreground group-hover:text-green-400 mb-2 transition-colors relative z-10" />
                            <div className="font-bold text-sm text-white relative z-10">Clean RAM</div>
                        </button>

                        <button
                            onClick={handleFlushDNS}
                            className="p-4 rounded-xl bg-[#0a0e13] hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all text-left group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Activity className="w-5 h-5 text-muted-foreground group-hover:text-blue-400 mb-2 transition-colors relative z-10" />
                            <div className="font-bold text-sm text-white relative z-10">Flush DNS</div>
                        </button>

                        <button
                            onClick={handleClearTemp}
                            className="p-4 rounded-xl bg-[#0a0e13] hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all text-left group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Trash2 className="w-5 h-5 text-muted-foreground group-hover:text-red-400 mb-2 transition-colors relative z-10" />
                            <div className="font-bold text-sm text-white relative z-10">Clear Temp</div>
                        </button>

                        <button
                            onClick={handleRestartExplorer}
                            className="p-4 rounded-xl bg-[#0a0e13] hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all text-left group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Monitor className="w-5 h-5 text-muted-foreground group-hover:text-orange-400 mb-2 transition-colors relative z-10" />
                            <div className="font-bold text-sm text-white relative z-10">Restart UI</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
