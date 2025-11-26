import { Trash2, AlertTriangle, ChevronDown, ChevronUp, FileText, RefreshCw, Search, Filter, Download, Copy, CheckCircle } from 'lucide-react'
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

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-wide text-white uppercase flex items-center gap-3">
                        Storage Cleaner
                        <span className="text-sm font-mono font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5 text-primary" />
                            {formatSize(totalSizeToFree)} TO FREE
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        {selected.size} selected • {totalFiles.toLocaleString()} total files found
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={selectSafe}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/30 transition-colors text-xs font-medium text-green-400"
                        title="Select all low-risk items"
                    >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Select Safe</span>
                    </button>
                    <button
                        onClick={copyReport}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white"
                        title="Copy report to clipboard"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Report</span>
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
                        onClick={scanCategories}
                        disabled={cleaning || categories.some(c => c.isScanning)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white disabled:opacity-50"
                        title="Rescan all"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5", categories.some(c => c.isScanning) && "animate-spin")} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h3 className="text-yellow-400 font-bold uppercase text-xs tracking-wide">Warning: Irreversible Action</h3>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                            Files deleted here cannot be recovered. Review the file lists and risk assessments carefully before proceeding.
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
                {/* Filter Tabs */}
                <div className="flex p-1 bg-black/20 rounded-lg flex-shrink-0 overflow-x-auto">
                    {(['All', 'Selected', 'Low', 'Medium', 'High'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                filter === f ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            {f}
                            {f !== 'All' && f !== 'Selected' && (
                                <span className={clsx(
                                    "ml-1.5 px-1 rounded text-[9px]",
                                    f === 'Low' ? "bg-green-500/20" : f === 'Medium' ? "bg-yellow-500/20" : "bg-red-500/20"
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors h-[34px]"
                    />
                </div>

                {/* Clean Button */}
                <button
                    onClick={handleClean}
                    disabled={selected.size === 0 || cleaning}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold transition-all uppercase tracking-wider text-xs whitespace-nowrap",
                        selected.size > 0 && !cleaning
                            ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                            : "bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5"
                    )}
                >
                    <Trash2 className={clsx("w-3.5 h-3.5", cleaning && "animate-pulse")} />
                    {cleaning ? 'CLEANING...' : 'CLEAN SELECTED'}
                </button>
            </div>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="grid grid-cols-1 gap-3 pb-6">
                    <AnimatePresence>
                        {filteredCategories.map(category => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={category.id}
                                className={clsx(
                                    "group bg-[#0a0e13] border rounded-xl transition-all overflow-hidden",
                                    selected.has(category.id) ? "border-primary/30 shadow-[0_0_10px_rgba(124,58,237,0.05)]" : "border-white/5 hover:border-white/10"
                                )}
                            >
                                <div
                                    className="p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                    onClick={() => toggleSelection(category.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={clsx(
                                            "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                                            selected.has(category.id)
                                                ? "bg-primary border-primary shadow-[0_0_8px_currentColor]"
                                                : "border-white/20 group-hover:border-primary/50"
                                        )}>
                                            {selected.has(category.id) && (
                                                <div className="w-2.5 h-2.5 bg-white rounded-[1px]" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className={clsx(
                                                        "font-bold text-sm tracking-wide transition-colors",
                                                        selected.has(category.id) ? "text-white" : "text-muted-foreground group-hover:text-white"
                                                    )}>
                                                        {category.name}
                                                    </h3>
                                                    <span className={clsx(
                                                        "text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border",
                                                        category.risk === 'Low' ? "border-green-500/30 text-green-400 bg-green-500/10" :
                                                            category.risk === 'Medium' ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/10" :
                                                                "border-red-500/30 text-red-400 bg-red-500/10"
                                                    )}>
                                                        {category.risk} Risk
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {category.isScanning ? (
                                                        <span className="text-muted-foreground text-xs animate-pulse">Scanning...</span>
                                                    ) : (
                                                        <>
                                                            <span className="text-muted-foreground text-xs">
                                                                {(category.scannedFiles?.length || 0).toLocaleString()} files
                                                            </span>
                                                            <span className={clsx(
                                                                "font-mono text-sm font-bold",
                                                                category.totalSize && category.totalSize > 0 ? "text-primary" : "text-muted-foreground"
                                                            )}>
                                                                {formatSize(category.totalSize)}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-1">{category.description}</p>
                                            <p className={clsx(
                                                "text-xs",
                                                category.risk === 'Low' ? "text-green-400/70" :
                                                    category.risk === 'Medium' ? "text-yellow-400/70" :
                                                        "text-red-400/70"
                                            )}>
                                                <span className="font-bold">Note:</span> {category.riskDescription}
                                            </p>
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
                                        className="w-full px-4 py-2 flex items-center justify-between text-xs text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <FileText className="w-3 h-3" />
                                            {expandedCategory === category.id ? 'Hide Files' : 'Show Files'} ({category.scannedFiles?.length || 0})
                                        </span>
                                        {expandedCategory === category.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>

                                    {expandedCategory === category.id && (
                                        <div className="px-4 pb-4 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                            {category.scannedFiles && category.scannedFiles.length > 0 ? (
                                                <div className="space-y-1">
                                                    {category.scannedFiles.slice(0, 50).map((file, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-[10px] text-muted-foreground hover:text-white py-0.5 border-b border-white/5 last:border-0">
                                                            <span className="truncate max-w-[70%] font-mono" title={file.path}>{file.path}</span>
                                                            <span className="text-primary/70 font-mono">{formatSize(file.size)}</span>
                                                        </div>
                                                    ))}
                                                    {category.scannedFiles.length > 50 && (
                                                        <div className="text-[10px] text-center text-muted-foreground pt-2 italic">
                                                            ...and {category.scannedFiles.length - 50} more files
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-muted-foreground italic text-center py-2">
                                                    No files found to clean.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredCategories.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <div className="p-4 bg-white/5 rounded-full mb-3">
                                <Search className="w-8 h-8 opacity-50" />
                            </div>
                            <p className="text-sm">No categories found matching your filters.</p>
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
        </div>
    )
}
