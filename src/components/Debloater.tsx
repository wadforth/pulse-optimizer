import { Trash2, AlertTriangle, Check, FileCode, ShieldAlert, Search, RefreshCw, Download, X } from 'lucide-react'
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
    { id: 'edge_legacy', name: 'Edge Legacy', description: 'Legacy Edge browser remnants.', path: 'C:\\Windows\\SystemApps\\Microsoft.MicrosoftEdge_*', risk: 'Medium', breakage: 'Help docs, PDF fallback', isInstalled: false, isRemoved: false }
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

    const handleRemove = (app: Bloatware) => {
        if (!app.isInstalled) {
            addLog('SYSTEM', `${app.name} is not installed`)
            return
        }
        setRemoving(app.id)
        addLog('SYSTEM', `Initiating removal of ${app.name}...`)
        setTimeout(() => {
            setRemoving(null)
            setBloatware(prev => prev.map(b => b.id === app.id ? { ...b, isRemoved: true, isInstalled: false } : b))
            addLog('SYSTEM', `Successfully removed ${app.name}`)
        }, 2000)
    }

    const removeAllSafe = () => {
        const safeInstalled = bloatware.filter(b => b.risk === 'Low' && b.isInstalled && !b.isRemoved)
        if (safeInstalled.length === 0) {
            addLog('SYSTEM', 'No safe bloatware found to remove')
            return
        }
        safeInstalled.forEach(app => handleRemove(app))
        addLog('SYSTEM', `Removing ${safeInstalled.length} low-risk items...`)
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
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-wide text-white uppercase flex items-center gap-3">
                        Windows Debloater
                        <span className="text-sm font-mono font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5 text-primary" />
                            {installedCount} INSTALLED
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Remove pre-installed bloatware and telemetry • {removedCount} removed this session
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={removeAllSafe}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/30 transition-colors text-xs font-medium text-green-400"
                        title="Remove all low-risk installed items"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove All Safe</span>
                    </button>
                    <button
                        onClick={exportReport}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white"
                        title="Export report to file"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={checkInstalled}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white disabled:opacity-50"
                        title="Refresh status"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h3 className="text-yellow-400 font-bold uppercase text-xs tracking-wide">Proceed with Caution</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            Removing system apps can cause instability. Check the "Potential Breakage" field before proceeding.
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
                {/* Filter Tabs */}
                <div className="flex p-1 bg-black/20 rounded-lg flex-shrink-0 overflow-x-auto">
                    {(['All', 'Installed', 'Not Installed', 'Low', 'Medium', 'High'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                filter === f ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            {f}
                            {f !== 'All' && f !== 'Installed' && f !== 'Not Installed' && (
                                <span className={clsx(
                                    "ml-1.5 px-1 rounded text-[9px]",
                                    f === 'Low' ? "bg-green-500/20" : f === 'Medium' ? "bg-yellow-500/20" : "bg-red-500/20"
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search bloatware..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors h-[34px]"
                    />
                </div>
            </div>

            {/* Bloatware List */}
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="grid grid-cols-1 gap-3 pb-6">
                        <AnimatePresence>
                            {filteredBloatware.map(app => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={app.id}
                                    className={clsx(
                                        "group bg-[#0a0e13] border rounded-xl p-4 transition-all overflow-hidden",
                                        app.isInstalled && !app.isRemoved ? "border-red-500/20 hover:border-red-500/30" : "border-white/5 hover:border-white/10"
                                    )}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="font-bold text-sm text-white tracking-wide">{app.name}</h3>
                                                <span className={clsx(
                                                    "text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono tracking-wider whitespace-nowrap",
                                                    app.risk === 'Low' ? "border-green-500/30 text-green-400 bg-green-500/10" :
                                                        app.risk === 'Medium' ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" :
                                                            "border-red-500/30 text-red-400 bg-red-500/10"
                                                )}>
                                                    {app.risk} Risk
                                                </span>
                                                {app.isInstalled && !app.isRemoved ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase font-mono tracking-wider">
                                                        Installed
                                                    </span>
                                                ) : app.isRemoved ? (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-green-500/10 text-green-400 border-green-500/20 uppercase font-mono tracking-wider">
                                                        Removed
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-gray-500/10 text-gray-500 border-gray-500/20 uppercase font-mono tracking-wider">
                                                        Not Installed
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2">{app.description}</p>
                                            <div className="grid grid-cols-1 gap-2 text-[10px] text-muted-foreground bg-white/[0.02] p-2 rounded border border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <FileCode className="w-3 h-3 text-primary flex-shrink-0" />
                                                    <span className="truncate font-mono" title={app.path}>{app.path}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-red-400">
                                                    <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                                                    <span className="uppercase font-bold">Breaks: {app.breakage}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemove(app)}
                                            disabled={!app.isInstalled || app.isRemoved || removing === app.id}
                                            className={clsx(
                                                "px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 min-w-[140px] text-xs uppercase tracking-wider whitespace-nowrap",
                                                app.isRemoved
                                                    ? "bg-white/5 text-muted-foreground cursor-default border border-white/5"
                                                    : !app.isInstalled
                                                        ? "bg-white/5 text-muted-foreground cursor-default border border-white/5"
                                                        : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 hover:shadow-sm"
                                            )}
                                        >
                                            {removing === app.id ? (
                                                <>
                                                    <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
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
                                <div className="p-4 bg-white/5 rounded-full mb-3">
                                    <Search className="w-8 h-8 opacity-50" />
                                </div>
                                <p className="text-sm">No bloatware found matching your filters.</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setFilter('All'); }}
                                    className="mt-2 text-primary text-xs hover:underline"
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
