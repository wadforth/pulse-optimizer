import { useState, useEffect } from 'react'
import { Terminal, Settings, User, X, Maximize2 } from 'lucide-react'
import { useLog, type LogEntry } from '../context/LogContext'
import clsx from 'clsx'

interface FooterProps {
    onNavigate: (tab: string) => void
}

export function Footer({ onNavigate }: FooterProps) {
    const { logs } = useLog()
    const [username, setUsername] = useState('User')
    const [lastLog, setLastLog] = useState<LogEntry | null>(null)
    const [isLogExpanded, setIsLogExpanded] = useState(false)

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

    const getLogColor = (source: string) => {
        switch (source) {
            case 'ERROR': return 'text-red-400'
            case 'SUCCESS': return 'text-green-400'
            case 'WARNING': return 'text-yellow-400'
            default: return 'text-primary'
        }
    }

    return (
        <>
            {/* Footer Bar */}
            <footer className="h-8 border-t border-white/10 bg-[#0a0e13] flex items-center justify-between px-4 text-xs select-none z-50">
                {/* Left: User & Status */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors cursor-pointer group">
                        <User className="w-3 h-3" />
                        <span className="font-medium group-hover:text-primary transition-colors">{username}</span>
                    </div>
                    <div className="w-px h-3 bg-white/10" />
                    <div className="flex items-center gap-2 text-green-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="font-medium">Online</span>
                    </div>
                </div>

                {/* Center: System Log Trigger */}
                <div
                    onClick={() => setIsLogExpanded(!isLogExpanded)}
                    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1 rounded-full hover:bg-white/5 cursor-pointer transition-all group max-w-[400px]"
                >
                    <Terminal className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    {lastLog ? (
                        <span className={clsx("truncate transition-colors", getLogColor(lastLog.source))}>
                            {lastLog.message}
                        </span>
                    ) : (
                        <span className="text-muted-foreground group-hover:text-white transition-colors">System Ready</span>
                    )}
                </div>

                {/* Right: Settings & Version */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onNavigate('settings')}
                        className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group"
                    >
                        <Settings className="w-3 h-3 group-hover:rotate-90 transition-transform duration-500" />
                        <span>Settings</span>
                    </button>
                    <div className="w-px h-3 bg-white/10" />
                    <span className="text-muted-foreground/50 font-mono">v1.0.0</span>
                </div>
            </footer>

            {/* Expanded Log Overlay */}
            {isLogExpanded && (
                <div className="absolute bottom-8 left-0 right-0 bg-[#0a0e13]/95 backdrop-blur-xl border-t border-white/10 p-4 shadow-2xl z-40 max-h-[300px] overflow-y-auto animate-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-[#0a0e13]/95 pb-2 border-b border-white/5">
                        <h3 className="text-sm font-bold flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-primary" />
                            System Log
                        </h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => onNavigate('tools')} className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-white transition-colors" title="Open Full Log">
                                <Maximize2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => setIsLogExpanded(false)} className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-white transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1 font-mono text-xs">
                        {logs.slice().reverse().map((log, i) => (
                            <div key={i} className="flex gap-3 py-0.5 hover:bg-white/[0.02] px-1 rounded">
                                <span className="text-muted-foreground w-16 shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                                <span className={clsx("w-20 shrink-0 font-bold", getLogColor(log.source))}>{log.source}</span>
                                <span className="text-white/80">{log.message}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
