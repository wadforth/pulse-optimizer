import { useEffect, useRef } from 'react'
import { Terminal, Maximize2, Minimize2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { type LogEntry } from '../context/LogContext'

interface SystemLogProps {
    logs: LogEntry[]
    className?: string
}

export function SystemLog({ logs, className }: SystemLogProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs])

    const getSourceColor = (source: LogEntry['source']) => {
        switch (source) {
            case 'SYSTEM': return 'text-blue-400'
            case 'SCAN': return 'text-primary'
            case 'OPTIMIZER': return 'text-green-400'
            case 'NETWORK': return 'text-purple-400'
            case 'ERROR': return 'text-red-500'
            default: return 'text-gray-400'
        }
    }

    return (
        <div className={clsx("bg-black/40 backdrop-blur-md border border-white/5 rounded-lg overflow-hidden flex flex-col font-mono text-xs", className)}>
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-primary animate-pulse">●</span>
                    <span className="font-bold tracking-wider text-muted-foreground">SYSTEM_LOG</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-1.5 h-48">
                <AnimatePresence initial={false}>
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-start gap-3"
                        >
                            <span className="text-muted-foreground/50 shrink-0">{log.timestamp}</span>
                            <span className={clsx("font-bold shrink-0 w-20", getSourceColor(log.source))}>
                                [{log.source}]
                            </span>
                            <span className="text-gray-300">{log.message}</span>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {logs.length === 0 && (
                    <div className="text-muted-foreground/30 italic">No system events recorded...</div>
                )}
            </div>
        </div>
    )
}
