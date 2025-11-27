import { Trash2, AlertTriangle, Check, FileCode, ShieldAlert, Search, RefreshCw, Download, X, Package, Info, CheckCircle, AlertOctagon } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { clsx } from 'clsx'
import { useLog } from '../context/LogContext'
import { motion, AnimatePresence } from 'framer-motion'

interface Bloatware {
    id: string
    name: string
    description: string
    path: string
    risk: 'Low' | 'Medium' | 'High'
    breakage: string
    isInstalled: boolean
    isRemoved: boolean
}

const bloatwareList: Bloatware[] = [
    { id: 'cortana', name: 'Cortana', description: 'Legacy voice assistant. Mostly deprecated in Windows 11.', path: 'C:\\Windows\\SystemApps\\Microsoft.Windows.Cortana_cw5n1h2txyewy', risk: 'Low', breakage: 'Voice search functionality', isInstalled: false, isRemoved: false },
    { id: 'xbox', name: 'Xbox Game Bar', description: 'Overlay for gaming recording and social features.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.XboxGamingOverlay_*', risk: 'Medium', breakage: 'Game recording, Xbox login features', isInstalled: false, isRemoved: false },
    { id: 'onedrive', name: 'Microsoft OneDrive', description: 'Cloud storage integration.', path: 'C:\\Users\\%USERNAME%\\AppData\\Local\\Microsoft\\OneDrive', risk: 'Medium', breakage: 'Cloud sync, auto-backup of documents', isInstalled: false, isRemoved: false },
    { id: 'telemetry', name: 'Diagnostic Data Services', description: 'Windows telemetry and data collection services.', path: 'Service: DiagTrack', risk: 'High', breakage: 'Windows Insider builds, some store updates', isInstalled: false, isRemoved: false },
    { id: 'weather', name: 'MSN Weather', description: 'Pre-installed weather app.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.BingWeather_*', risk: 'Low', breakage: 'Start menu weather widget', isInstalled: false, isRemoved: false },
    { id: 'news', name: 'Microsoft News', description: 'News and interests feed.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.BingNews_*', risk: 'Low', breakage: 'Taskbar news widget', isInstalled: false, isRemoved: false },
    { id: 'maps', name: 'Windows Maps', description: 'Built-in maps application.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsMaps_*', risk: 'Low', breakage: 'Location features', isInstalled: false, isRemoved: false },
    { id: 'photos', name: 'Microsoft Photos', description: 'Default photo viewer and editor.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.Windows.Photos_*', risk: 'Medium', breakage: 'Image viewing', isInstalled: false, isRemoved: false },
    { id: 'people', name: 'Microsoft People', description: 'Contacts management app.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.People_*', risk: 'Low', breakage: 'Contact integration', isInstalled: false, isRemoved: false },
    { id: 'gethelp', name: 'Get Help', description: 'Windows troubleshooting assistant.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.GetHelp_*', risk: 'Low', breakage: 'Built-in help', isInstalled: false, isRemoved: false },
    { id: 'feedback', name: 'Feedback Hub', description: 'App for submitting Windows feedback.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsFeedbackHub_*', risk: 'Low', breakage: 'Feedback submission', isInstalled: false, isRemoved: false },
    { id: 'mixedreality', name: 'Mixed Reality Portal', description: 'VR/AR headset management.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.MixedReality.Portal_*', risk: 'Low', breakage: 'VR headset functionality', isInstalled: false, isRemoved: false },
    { id: '3dviewer', name: '3D Viewer', description: 'App for viewing 3D models.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.Microsoft3DViewer_*', risk: 'Low', breakage: '3D file viewing', isInstalled: false, isRemoved: false },
    { id: 'yourphone', name: 'Phone Link', description: 'Sync your phone with Windows.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.YourPhone_*', risk: 'Low', breakage: 'Phone integration, SMS', isInstalled: false, isRemoved: false },
    { id: 'edge_legacy', name: 'Edge Legacy', description: 'Legacy Edge browser remnants.', path: 'C:\\Windows\\SystemApps\\Microsoft.MicrosoftEdge_*', risk: 'Medium', breakage: 'Help docs, PDF fallback', isInstalled: false, isRemoved: false },
    { id: 'skype', name: 'Skype', description: 'Video calling and messaging app.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.SkypeApp*', risk: 'Low', breakage: 'Skype functionality', isInstalled: false, isRemoved: false },
    { id: 'solitaire', name: 'Solitaire Collection', description: 'Pre-installed card games.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.MicrosoftSolitaireCollection*', risk: 'Low', breakage: 'None', isInstalled: false, isRemoved: false },
    { id: 'calculator', name: 'Calculator', description: 'Windows Calculator app.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsCalculator*', risk: 'Low', breakage: 'Calculator functionality', isInstalled: false, isRemoved: false },
    { id: 'alarms', name: 'Alarms & Clock', description: 'Timer, alarm, and stopwatch app.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsAlarms*', risk: 'Low', breakage: 'Alarms and timers', isInstalled: false, isRemoved: false },
    { id: 'camera', name: 'Camera', description: 'Webcam application.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsCamera*', risk: 'Low', breakage: 'Camera functionality', isInstalled: false, isRemoved: false },
    { id: 'soundrecorder', name: 'Voice Recorder', description: 'Audio recording app.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsSoundRecorder*', risk: 'Low', breakage: 'Voice recording', isInstalled: false, isRemoved: false },
    { id: 'paint3d', name: 'Paint 3D', description: '3D modeling and painting app.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.MSPaint*', risk: 'Low', breakage: '3D editing', isInstalled: false, isRemoved: false },
    { id: 'groove', name: 'Groove Music', description: 'Legacy music player.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.ZuneMusic*', risk: 'Low', breakage: 'Music playback (use Media Player instead)', isInstalled: false, isRemoved: false },
    { id: 'movies', name: 'Movies & TV', description: 'Video player app.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.ZuneVideo*', risk: 'Low', breakage: 'Video playback (use Media Player instead)', isInstalled: false, isRemoved: false },
    { id: 'stickynotes', name: 'Sticky Notes', description: 'Desktop notes app.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.MicrosoftStickyNotes*', risk: 'Low', breakage: 'Sticky notes functionality', isInstalled: false, isRemoved: false },
    { id: 'snip', name: 'Snip & Sketch', description: 'Screen capture tool.', path: 'C:\\Program Files\\WindowsApps\\Microsoft.ScreenSketch*', risk: 'Low', breakage: 'Screenshot functionality (Win+Shift+S)', isInstalled: false, isRemoved: false }
]

