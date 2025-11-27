import { Shield, Power, AlertTriangle, RotateCcw, Check, Info, ChevronRight, XCircle, Search, Filter, X, Maximize2, Zap, Lock, Globe, Cpu } from 'lucide-react'
import { clsx } from 'clsx'
import { useOptimization } from '../context/OptimizationContext'
import { useLog } from '../context/LogContext'
import { useState, useEffect, useMemo } from 'react'
import { type Optimization } from '../context/OptimizationContext'
import { motion, AnimatePresence } from 'framer-motion'

const getRiskColor = (risk: string) => {
    switch (risk) {
        case 'Low': return 'text-emerald-400'
        case 'Medium': return 'text-amber-400'
        case 'High': return 'text-rose-400'
        default: return 'text-slate-400'
    }
}

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'SYSTEM': return <Cpu className="w-3.5 h-3.5" />
        case 'NETWORK': return <Globe className="w-3.5 h-3.5" />
        case 'PRIVACY': return <Lock className="w-3.5 h-3.5" />
        case 'GAMING': return <Zap className="w-3.5 h-3.5" />
        default: return <Shield className="w-3.5 h-3.5" />
    }
}

const TweakCard = ({ opt, isAdmin, onToggle, onSelect }: { opt: Optimization, isAdmin: boolean, onToggle: (id: string, enabled: boolean) => void, onSelect: () => void }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -2 }}
            className={clsx(
                "group relative bg-[#0a0e13]/80 backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer",
                opt.isEnabled
                    ? "border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                    : "border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
            )}
            onClick={onSelect}
        >
            {/* Active Glow Background */}
            {opt.isEnabled && (
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-transparent pointer-events-none" />
            )}

            {/* Status Bar */}
            <div className={clsx(
                "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                opt.isEnabled ? "bg-gradient-to-b from-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" : "bg-white/5 group-hover:bg-white/10"
            )} />

            <div className="p-5 pl-6 relative z-10">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h4 className={clsx("font-bold text-sm truncate tracking-wide", opt.isEnabled ? "text-white" : "text-white/70 group-hover:text-white transition-colors")}>
                                {opt.name}
                            </h4>
                            {opt.isEnabled && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/20 flex items-center gap-1 uppercase tracking-wider shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                                    <Check className="w-2.5 h-2.5" />
                                    ACTIVE
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed group-hover:text-slate-400 transition-colors">
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
                                ? "bg-violet-500/20 border-violet-500/50"
                                : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                    >
                        <div className={clsx(
                            "absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full transition-all shadow-sm flex items-center justify-center",
                            opt.isEnabled
                                ? "translate-x-5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                                : "translate-x-0 bg-white/20 group-hover:bg-white/40"
                        )} style={{ width: '18px', height: '18px' }}>
                            {opt.isEnabled && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                        </div>
                    </button>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-[10px] font-medium text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <span className={clsx("flex items-center gap-1.5 font-bold uppercase tracking-wider", getRiskColor(opt.risk))}>
                            <Shield className="w-3 h-3" />
                            {opt.risk} Risk
                        </span>
                        <span className="flex items-center gap-1.5 uppercase tracking-wider text-slate-500">
                            <Power className="w-3 h-3" />
                            {opt.impact} Impact
                        </span>
                    </div>

                    {/* Hover Indicator */}
                    <div className="flex items-center gap-1 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-bold uppercase tracking-wider text-[9px]">
                        <span>Details</span>
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
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-[#0a0e13] border border-white/10 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        {/* Background Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-start justify-between relative z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2 tracking-wide">{opt.name}</h3>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="bg-white/5 px-2.5 py-1 rounded-md text-muted-foreground border border-white/5 flex items-center gap-1.5 font-medium uppercase tracking-wider text-[10px]">
                                        {getCategoryIcon(opt.category)} {opt.category}
                                    </span>
                                    {opt.isEnabled && (
                                        <span className="bg-violet-500/20 text-violet-300 px-2.5 py-1 rounded-md font-bold border border-violet-500/20 flex items-center gap-1.5 uppercase tracking-wider text-[10px] shadow-[0_0_10px_rgba(139,92,246,0.1)]">
                                            <Check className="w-3 h-3" /> Active
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6 relative z-10">
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {opt.description}
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                    <div className="text-muted-foreground mb-1.5 text-[10px] uppercase tracking-widest font-bold">Current Value</div>
                                    <div className={clsx("font-mono text-sm truncate font-medium", opt.isEnabled ? "text-emerald-400" : "text-white/70")}>
                                        {opt.currentValue || 'Unknown'}
                                    </div>
                                </div>
                                <div className="bg-violet-500/5 rounded-xl p-4 border border-violet-500/10">
                                    <div className="text-violet-400/70 mb-1.5 text-[10px] uppercase tracking-widest font-bold">Optimized Value</div>
                                    <div className="font-mono text-sm text-violet-300 truncate font-medium">
                                        {opt.intendedValue || 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {opt.command && (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">PowerShell Command</div>
                                    <div className="font-mono text-xs text-slate-400 bg-black/40 p-4 rounded-xl border border-white/5 break-all select-text shadow-inner">
                                        <span className="text-violet-500 select-none">$ </span>{opt.command}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-3 text-sm bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
                                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold text-amber-400 mb-1 uppercase tracking-wide text-xs">Potential Side Effects</div>
                                    <div className="text-slate-400 text-xs leading-relaxed">{opt.breakage}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground pt-2 border-t border-white/5 mt-2">
                                <span className={clsx("flex items-center gap-1.5 font-bold uppercase tracking-wider", getRiskColor(opt.risk))}>
                                    <Shield className="w-3.5 h-3.5" />
                                    {opt.risk} Risk
                                </span>
                                <span className="flex items-center gap-1.5 uppercase tracking-wider">
                                    <Power className="w-3.5 h-3.5" />
                                    {opt.impact} Impact
                                </span>
                                {opt.requiresRestart && (
                                    <span className="flex items-center gap-1.5 text-amber-500/80 uppercase tracking-wider font-bold">
                                        <RotateCcw className="w-3.5 h-3.5" />
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
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                    <div className="text-sm font-bold text-violet-400 animate-pulse">ANALYZING SYSTEM...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

            <TweakDetailsModal opt={selectedOpt} isOpen={!!selectedOpt} onClose={() => setSelectedOpt(null)} />

            {/* Restore Point Dialog */}
            <AnimatePresence>
                {showRestoreDialog && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-[#0a0e13] border border-violet-500/30 rounded-2xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(124,58,237,0.2)] relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-[40px] pointer-events-none" />

                            <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4 relative z-10">
                                <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                                    <Shield className="w-6 h-6 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-wide">SYSTEM SAFETY</h3>
                                    <p className="text-xs text-violet-300 font-mono">Create Restore Point</p>
                                </div>
                            </div>
                            <p className="text-slate-300 mb-8 text-sm leading-relaxed relative z-10">
                                Before applying system optimizations, it is highly recommended to create a Windows Restore Point. This allows you to revert changes if anything goes wrong.
                            </p>
                            <div className="flex flex-col gap-3 relative z-10">
                                <button
                                    onClick={handleCreateRestorePoint}
                                    disabled={creatingRestorePoint}
                                    className="flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl transition-all font-bold tracking-wide disabled:opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] border border-white/10 text-sm"
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
                                    className="px-4 py-3.5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white rounded-xl transition-all text-xs font-bold uppercase tracking-wider border border-white/5 hover:border-white/20"
                                >
                                    Skip and Apply Optimization
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white uppercase flex items-center gap-3 drop-shadow-lg">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">System Optimizer</span>
                        <span className="text-xs font-mono font-bold text-violet-300 bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20 flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                            SCORE: <span className="text-violet-400 font-bold">{optimizationScore}%</span>
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1 font-medium">
                        Safe tweaks to improve system performance, privacy, and gaming latency.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Admin Warning */}
                    {!isAdmin && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold font-mono uppercase shadow-[0_0_10px_rgba(239,68,68,0.1)]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Admin Required
                        </div>
                    )}

                    {/* Restore Point Actions */}
                    {systemRestoreStatus && !systemRestoreStatus.enabled && (
                        <button
                            onClick={handleEnableSystemRestore}
                            disabled={enablingRestore || !isAdmin}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {enablingRestore ? 'Enabling...' : 'Enable Restore'}
                        </button>
                    )}

                    <button
                        onClick={handleCreateRestorePoint}
                        disabled={creatingRestorePoint || !isAdmin || (systemRestoreStatus ? !systemRestoreStatus.enabled : false)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold text-muted-foreground hover:text-white transition-all uppercase tracking-wide group"
                    >
                        <RotateCcw className={clsx("w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500", creatingRestorePoint && "animate-spin")} />
                        {creatingRestorePoint ? 'Creating...' : 'Create Restore Point'}
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-1.5 bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-2xl relative z-10 shadow-lg">
                {/* Tabs */}
                <div className="flex p-1 bg-black/20 rounded-xl flex-shrink-0">
                    <button
                        onClick={() => setActiveTab('available')}
                        className={clsx(
                            "px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                            activeTab === 'available' ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
                        )}
                    >
                        Available
                        <span className={clsx("px-1.5 py-0.5 rounded text-[9px]", activeTab === 'available' ? "bg-black/20 text-white/80" : "bg-white/10 text-muted-foreground")}>
                            {optimizations.filter(o => o.exists !== false).length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('unavailable')}
                        className={clsx(
                            "px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                            activeTab === 'unavailable' ? "bg-red-500/20 text-red-400 border border-red-500/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
                        )}
                    >
                        Unavailable
                        {unavailableCount > 0 && (
                            <span className="bg-red-500/20 px-1.5 py-0.5 rounded text-[9px]">
                                {unavailableCount}
                            </span>
                        )}
                    </button>
                </div>

                <div className="w-px h-8 bg-white/10 hidden lg:block flex-shrink-0" />

                {/* Filters */}
                <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none w-full px-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={clsx(
                                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-2 uppercase tracking-wide",
                                selectedCategory === cat
                                    ? "bg-white/10 text-white border-white/20 shadow-inner"
                                    : "bg-transparent text-muted-foreground border-transparent hover:bg-white/5 hover:text-white"
                            )}
                        >
                            {cat === 'All' ? <Filter className="w-3.5 h-3.5" /> : getCategoryIcon(cat)}
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full lg:w-72 flex-shrink-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search tweaks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-white placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:bg-black/40 transition-all"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10 pb-6">
                {filteredOptimizations.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        <AnimatePresence mode='popLayout'>
                            {filteredOptimizations.map(opt => (
                                <TweakCard
                                    key={opt.id}
                                    opt={opt}
                                    isAdmin={isAdmin}
                                    onToggle={handleToggle}
                                    onSelect={() => setSelectedOpt(opt)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <div className="p-6 bg-white/5 rounded-full mb-4 border border-white/5">
                            <Search className="w-10 h-10 opacity-30" />
                        </div>
                        <p className="text-sm font-medium">No tweaks found matching your filters.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}
                            className="mt-3 text-violet-400 text-xs font-bold uppercase tracking-wide hover:text-violet-300 hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
