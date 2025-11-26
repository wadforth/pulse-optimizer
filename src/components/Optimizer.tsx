import { Shield, Power, AlertTriangle, RotateCcw, Check, Info, ChevronRight, XCircle, Search, Filter, X, Maximize2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useOptimization } from '../context/OptimizationContext'
import { useLog } from '../context/LogContext'
import { useState, useEffect, useMemo } from 'react'
import { type Optimization } from '../context/OptimizationContext'
import { motion, AnimatePresence } from 'framer-motion'

const getRiskColor = (risk: string) => {
    switch (risk) {
        case 'Low': return 'text-green-400 font-bold'
        case 'Medium': return 'text-yellow-400 font-bold'
        case 'High': return 'text-red-400 font-bold'
        default: return 'text-gray-400'
    }
}

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'SYSTEM': return '⚙️'
        case 'NETWORK': return '🌐'
        case 'PRIVACY': return '🔒'
        case 'GAMING': return '🎮'
        default: return '📦'
    }
}

const TweakCard = ({ opt, isAdmin, onToggle, onSelect }: { opt: Optimization, isAdmin: boolean, onToggle: (id: string, enabled: boolean) => void, onSelect: () => void }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={clsx(
                "group relative bg-[#0a0e13] border rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 cursor-pointer",
                opt.isEnabled ? "border-primary/40 shadow-[0_0_15px_rgba(124,58,237,0.1)]" : "border-white/5"
            )}
            onClick={onSelect}
        >
            {/* Status Bar */}
            <div className={clsx(
                "absolute left-0 top-0 bottom-0 w-1 transition-colors",
                opt.isEnabled ? "bg-primary" : "bg-white/5 group-hover:bg-white/10"
            )} />

            <div className="p-4 pl-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className={clsx("font-bold text-sm truncate", opt.isEnabled ? "text-white" : "text-white/70")}>
                                {opt.name}
                            </h4>
                            {opt.isEnabled && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    ACTIVE
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {opt.description}
                        </p>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onToggle(opt.id, opt.isEnabled)
                        }}
                        disabled={!isAdmin && opt.requiresAdmin || opt.exists === false}
                        className={clsx(
                            "relative w-11 h-6 rounded-full transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed border z-10",
                            opt.isEnabled
                                ? "bg-primary/20 border-primary/50"
                                : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                    >
                        <div className={clsx(
                            "absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full transition-all shadow-sm",
                            opt.isEnabled
                                ? "translate-x-5 bg-primary shadow-[0_0_8px_currentColor]"
                                : "translate-x-0 bg-white/20 group-hover:bg-white/40"
                        )} style={{ width: '18px', height: '18px' }} />
                    </button>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-[10px] font-medium text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <span className={clsx("flex items-center gap-1", getRiskColor(opt.risk))}>
                            <Shield className="w-3 h-3" />
                            {opt.risk} Risk
                        </span>
                        <span className="flex items-center gap-1">
                            <Power className="w-3 h-3" />
                            {opt.impact} Impact
                        </span>
                    </div>

                    {/* Hover Indicator */}
                    <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span>View Details</span>
                        <Maximize2 className="w-3 h-3" />
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

const TweakDetailsModal = ({ opt, isOpen, onClose }: { opt: Optimization | null, isOpen: boolean, onClose: () => void }) => {
    if (!opt) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-[#0a0e13] border border-white/10 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">{opt.name}</h3>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="bg-white/5 px-2 py-0.5 rounded text-muted-foreground border border-white/5">
                                        {getCategoryIcon(opt.category)} {opt.category}
                                    </span>
                                    {opt.isEnabled && (
                                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded font-bold border border-primary/20 flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Active
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {opt.description}
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                    <div className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider">Current Value</div>
                                    <div className={clsx("font-mono text-sm truncate", opt.isEnabled ? "text-green-400" : "text-white/70")}>
                                        {opt.currentValue || 'Unknown'}
                                    </div>
                                </div>
                                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                                    <div className="text-primary/70 mb-1 text-[10px] uppercase tracking-wider">Optimized Value</div>
                                    <div className="font-mono text-sm text-primary truncate">
                                        {opt.intendedValue || 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {opt.command && (
                                <div className="space-y-2">
                                    <div className="text-xs font-medium text-white/50 uppercase tracking-wider">Command</div>
                                    <div className="font-mono text-xs text-muted-foreground bg-black/40 p-3 rounded-lg border border-white/5 break-all select-text">
                                        <span className="text-white/30 select-none">$ </span>{opt.command}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-3 text-sm bg-orange-500/5 border border-orange-500/10 rounded-lg p-4">
                                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-orange-400 mb-1">Potential Side Effects</div>
                                    <div className="text-muted-foreground text-xs leading-relaxed">{opt.breakage}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground pt-2">
                                <span className={clsx("flex items-center gap-1.5", getRiskColor(opt.risk))}>
                                    <Shield className="w-4 h-4" />
                                    {opt.risk} Risk
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Power className="w-4 h-4" />
                                    {opt.impact} Impact
                                </span>
                                {opt.requiresRestart && (
                                    <span className="flex items-center gap-1.5 text-yellow-500/80">
                                        <RotateCcw className="w-4 h-4" />
                                        Restart Required
                                    </span>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

export function Optimizer() {
    const {
        optimizations,
        applyOptimization,
        revertOptimization,
        optimizationScore,
        loading,
        systemRestoreStatus,
        enableSystemRestore,
        checkSystemRestore
    } = useOptimization()
    const { addLog } = useLog()

    const [activeTab, setActiveTab] = useState<'available' | 'unavailable'>('available')
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [selectedOpt, setSelectedOpt] = useState<Optimization | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const [creatingRestorePoint, setCreatingRestorePoint] = useState(false)
    const [enablingRestore, setEnablingRestore] = useState(false)
    const [showRestoreDialog, setShowRestoreDialog] = useState(false)
    const [pendingOptimizationId, setPendingOptimizationId] = useState<string | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        window.ipcRenderer?.invoke('check-admin-status').then((result) => {
            setIsAdmin(result?.isAdmin || false)
        })
    }, [])

    const categories = ['All', 'SYSTEM', 'NETWORK', 'PRIVACY', 'GAMING']

    const handleToggle = async (id: string, isEnabled: boolean) => {
        if (!isAdmin) {
            addLog('ERROR', 'Administrator privileges required to change settings')
            return
        }
        if (!isEnabled && !localStorage.getItem('hasShownRestoreDialog')) {
            setPendingOptimizationId(id)
            setShowRestoreDialog(true)
            return
        }
        processToggle(id, isEnabled)
    }

    const processToggle = async (id: string, isEnabled: boolean) => {
        if (isEnabled) {
            await revertOptimization(id)
        } else {
            await applyOptimization(id)
        }
    }

    const handleCreateRestorePoint = async () => {
        setCreatingRestorePoint(true)
        addLog('SYSTEM', 'Creating Windows System Restore Point...')
        try {
            const result = await window.ipcRenderer?.invoke('create-restore-point')
            if (result?.success) {
                addLog('SYSTEM', result.message)
                localStorage.setItem('hasShownRestoreDialog', 'true')
                setShowRestoreDialog(false)
                if (pendingOptimizationId) {
                    processToggle(pendingOptimizationId, false)
                    setPendingOptimizationId(null)
                }
                checkSystemRestore()
            } else {
                addLog('ERROR', result?.message || 'Failed to create restore point')
            }
        } catch (error) {
            addLog('ERROR', 'Error creating restore point')
        } finally {
            setCreatingRestorePoint(false)
        }
    }

    const handleSkipRestore = () => {
        localStorage.setItem('hasShownRestoreDialog', 'true')
        setShowRestoreDialog(false)
        if (pendingOptimizationId) {
            processToggle(pendingOptimizationId, false)
            setPendingOptimizationId(null)
        }
    }

    const handleEnableSystemRestore = async () => {
        setEnablingRestore(true)
        await enableSystemRestore()
        setEnablingRestore(false)
    }

    // Filtering Logic
    const filteredOptimizations = useMemo(() => {
        return optimizations.filter(opt => {
            // Tab Filter
            const isAvailable = opt.exists !== false
            if (activeTab === 'available' && !isAvailable) return false
            if (activeTab === 'unavailable' && isAvailable) return false

            // Category Filter
            if (selectedCategory !== 'All' && opt.category !== selectedCategory) return false

            // Search Filter
            if (searchTerm && !opt.name.toLowerCase().includes(searchTerm.toLowerCase()) && !opt.description.toLowerCase().includes(searchTerm.toLowerCase())) return false

            return true
        })
    }, [optimizations, activeTab, selectedCategory, searchTerm])

    const unavailableCount = optimizations.filter(o => o.exists === false).length

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative overflow-hidden">
            <TweakDetailsModal opt={selectedOpt} isOpen={!!selectedOpt} onClose={() => setSelectedOpt(null)} />

            {/* Restore Point Dialog */}
            <AnimatePresence>
                {showRestoreDialog && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-[#0a0e13] border border-primary/30 rounded-xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(124,58,237,0.1)]"
                        >
                            <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
                                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-white tracking-wide">SYSTEM SAFETY</h3>
                            </div>
                            <p className="text-muted-foreground mb-6 font-mono text-sm leading-relaxed">
                                Before applying system optimizations, it is highly recommended to create a Windows Restore Point. This allows you to revert changes if anything goes wrong.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleCreateRestorePoint}
                                    disabled={creatingRestorePoint}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary text-white rounded-lg transition-all font-bold tracking-wide disabled:opacity-50 shadow-[0_0_15px_rgba(8,145,178,0.4)]"
                                >
                                    {creatingRestorePoint ? (
                                        <>
                                            <RotateCcw className="w-4 h-4 animate-spin" />
                                            CREATING RESTORE POINT...
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-4 h-4" />
                                            CREATE RESTORE POINT (RECOMMENDED)
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleSkipRestore}
                                    disabled={creatingRestorePoint}
                                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white rounded-lg transition-all text-xs font-mono uppercase tracking-wider border border-white/5 hover:border-white/20"
                                >
                                    Skip and Apply Optimization
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-wide text-white uppercase flex items-center gap-3">
                        System Optimizer
                        <span className="text-sm font-mono font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5">
                            SCORE: <span className="text-primary font-bold">{optimizationScore}%</span>
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Safe tweaks to improve performance and privacy.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Admin Warning */}
                    {!isAdmin && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold font-mono uppercase">
                            <AlertTriangle className="w-3 h-3" />
                            Admin Required
                        </div>
                    )}

                    {/* Restore Point Actions */}
                    {systemRestoreStatus && !systemRestoreStatus.enabled && (
                        <button
                            onClick={handleEnableSystemRestore}
                            disabled={enablingRestore || !isAdmin}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold font-mono uppercase transition-all disabled:opacity-50"
                        >
                            <AlertTriangle className="w-3 h-3" />
                            {enablingRestore ? 'Enabling...' : 'Enable Restore'}
                        </button>
                    )}

                    <button
                        onClick={handleCreateRestorePoint}
                        disabled={creatingRestorePoint || !isAdmin || (systemRestoreStatus ? !systemRestoreStatus.enabled : false)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-colors"
                    >
                        <RotateCcw className={clsx("w-3.5 h-3.5", creatingRestorePoint && "animate-spin")} />
                        {creatingRestorePoint ? 'Creating...' : 'Create Restore Point'}
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
                {/* Tabs */}
                <div className="flex p-1 bg-black/20 rounded-lg flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('available')}
                        className={clsx(
                            "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                            activeTab === 'available' ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
                        )}
                    >
                        Available
                        <span className="bg-black/20 px-1.5 rounded text-[10px] opacity-70">
                            {optimizations.filter(o => o.exists !== false).length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('unavailable')}
                        className={clsx(
                            "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                            activeTab === 'unavailable' ? "bg-red-500/20 text-red-400 border border-red-500/20" : "text-muted-foreground hover:text-white"
                        )}
                    >
                        Unavailable
                        {unavailableCount > 0 && (
                            <span className="bg-red-500/20 px-1.5 rounded text-[10px]">
                                {unavailableCount}
                            </span>
                        )}
                    </button>
                </div>

                <div className="w-px h-8 bg-white/10 hidden lg:block flex-shrink-0" />

                {/* Filters */}
                <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none w-full">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap border flex items-center gap-1.5",
                                selectedCategory === cat
                                    ? "bg-white/10 text-white border-white/20"
                                    : "bg-transparent text-muted-foreground border-transparent hover:bg-white/5"
                            )}
                        >
                            {cat === 'All' ? <Filter className="w-3 h-3" /> : getCategoryIcon(cat)}
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full lg:w-64 flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search tweaks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors h-[34px]"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {filteredOptimizations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-6">
                        {filteredOptimizations.map(opt => (
                            <TweakCard
                                key={opt.id}
                                opt={opt}
                                isAdmin={isAdmin}
                                onToggle={handleToggle}
                                onSelect={() => setSelectedOpt(opt)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <div className="p-4 bg-white/5 rounded-full mb-3">
                            <Search className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="text-sm">No tweaks found matching your filters.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
                            className="mt-2 text-primary text-xs hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
