import { Trash2, AlertTriangle, ChevronDown, ChevronUp, FileText, RefreshCw, Search, Filter, Download, Copy, CheckCircle, Gamepad2, Database, AlertOctagon, Zap, Shield } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import { useLog } from '../context/LogContext'
import { motion, AnimatePresence } from 'framer-motion'

interface ScannedFile {
    path: string
    size: number
}

interface CleanupCategory {
    id: string
    name: string
    description: string
    risk: 'Low' | 'Medium' | 'High'
    riskDescription: string
    isScanning: boolean
    scannedFiles?: ScannedFile[]
    totalSize?: number
    error?: string
}

export function StorageCleaner() {
    const { addLog } = useLog()
    const [categories, setCategories] = useState<CleanupCategory[]>([
        {
            id: 'temp',
            name: 'Temporary Files',
            description: 'Windows temp files and caches',
            risk: 'Low',
            riskDescription: 'Safe to delete. Apps recreate needed files.',
            isScanning: true
        },
        {
            id: 'downloads',
            name: 'Downloads Folder',
            description: 'Old downloaded files',
            risk: 'High',
            riskDescription: 'Contains your downloaded files. Review carefully.',
            isScanning: true
        },
        {
            id: 'recycle',
            name: 'Recycle Bin',
            description: 'Deleted files waiting to be removed',
            risk: 'Medium',
            riskDescription: 'Permanently deletes files.',
            isScanning: true
        },
        {
            id: 'chrome_cache',
            name: 'Google Chrome Cache',
            description: 'Cached websites and images',
            risk: 'Low',
            riskDescription: 'Safe. Will sign you out of some sites or reload images.',
            isScanning: true
        },
        {
            id: 'edge_cache',
            name: 'Microsoft Edge Cache',
            description: 'Cached websites and images',
            risk: 'Low',
            riskDescription: 'Safe. Will sign you out of some sites or reload images.',
            isScanning: true
        },
        {
            id: 'prefetch',
            name: 'Windows Prefetch',
            description: 'App launch data',
            risk: 'Low',
            riskDescription: 'Safe. Windows rebuilds this. May slow first app launches.',
            isScanning: true
        },
        {
            id: 'windows_update',
            name: 'Windows Update Cache',
            description: 'Old update files',
            risk: 'Medium',
            riskDescription: 'Fixes update errors. Do not use if updates are pending.',
            isScanning: true
        },
        {
            id: 'discord_cache',
            name: 'Discord Cache',
            description: 'Cached images and media from Discord',
            risk: 'Low',
            riskDescription: 'Safe. Frees up space without affecting Discord functionality.',
            isScanning: true
        },
        {
            id: 'steam_cache',
            name: 'Steam App Cache',
            description: 'Steam application cache files',
            risk: 'Low',
            riskDescription: 'Safe. Steam will rebuild necessary files.',
            isScanning: true
        },
        {
            id: 'shader_cache',
            name: 'DirectX Shader Cache',
            description: 'Compiled shaders for games',
            risk: 'Low',
            riskDescription: 'Safe. May cause stuttering in games until rebuilt.',
            isScanning: true
        },
        {
            id: 'crash_dumps',
            name: 'System Crash Dumps',
            description: 'Memory dumps from app crashes',
            risk: 'Low',
            riskDescription: 'Safe. Only needed for debugging crashes.',
            isScanning: true
        }
    ])
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [cleaning, setCleaning] = useState(false)
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filter, setFilter] = useState<'All' | 'Selected' | 'Low' | 'Medium' | 'High'>('All')

    useEffect(() => {
        scanCategories()
    }, [])

    const scanCategories = async () => {
        const newCategories = [...categories]

        for (let i = 0; i < newCategories.length; i++) {
            const cat = newCategories[i]
            setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isScanning: true } : c))

            try {
                const result = await window.ipcRenderer?.invoke('scan-storage-category', cat.id)
                if (result?.success) {
                    setCategories(prev => prev.map(c => c.id === cat.id ? {
                        ...c,
                        isScanning: false,
                        scannedFiles: result.files,
                        totalSize: result.totalSize
                    } : c))
                } else {
                    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isScanning: false, error: result?.error || 'Scan failed' } : c))
                }
            } catch (e) {
                setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, isScanning: false, error: 'Scan failed' } : c))
            }
        }
    }

    const toggleSelection = (id: string) => {
        setSelected(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const selectSafe = () => {
        const safeIds = categories.filter(c => c.risk === 'Low' && (c.totalSize || 0) > 0).map(c => c.id)
        setSelected(new Set(safeIds))
        addLog('SYSTEM', `Selected ${safeIds.length} low-risk categories`)
    }

    const formatSize = (bytes?: number) => {
        if (bytes === undefined) return '...'
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const handleClean = async () => {
        setCleaning(true)
        const selectedItems = categories.filter(c => selected.has(c.id))
        addLog('SYSTEM', `Cleaning ${selectedItems.length} categories...`)

        for (const item of selectedItems) {
            addLog('SYSTEM', `Cleaning ${item.name}...`)
            const result = await window.ipcRenderer?.invoke('clean-storage-category', item.id)
            if (result?.success) {
                addLog('SYSTEM', `✓ ${item.name} cleaned`)
            } else {
                addLog('ERROR', `Failed to clean ${item.name}: ${result?.message}`)
            }
        }

        addLog('SYSTEM', `Cleanup complete!`)
        setSelected(new Set())
        setCleaning(false)
        scanCategories()
    }

    const copyReport = () => {
        const report = categories.map(c => {
            const status = selected.has(c.id) ? '[SELECTED]' : '[NOT SELECTED]'
            return `${status} ${c.name} - ${formatSize(c.totalSize)} (${c.scannedFiles?.length || 0} files) - ${c.risk} Risk`
        }).join('\n')

        const header = `Storage Cleanup Report\n${'='.repeat(50)}\nTotal Selected: ${selected.size} categories\nSpace to Free: ${formatSize(totalSizeToFree)}\n\n`

        navigator.clipboard.writeText(header + report)
        addLog('SYSTEM', 'Cleanup report copied to clipboard')
    }

    const exportReport = () => {
        const report = categories.map(c => {
            const status = selected.has(c.id) ? '[SELECTED]' : '[NOT SELECTED]'
            const files = c.scannedFiles?.map(f => `  - ${f.path} (${formatSize(f.size)})`).join('\n') || '  (No files)'
            return `${status} ${c.name}\n  Size: ${formatSize(c.totalSize)}\n  Files: ${c.scannedFiles?.length || 0}\n  Risk: ${c.risk}\n  Description: ${c.description}\n${files}`
        }).join('\n\n')

        const header = `Storage Cleanup Report\n${'='.repeat(50)}\nGenerated: ${new Date().toLocaleString()}\nTotal Selected: ${selected.size} categories\nSpace to Free: ${formatSize(totalSizeToFree)}\n\n`

        const blob = new Blob([header + report], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `cleanup-report-${Date.now()}.txt`
        a.click()
        URL.revokeObjectURL(url)
        addLog('SYSTEM', 'Report exported successfully')
    }

    const filteredCategories = useMemo(() => {
        return categories.filter(cat => {
            const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cat.description.toLowerCase().includes(searchTerm.toLowerCase())

            if (filter === 'Selected') return matchesSearch && selected.has(cat.id)
            if (filter === 'Low' || filter === 'Medium' || filter === 'High') {
                return matchesSearch && cat.risk === filter
            }
            return matchesSearch
        })
    }, [categories, searchTerm, filter, selected])

    const totalSizeToFree = categories
        .filter(c => selected.has(c.id))
        .reduce((sum, c) => sum + (c.totalSize || 0), 0)

    const totalFiles = categories.reduce((sum, c) => sum + (c.scannedFiles?.length || 0), 0)

    const getCategoryIcon = (id: string) => {
        if (id.includes('discord') || id.includes('steam') || id.includes('shader')) return <Gamepad2 className="w-5 h-5" />
        if (id.includes('chrome') || id.includes('edge')) return <Database className="w-5 h-5" />
        if (id.includes('crash')) return <AlertOctagon className="w-5 h-5" />
        return <Trash2 className="w-5 h-5" />
    }

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white uppercase flex items-center gap-3 drop-shadow-lg">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Storage Cleaner</span>
                        <span className="text-xs font-mono font-bold text-violet-300 bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20 flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                            <Trash2 className="w-3.5 h-3.5" />
                            FREEABLE: <span className="text-violet-400 font-bold">{formatSize(totalSizeToFree)}</span>
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1 font-medium">
                        Deep clean your system to reclaim disk space and improve performance.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={selectSafe}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 transition-all text-xs font-bold text-emerald-400 uppercase tracking-wide group"
                        title="Select all low-risk items"
                    >
                        <CheckCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        <span>Select Safe</span>
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
                        onClick={scanCategories}
                        disabled={cleaning || categories.some(c => c.isScanning)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group disabled:opacity-50"
                        title="Rescan all"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500", categories.some(c => c.isScanning) && "animate-spin")} />
                        <span>Rescan</span>
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
                        <h3 className="text-amber-400 font-bold uppercase text-xs tracking-widest">Irreversible Action</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Files deleted here cannot be recovered. Review the file lists and risk assessments carefully before proceeding.
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-1.5 bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-2xl relative z-10 shadow-lg">
                {/* Filter Tabs */}
                <div className="flex p-1 bg-black/20 rounded-xl flex-shrink-0 overflow-x-auto scrollbar-none">
                    {(['All', 'Selected', 'Low', 'Medium', 'High'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2",
                                filter === f ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            {f}
                            {f !== 'All' && f !== 'Selected' && (
                                <span className={clsx(
                                    "px-1.5 py-0.5 rounded text-[9px]",
                                    f === 'Low' ? "bg-emerald-500/20 text-emerald-300" :
                                        f === 'Medium' ? "bg-amber-500/20 text-amber-300" :
                                            "bg-rose-500/20 text-rose-300"
                                )}>
                                    {categories.filter(c => c.risk === f).length}
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
                        placeholder="Search categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-white placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:bg-black/40 transition-all"
                    />
                </div>

                {/* Clean Button */}
                <button
                    onClick={handleClean}
                    disabled={selected.size === 0 || cleaning}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all uppercase tracking-wider text-xs whitespace-nowrap shadow-lg",
                        selected.size > 0 && !cleaning
                            ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-violet-500/20 hover:shadow-violet-500/40"
                            : "bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5"
                    )}
                >
                    <Trash2 className={clsx("w-4 h-4", cleaning && "animate-bounce")} />
                    {cleaning ? 'CLEANING...' : 'CLEAN SELECTED'}
                </button>
            </div>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10 pb-6">
                <div className="grid grid-cols-1 gap-3">
                    <AnimatePresence mode='popLayout'>
                        {filteredCategories.map(category => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={category.id}
                                className={clsx(
                                    "group bg-[#0a0e13]/80 backdrop-blur-sm border rounded-xl transition-all duration-300 overflow-hidden",
                                    selected.has(category.id)
                                        ? "border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                                        : "border-white/5 hover:border-white/10"
                                )}
                            >
                                {/* Active Glow Background */}
                                {selected.has(category.id) && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none" />
                                )}

                                <div
                                    className="p-4 cursor-pointer relative z-10"
                                    onClick={() => toggleSelection(category.id)}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={clsx(
                                            "w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300",
                                            selected.has(category.id)
                                                ? "bg-violet-500 border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                                                : "bg-white/5 border-white/10 group-hover:border-white/30"
                                        )}>
                                            {selected.has(category.id) && (
                                                <CheckCircle className="w-4 h-4 text-white" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx("p-1.5 rounded-lg", selected.has(category.id) ? "bg-violet-500/10 text-violet-400" : "bg-white/5 text-muted-foreground")}>
                                                        {getCategoryIcon(category.id)}
                                                    </div>
                                                    <h3 className={clsx(
                                                        "font-bold text-sm tracking-wide transition-colors",
                                                        selected.has(category.id) ? "text-white" : "text-white/80 group-hover:text-white"
                                                    )}>
                                                        {category.name}
                                                    </h3>
                                                    <span className={clsx(
                                                        "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border flex items-center gap-1",
                                                        category.risk === 'Low' ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/5" :
                                                            category.risk === 'Medium' ? "border-amber-500/20 text-amber-400 bg-amber-500/5" :
                                                                "border-rose-500/20 text-rose-400 bg-rose-500/5"
                                                    )}>
                                                        <Shield className="w-2.5 h-2.5" />
                                                        {category.risk} Risk
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {category.isScanning ? (
                                                        <span className="text-violet-400 text-xs font-bold animate-pulse flex items-center gap-2">
                                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                                            SCANNING...
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <span className="text-muted-foreground text-xs font-medium">
                                                                {(category.scannedFiles?.length || 0).toLocaleString()} files
                                                            </span>
                                                            <div className={clsx(
                                                                "px-2 py-1 rounded-md font-mono text-xs font-bold border",
                                                                category.totalSize && category.totalSize > 0
                                                                    ? "bg-violet-500/10 border-violet-500/20 text-violet-300"
                                                                    : "bg-white/5 border-white/10 text-muted-foreground"
                                                            )}>
                                                                {formatSize(category.totalSize)}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2 pl-11">{category.description}</p>
                                            <div className="pl-11 flex items-center gap-2">
                                                <AlertTriangle className={clsx("w-3 h-3",
                                                    category.risk === 'Low' ? "text-emerald-500/50" :
                                                        category.risk === 'Medium' ? "text-amber-500/50" : "text-rose-500/50"
                                                )} />
                                                <p className={clsx(
                                                    "text-[10px] font-medium",
                                                    category.risk === 'Low' ? "text-emerald-500/70" :
                                                        category.risk === 'Medium' ? "text-amber-500/70" :
                                                            "text-rose-500/70"
                                                )}>
                                                    {category.riskDescription}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable File List */}
                                <div className="border-t border-white/5 bg-black/20">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setExpandedCategory(expandedCategory === category.id ? null : category.id)
                                        }}
                                        className="w-full px-4 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <span className="flex items-center gap-2 pl-12">
                                            <FileText className="w-3 h-3" />
                                            {expandedCategory === category.id ? 'Hide Files' : 'Show Files'}
                                        </span>
                                        {expandedCategory === category.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>

                                    <AnimatePresence>
                                        {expandedCategory === category.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="px-4 pb-4 overflow-hidden"
                                            >
                                                <div className="max-h-60 overflow-y-auto custom-scrollbar bg-[#05070a] rounded-lg border border-white/5 p-2">
                                                    {category.scannedFiles && category.scannedFiles.length > 0 ? (
                                                        <div className="space-y-0.5">
                                                            {category.scannedFiles.slice(0, 50).map((file, idx) => (
                                                                <div key={idx} className="flex items-center justify-between text-[10px] text-muted-foreground hover:text-white py-1 px-2 rounded hover:bg-white/5 transition-colors">
                                                                    <span className="truncate max-w-[70%] font-mono" title={file.path}>{file.path}</span>
                                                                    <span className="text-violet-400/70 font-mono">{formatSize(file.size)}</span>
                                                                </div>
                                                            ))}
                                                            {category.scannedFiles.length > 50 && (
                                                                <div className="text-[10px] text-center text-muted-foreground pt-2 italic font-medium">
                                                                    ...and {category.scannedFiles.length - 50} more files
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-[10px] text-muted-foreground italic text-center py-4">
                                                            No files found to clean.
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredCategories.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <div className="p-6 bg-white/5 rounded-full mb-4 border border-white/5">
                                <Search className="w-10 h-10 opacity-30" />
                            </div>
                            <p className="text-sm font-medium">No categories found matching your filters.</p>
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
        </div>
    )
}
