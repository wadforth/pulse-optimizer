import { AlertTriangle, Check, X, Building2, Search, Filter, FolderOpen, Power, Clock, Globe, RefreshCw, Copy, Zap, Shield, Cpu } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { clsx } from 'clsx'
import { useLog } from '../context/LogContext'
import { motion, AnimatePresence } from 'framer-motion'

interface StartupItem {
    name: string
    path: string
    location: string
    publisher: string
    enabled: boolean
}

export function StartupManager() {
    const [items, setItems] = useState<StartupItem[]>([])
    const [loading, setLoading] = useState(true)
    const { addLog } = useLog()
    const hasLoaded = useRef(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filter, setFilter] = useState<'All' | 'Enabled' | 'Disabled'>('All')

    useEffect(() => {
        if (hasLoaded.current) return
        hasLoaded.current = true
        loadStartupItems()
    }, [])

    const loadStartupItems = async () => {
        setLoading(true)
        addLog('SYSTEM', 'Loading startup programs...')

        try {
            const result = await window.ipcRenderer?.invoke('get-startup-items')
            if (result?.success && result.items) {
                setItems(result.items)
                addLog('SYSTEM', `Found ${result.items.length} startup programs`)
            } else {
                addLog('ERROR', 'Failed to load startup programs')
            }
        } catch (error) {
            addLog('ERROR', `Error loading startup items: ${error}`)
        }

        setLoading(false)
    }

    const toggleItem = async (item: StartupItem) => {
        const newState = !item.enabled
        addLog('SYSTEM', `${newState ? 'Enabling' : 'Disabling'} ${item.name}...`)

        // Optimistic update
        setItems(prev => prev.map(i => i.name === item.name ? { ...i, enabled: newState } : i))

        try {
            const result = await window.ipcRenderer?.invoke('toggle-startup-item', {
                name: item.name,
                location: item.location,
                enabled: newState
            })

            if (result.success) {
                addLog('SYSTEM', `Successfully ${newState ? 'enabled' : 'disabled'} ${item.name}`)
            } else {
                addLog('ERROR', `Failed to toggle ${item.name}: ${result.error}`)
                // Revert on failure
                setItems(prev => prev.map(i => i.name === item.name ? { ...i, enabled: !newState } : i))
            }
        } catch (error) {
            addLog('ERROR', `Error toggling item: ${error}`)
            // Revert on failure
            setItems(prev => prev.map(i => i.name === item.name ? { ...i, enabled: !newState } : i))
        }
    }

    const openLocation = async (path: string) => {
        if (!path) return
        addLog('SYSTEM', `Opening location: ${path}`)
        await window.ipcRenderer?.invoke('show-item-in-folder', path)
    }

    const searchOnline = async (name: string) => {
        const url = `https://www.google.com/search?q=${encodeURIComponent(name + ' startup process')}`
        await window.ipcRenderer?.invoke('open-external', url)
    }

    const copyList = () => {
        const text = items.map(i => `${i.name} [${i.enabled ? 'ENABLED' : 'DISABLED'}] - ${i.publisher}`).join('\n')
        navigator.clipboard.writeText(text)
        addLog('SYSTEM', 'Startup list copied to clipboard')
    }

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.publisher.toLowerCase().includes(searchTerm.toLowerCase())

            if (filter === 'Enabled') return matchesSearch && item.enabled
            if (filter === 'Disabled') return matchesSearch && !item.enabled
            return matchesSearch
        })
    }, [items, searchTerm, filter])

    const enabledCount = items.filter(i => i.enabled).length
    const estimatedBootTime = 30 + (enabledCount * 3)

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white uppercase flex items-center gap-3 drop-shadow-lg">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Startup Manager</span>
                        <span className="text-xs font-mono font-bold text-violet-300 bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20 flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                            <Clock className="w-3.5 h-3.5" />
                            EST. BOOT: <span className="text-violet-400 font-bold">{estimatedBootTime}s</span>
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1 font-medium">
                        Manage programs that start automatically with Windows to improve boot times.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={copyList}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group"
                        title="Copy list to clipboard"
                    >
                        <Copy className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                        <span>Copy List</span>
                    </button>
                    <button
                        onClick={loadStartupItems}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group"
                        title="Refresh list"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500", loading && "animate-spin")} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-1.5 bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-2xl relative z-10 shadow-lg">
                {/* Filter Tabs */}
                <div className="flex p-1 bg-black/20 rounded-xl flex-shrink-0">
                    {(['All', 'Enabled', 'Disabled'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={clsx(
                                "px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                                filter === f ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            {f}
                            <span className={clsx("px-1.5 py-0.5 rounded text-[9px]", filter === f ? "bg-black/20 text-white/80" : "bg-white/10 text-muted-foreground")}>
                                {items.filter(i => f === 'All' ? true : f === 'Enabled' ? i.enabled : !i.enabled).length}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="w-px h-8 bg-white/10 hidden lg:block flex-shrink-0" />

                {/* Search */}
                <div className="relative w-full lg:w-72 flex-shrink-0 ml-auto">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search programs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-white placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:bg-black/40 transition-all"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-full relative z-10">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                        <div className="text-sm font-bold text-violet-400 animate-pulse">SCANNING STARTUP ITEMS...</div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10 pb-6">
                    <div className="grid grid-cols-1 gap-3">
                        <AnimatePresence mode='popLayout'>
                            {filteredItems.map(item => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    whileHover={{ scale: 1.005, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                                    key={`${item.name}-${item.location}`}
                                    className={clsx(
                                        "group bg-[#0a0e13]/80 backdrop-blur-sm border rounded-xl p-4 flex items-center justify-between transition-all duration-300",
                                        item.enabled
                                            ? "border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                                            : "border-white/5 opacity-70 hover:opacity-100 hover:border-white/10"
                                    )}
                                >
                                    {/* Active Glow Background */}
                                    {item.enabled && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none rounded-xl" />
                                    )}

                                    <div className="flex items-center gap-5 flex-1 min-w-0 relative z-10">
                                        <div className={clsx(
                                            "w-12 h-12 rounded-xl flex items-center justify-center border transition-colors",
                                            item.enabled
                                                ? "bg-violet-500/10 border-violet-500/20 text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                                                : "bg-white/5 border-white/10 text-muted-foreground"
                                        )}>
                                            <Power className="w-6 h-6" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className={clsx("font-bold text-sm truncate tracking-wide", item.enabled ? "text-white" : "text-white/70")}>{item.name}</h3>
                                                <span className={clsx("text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider whitespace-nowrap flex items-center gap-1",
                                                    item.location.includes('HKLM')
                                                        ? "bg-purple-500/10 border-purple-500/20 text-purple-300"
                                                        : "bg-blue-500/10 border-blue-500/20 text-blue-300"
                                                )}>
                                                    <Shield className="w-2.5 h-2.5" />
                                                    {item.location.replace(' (32-bit)', '')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5 group-hover:text-slate-300 transition-colors">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    <span className="truncate max-w-[200px]">{item.publisher || 'Unknown Publisher'}</span>
                                                </div>
                                                <div className="w-px h-3 bg-white/10" />
                                                <button
                                                    onClick={() => openLocation(item.path)}
                                                    className="flex items-center gap-1.5 hover:text-violet-400 transition-colors truncate max-w-[300px] group/path"
                                                    title={item.path}
                                                >
                                                    <FolderOpen className="w-3.5 h-3.5 group-hover/path:text-violet-400" />
                                                    <span className="truncate font-mono text-[10px]">{item.path}</span>
                                                </button>
                                                <div className="w-px h-3 bg-white/10" />
                                                <button
                                                    onClick={() => searchOnline(item.name)}
                                                    className="flex items-center gap-1.5 hover:text-violet-400 transition-colors"
                                                    title="Search online"
                                                >
                                                    <Globe className="w-3.5 h-3.5" />
                                                    <span className="uppercase text-[10px] font-bold tracking-wider">Search</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 pl-6 border-l border-white/5 ml-6 relative z-10">
                                        <div className="text-right hidden sm:block">
                                            <div className={clsx("text-xs font-bold uppercase tracking-wider mb-0.5", item.enabled ? "text-emerald-400" : "text-slate-500")}>
                                                {item.enabled ? 'Enabled' : 'Disabled'}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                                                <Zap className="w-3 h-3" />
                                                {item.enabled ? 'High Impact' : 'No Impact'}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => toggleItem(item)}
                                            className={clsx(
                                                "relative w-12 h-7 rounded-full transition-all flex-shrink-0 border cursor-pointer",
                                                item.enabled
                                                    ? "bg-violet-500/20 border-violet-500/50"
                                                    : "bg-white/5 border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className={clsx(
                                                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all shadow-sm flex items-center justify-center",
                                                item.enabled
                                                    ? "translate-x-5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                                                    : "translate-x-0 bg-white/20 group-hover:bg-white/40"
                                            )} style={{ width: '22px', height: '22px' }}>
                                                {item.enabled && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                            </div>
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <div className="p-6 bg-white/5 rounded-full mb-4 border border-white/5">
                                    <Search className="w-10 h-10 opacity-30" />
                                </div>
                                <p className="text-sm font-medium">No startup programs found matching your filters.</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setFilter('All'); }}
                                    className="mt-3 text-violet-400 text-xs font-bold uppercase tracking-wide hover:text-violet-300 hover:underline"
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