export function Debloater() {
    const [removing, setRemoving] = useState<string | null>(null)
    const [bloatware, setBloatware] = useState<Bloatware[]>(bloatwareList)
    const [loading, setLoading] = useState(true)
    const { addLog } = useLog()
    const hasChecked = useRef(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filter, setFilter] = useState<'All' | 'Installed' | 'Not Installed' | 'Low' | 'Medium' | 'High'>('All')

    useEffect(() => {
        if (hasChecked.current) return
        hasChecked.current = true
        checkInstalled()
    }, [])

    const checkInstalled = async () => {
        setLoading(true)
        addLog('SYSTEM', 'Checking bloatware...')
        const updated = await Promise.all(bloatwareList.map(async (app) => {
            try {
                const result = await window.ipcRenderer?.invoke('check-bloatware-installed', app.id)
                const isInstalled = result?.isInstalled || false
                return { ...app, isInstalled }
            } catch { return app }
        }))

        // Sort: Installed first, then by Risk (Low > Medium > High), then Name
        const riskOrder = { 'Low': 0, 'Medium': 1, 'High': 2 }
        updated.sort((a, b) => {
            if (a.isInstalled !== b.isInstalled) return a.isInstalled ? -1 : 1
            if (riskOrder[a.risk] !== riskOrder[b.risk]) return riskOrder[a.risk] - riskOrder[b.risk]
            return a.name.localeCompare(b.name)
        })

        setBloatware(updated)
        setLoading(false)
        addLog('SYSTEM', 'Bloatware detection complete')
    }

    const handleRemove = async (app: Bloatware) => {
        if (!app.isInstalled) {
            addLog('SYSTEM', `${app.name} is not installed`)
            return
        }
        setRemoving(app.id)
        addLog('SYSTEM', `Initiating removal of ${app.name}...`)

        try {
            const result = await window.ipcRenderer?.invoke('remove-bloatware', app.id)
            if (result?.success) {
                setBloatware(prev => prev.map(b => b.id === app.id ? { ...b, isRemoved: true, isInstalled: false } : b))
                addLog('SYSTEM', `Successfully removed ${app.name}`)
            } else {
                addLog('ERROR', `Failed to remove ${app.name}: ${result?.error}`)
            }
        } catch (error: any) {
            addLog('ERROR', `Error removing ${app.name}: ${error.message}`)
        } finally {
            setRemoving(null)
        }
    }

    const removeAllSafe = async () => {
        const safeInstalled = bloatware.filter(b => b.risk === 'Low' && b.isInstalled && !b.isRemoved)
        if (safeInstalled.length === 0) {
            addLog('SYSTEM', 'No safe bloatware found to remove')
            return
        }

        addLog('SYSTEM', `Removing ${safeInstalled.length} low-risk items...`)
        for (const app of safeInstalled) {
            await handleRemove(app)
        }
        addLog('SYSTEM', 'Batch removal complete')
    }

    const exportReport = () => {
        const report = bloatware.map(b => {
            const status = b.isRemoved ? '[REMOVED]' : b.isInstalled ? '[INSTALLED]' : '[NOT INSTALLED]'
            return `${status} ${b.name}\n  Risk: ${b.risk}\n  Description: ${b.description}\n  Path: ${b.path}\n  Potential Breakage: ${b.breakage}`
        }).join('\n\n')

        const header = `Windows Debloater Report\n${'='.repeat(50)}\nGenerated: ${new Date().toLocaleString()}\nTotal Items: ${bloatware.length}\nInstalled: ${bloatware.filter(b => b.isInstalled).length}\nRemoved: ${bloatware.filter(b => b.isRemoved).length}\n\n`

        const blob = new Blob([header + report], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `debloat-report-${Date.now()}.txt`
        a.click()
        URL.revokeObjectURL(url)
        addLog('SYSTEM', 'Report exported successfully')
    }

    const filteredBloatware = useMemo(() => {
        return bloatware.filter(app => {
            const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.description.toLowerCase().includes(searchTerm.toLowerCase())

            if (filter === 'Installed') return matchesSearch && app.isInstalled
            if (filter === 'Not Installed') return matchesSearch && !app.isInstalled
            if (filter === 'Low' || filter === 'Medium' || filter === 'High') {
                return matchesSearch && app.risk === filter
            }
            return matchesSearch
        })
    }, [bloatware, searchTerm, filter])

    const installedCount = bloatware.filter(b => b.isInstalled).length
    const removedCount = bloatware.filter(b => b.isRemoved).length

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white uppercase flex items-center gap-3 drop-shadow-lg">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Windows Debloater</span>
                        <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                            <Package className="w-3.5 h-3.5" />
                            {installedCount} INSTALLED
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1 font-medium">
                        Remove pre-installed bloatware and telemetry to reclaim performance.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={removeAllSafe}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 transition-all text-xs font-bold text-emerald-400 uppercase tracking-wide group"
                        title="Remove all low-risk installed items"
                    >
                        <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        <span>Remove Safe</span>
                    </button>
                    <button
                        onClick={exportReport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group"
                        title="Export report to file"
                    >
                        <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={checkInstalled}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group disabled:opacity-50"
                        title="Refresh status"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500", loading && "animate-spin")} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 relative z-10 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-amber-400 font-bold uppercase text-xs tracking-widest">Proceed with Caution</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Removing system apps can cause instability. Always check the "Potential Breakage" warning before removal.
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-1.5 bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-2xl relative z-10 shadow-lg">
                {/* Filter Tabs */}
                <div className="flex p-1 bg-black/20 rounded-xl flex-shrink-0 overflow-x-auto scrollbar-none">
                    {(['All', 'Installed', 'Not Installed', 'Low', 'Medium', 'High'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2",
                                filter === f ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            {f}
                            {f !== 'All' && f !== 'Installed' && f !== 'Not Installed' && (
                                <span className={clsx(
                                    "px-1.5 py-0.5 rounded text-[9px]",
                                    f === 'Low' ? "bg-emerald-500/20 text-emerald-300" :
                                        f === 'Medium' ? "bg-amber-500/20 text-amber-300" :
                                            "bg-rose-500/20 text-rose-300"
                                )}>
                                    {bloatware.filter(b => b.risk === f).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="w-px h-8 bg-white/10 hidden lg:block flex-shrink-0" />

                {/* Search */}
                <div className="relative w-full lg:w-64 flex-shrink-0 ml-auto">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search apps..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-white placeholder:text-muted-foreground focus:outline-none focus:border-rose-500/50 focus:bg-black/40 transition-all"
                    />
                </div>
            </div>

            {/* Bloatware List */}
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                        <p className="text-rose-400 font-mono text-xs animate-pulse">SCANNING SYSTEM APPS...</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10 pb-6">
                    <div className="grid grid-cols-1 gap-3">
                        <AnimatePresence mode='popLayout'>
                            {filteredBloatware.map(app => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={app.id}
                                    className={clsx(
                                        "group bg-[#0a0e13]/80 backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 overflow-hidden relative",
                                        app.isInstalled && !app.isRemoved
                                            ? "border-white/5 hover:border-rose-500/30 hover:shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                                            : "border-white/5 opacity-60 hover:opacity-100"
                                    )}
                                >
                                    {/* Active Glow Background for Installed Items */}
                                    {app.isInstalled && !app.isRemoved && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    )}

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <h3 className="font-bold text-sm text-white tracking-wide group-hover:text-rose-200 transition-colors">{app.name}</h3>

                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider flex items-center gap-1",
                                                        app.risk === 'Low' ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" :
                                                            app.risk === 'Medium' ? "border-amber-500/20 text-amber-400 bg-amber-500/5" :
                                                                "border-rose-500/20 text-rose-400 bg-rose-500/5"
                                                    )}>
                                                        <AlertOctagon className="w-2.5 h-2.5" />
                                                        {app.risk} Risk
                                                    </span>

                                                    {app.isInstalled && !app.isRemoved ? (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase font-bold tracking-wider flex items-center gap-1">
                                                            <CheckCircle className="w-2.5 h-2.5" />
                                                            Installed
                                                        </span>
                                                    ) : app.isRemoved ? (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase font-bold tracking-wider flex items-center gap-1">
                                                            <Check className="w-2.5 h-2.5" />
                                                            Removed
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded border bg-white/5 text-muted-foreground border-white/10 uppercase font-bold tracking-wider flex items-center gap-1">
                                                            <X className="w-2.5 h-2.5" />
                                                            Not Installed
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{app.description}</p>

                                            <div className="grid grid-cols-1 gap-1.5">
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 font-mono bg-black/20 px-2 py-1 rounded border border-white/5 w-fit max-w-full">
                                                    <FileCode className="w-3 h-3 text-rose-500/50 flex-shrink-0" />
                                                    <span className="truncate" title={app.path}>{app.path}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-rose-400/80">
                                                    <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                                                    <span className="uppercase tracking-wide">Potential Breakage: {app.breakage}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRemove(app)}
                                            disabled={!app.isInstalled || app.isRemoved || removing === app.id}
                                            className={clsx(
                                                "px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 min-w-[140px] text-xs uppercase tracking-wider whitespace-nowrap shadow-lg",
                                                app.isRemoved
                                                    ? "bg-emerald-500/10 text-emerald-400 cursor-default border border-emerald-500/20"
                                                    : !app.isInstalled
                                                        ? "bg-white/5 text-muted-foreground cursor-default border border-white/5"
                                                        : "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/20 hover:shadow-rose-500/40 border border-transparent"
                                            )}
                                        >
                                            {removing === app.id ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    REMOVING...
                                                </>
                                            ) : app.isRemoved ? (
                                                <>
                                                    <Check className="w-3.5 h-3.5" />
                                                    REMOVED
                                                </>
                                            ) : !app.isInstalled ? (
                                                <>
                                                    <X className="w-3.5 h-3.5" />
                                                    NOT INSTALLED
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    REMOVE
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredBloatware.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <div className="p-6 bg-white/5 rounded-full mb-4 border border-white/5">
                                    <Search className="w-10 h-10 opacity-30" />
                                </div>
                                <p className="text-sm font-medium">No bloatware found matching your filters.</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setFilter('All'); }}
                                    className="mt-3 text-rose-400 text-xs font-bold uppercase tracking-wide hover:text-rose-300 hover:underline"
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
