import { AlertTriangle, Check, X, Building2, Search, Filter, FolderOpen, Power, Clock, Globe, RefreshCw, Copy } from 'lucide-react'
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
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-wide text-white uppercase flex items-center gap-3">
                        Startup Manager
                        <span className="text-sm font-mono font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            EST. BOOT: <span className="text-white font-bold">{estimatedBootTime}s</span>
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Manage programs that start automatically with Windows.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={copyList}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white"
                        title="Copy list to clipboard"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy List</span>
                    </button>
                    <button
                        onClick={loadStartupItems}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white"
                        title="Refresh list"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
                {/* Filter Tabs */}
                <div className="flex p-1 bg-black/20 rounded-lg flex-shrink-0">
                    {(['All', 'Enabled', 'Disabled'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={clsx(
                                "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                                filter === f ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            {f}
                            <span className="bg-black/20 px-1.5 rounded text-[10px] opacity-70">
                                {items.filter(i => f === 'All' ? true : f === 'Enabled' ? i.enabled : !i.enabled).length}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="w-px h-8 bg-white/10 hidden lg:block flex-shrink-0" />

                {/* Search */}
                <div className="relative w-full lg:w-64 flex-shrink-0 ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search programs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors h-[34px]"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="grid grid-cols-1 gap-3 pb-6">
                        <AnimatePresence>
                            {filteredItems.map(item => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={`${item.name}-${item.location}`}
                                    className={clsx(
                                        "group bg-[#0a0e13] border rounded-xl p-4 flex items-center justify-between transition-all hover:border-primary/30",
                                        item.enabled ? "border-primary/20 shadow-[0_0_10px_rgba(124,58,237,0.05)]" : "border-white/5 opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-lg flex items-center justify-center border",
                                            item.enabled ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-muted-foreground"
                                        )}>
                                            <Power className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="font-bold text-white text-sm truncate">{item.name}</h3>
                                                <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border uppercase font-mono tracking-wider whitespace-nowrap",
                                                    item.location.includes('HKLM') ? "bg-purple-500/10 border-purple-500/20 text-purple-400" :
                                                        "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                                )}>
                                                    {item.location.replace(' (32-bit)', '')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1.5">
                                                    <Building2 className="w-3 h-3" />
                                                    <span className="truncate max-w-[150px]">{item.publisher || 'Unknown Publisher'}</span>
                                                </div>
                                                <div className="w-px h-3 bg-white/10" />
                                                <button
                                                    onClick={() => openLocation(item.path)}
                                                    className="flex items-center gap-1.5 hover:text-primary transition-colors truncate max-w-[200px]"
                                                    title={item.path}
                                                >
                                                    <FolderOpen className="w-3 h-3" />
                                                    <span className="truncate">{item.path}</span>
                                                </button>
                                                <div className="w-px h-3 bg-white/10" />
                                                <button
                                                    onClick={() => searchOnline(item.name)}
                                                    className="flex items-center gap-1.5 hover:text-primary transition-colors"
                                                    title="Search online"
                                                >
                                                    <Globe className="w-3 h-3" />
                                                    <span>Search</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pl-4 border-l border-white/5 ml-4">
                                        <div className="text-right hidden sm:block">
                                            <div className={clsx("text-xs font-bold uppercase tracking-wider", item.enabled ? "text-green-400" : "text-muted-foreground")}>
                                                {item.enabled ? 'Enabled' : 'Disabled'}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {item.enabled ? 'High Impact' : 'No Impact'}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => toggleItem(item)}
                                            className={clsx(
                                                "relative w-11 h-6 rounded-full transition-all flex-shrink-0 border cursor-pointer",
                                                item.enabled
                                                    ? "bg-primary/20 border-primary/50"
                                                    : "bg-white/5 border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className={clsx(
                                                "absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full transition-all shadow-sm flex items-center justify-center",
                                                item.enabled
                                                    ? "translate-x-5 bg-primary shadow-[0_0_8px_currentColor]"
                                                    : "translate-x-0 bg-white/20 group-hover:bg-white/40"
                                            )} style={{ width: '18px', height: '18px' }}>
                                                {item.enabled ? <Check className="w-2.5 h-2.5 text-black" /> : <X className="w-2.5 h-2.5 text-black" />}
                                            </div>
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredItems.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <div className="p-4 bg-white/5 rounded-full mb-3">
                                    <Search className="w-8 h-8 opacity-50" />
                                </div>
                                <p className="text-sm">No startup programs found matching your filters.</p>
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
