import { useState, useEffect, useRef } from 'react'
import { Terminal, Settings, User, X, Maximize2, ChevronUp, Activity, Trash2 } from 'lucide-react'
import { useLog, type LogEntry } from '../context/LogContext'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

interface FooterProps {
    onNavigate: (tab: string) => void
}

export function Footer({ onNavigate }: FooterProps) {
    const { logs, clearLogs } = useLog()
    const [username, setUsername] = useState('User')
    const [lastLog, setLastLog] = useState<LogEntry | null>(null)
    const [isLogExpanded, setIsLogExpanded] = useState(false)
    const logEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const loadUser = async () => {
            try {
                const user = await window.ipcRenderer?.invoke('get-username')
                if (user) setUsername(user)
            } catch (e) {
                console.error('Failed to load username', e)
            }
        }
        loadUser()
    }, [])

    useEffect(() => {
        if (logs.length > 0) {
            setLastLog(logs[logs.length - 1])
        }
    }, [logs])

    // Auto-scroll to bottom when logs change
    useEffect(() => {
        if (isLogExpanded && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs, isLogExpanded])

    const getLogStyle = (source: string) => {
        switch (source) {
            case 'ERROR': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }
            case 'SUCCESS': return { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' }
            case 'WARNING': return { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' }
            case 'OPTIMIZER': return { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' }
            case 'NETWORK': return { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' }
            case 'SYSTEM': return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
            default: return { color: 'text-muted-foreground', bg: 'bg-white/5', border: 'border-white/10' }
        }
    }

    return (
        <>
            {/* Footer Bar */}
            <footer className="h-9 border-t border-white/10 bg-[#0a0e13]/90 backdrop-blur-md flex items-center justify-between px-4 text-xs select-none z-50 relative shadow-[0_-1px_10px_rgba(0,0,0,0.2)]">
                {/* Left: User & Status */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors cursor-pointer group bg-white/5 px-2 py-1 rounded-md border border-white/5 hover:border-white/10">
                        <User className="w-3 h-3 text-violet-400" />
                        <span className="font-bold tracking-wide group-hover:text-violet-200 transition-colors">{username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </div>
                        <span className="font-mono text-[10px] text-green-400/80 uppercase tracking-wider">Online</span>
                    </div>
                </div>

                {/* Center: System Log Trigger */}
                <button
                    onClick={() => setIsLogExpanded(!isLogExpanded)}
                    className={clsx(
                        "absolute left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-1.5 rounded-full transition-all duration-300 group border max-w-[500px]",
                        isLogExpanded
                            ? "bg-violet-500/10 border-violet-500/30 text-violet-200 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                            : "bg-[#0a0e13] border-white/10 hover:border-violet-500/30 hover:bg-white/5 text-muted-foreground hover:text-white"
                    )}
                >
                    <Terminal className={clsx("w-3.5 h-3.5 transition-colors", isLogExpanded ? "text-violet-400" : "text-muted-foreground group-hover:text-violet-400")} />

                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono text-[10px] opacity-50 shrink-0">console:~$</span>
                        {lastLog ? (
                            <span className={clsx("truncate font-mono transition-colors", getLogStyle(lastLog.source).color)}>
                                {lastLog.message}
                            </span>
                        ) : (
                            <span className="text-muted-foreground/50 italic">System Ready</span>
                        )}
                        <span className="w-1.5 h-3 bg-violet-500/50 animate-pulse ml-1" />
                    </div>

                    <ChevronUp className={clsx("w-3 h-3 transition-transform duration-300", isLogExpanded && "rotate-180")} />
                </button>

                {/* Right: Settings & Version */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onNavigate('settings')}
                        className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transition-colors group relative"
                        title="Settings"
                    >
                        <Settings className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                    <div className="w-px h-3 bg-white/10" />
                    <span className="text-[10px] font-mono text-white/20">v2.0.0</span>
                </div>
            </footer>

            {/* Expanded Log Overlay */}
            <AnimatePresence>
                {isLogExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute bottom-10 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[800px] bg-[#0a0e13]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40 overflow-hidden flex flex-col max-h-[400px]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded bg-violet-500/10 border border-violet-500/20">
                                    <Terminal className="w-3.5 h-3.5 text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-white tracking-wide">SYSTEM LOG</h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                        </span>
                                        <span className="text-[9px] font-mono text-green-400/70 uppercase">Live Monitoring</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearLogs}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-500/10 text-[10px] font-bold text-muted-foreground hover:text-red-400 transition-colors border border-transparent hover:border-red-500/20"
                                >
                                    <Trash2 size={12} />
                                    CLEAR
                                </button>
                                <div className="w-px h-3 bg-white/10 mx-1" />
                                <button onClick={() => setIsLogExpanded(false)} className="p-1.5 hover:bg-white/10 rounded text-muted-foreground hover:text-white transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Log Content */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs custom-scrollbar bg-black/20">
                            {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 gap-2 min-h-[150px]">
                                    <Activity size={24} />
                                    <p>No logs available</p>
                                </div>
                            ) : (
                                logs.map((log, i) => {
                                    const style = getLogStyle(log.source)
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05, duration: 0.2 }}
                                            className="group flex gap-3 py-1.5 px-2 rounded hover:bg-white/5 transition-colors border-l-2 border-transparent hover:border-white/20"
                                        >
                                            <span className="text-muted-foreground/40 w-[70px] shrink-0 select-none">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>

                                            <span className={clsx(
                                                "w-[80px] shrink-0 font-bold text-[10px] px-1.5 py-0.5 rounded text-center border select-none",
                                                style.color, style.bg, style.border
                                            )}>
                                                {log.source}
                                            </span>

                                            <span className={clsx("text-white/80 break-all", style.color === 'text-muted-foreground' ? 'text-white/70' : 'text-white/90')}>
                                                {log.message}
                                            </span>
                                        </motion.div>
                                    )
                                })
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
