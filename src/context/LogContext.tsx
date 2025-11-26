import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface LogEntry {
    id: string
    timestamp: string
    source: 'SYSTEM' | 'SCAN' | 'OPTIMIZER' | 'NETWORK' | 'ERROR' | 'SETTINGS' | 'TOOLS' | 'WARNING' | 'STORAGE'
    message: string
}

interface LogContextType {
    logs: LogEntry[]
    addLog: (source: LogEntry['source'], message: string) => void
    clearLogs: () => void
}

const LogContext = createContext<LogContextType | undefined>(undefined)

export function LogProvider({ children }: { children: ReactNode }) {
    const [logs, setLogs] = useState<LogEntry[]>([])

    const addLog = useCallback((source: LogEntry['source'], message: string) => {
        const newLog: LogEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            source,
            message
        }
        setLogs(prev => [...prev, newLog])
    }, [])

    const clearLogs = useCallback(() => {
        setLogs([])
        addLog('SYSTEM', 'System logs cleared')
    }, [addLog])

    return (
        <LogContext.Provider value={{ logs, addLog, clearLogs }}>
            {children}
        </LogContext.Provider>
    )
}

export function useLog() {
    const context = useContext(LogContext)
    if (context === undefined) {
        throw new Error('useLog must be used within a LogProvider')
    }
    return context
}
