import { Sun, Moon, Monitor, Database, Download, Upload, Trash2, RefreshCw, Info, FileJson } from 'lucide-react'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { useTheme } from '../context/ThemeContext'
import { useLog } from '../context/LogContext'
import { motion, AnimatePresence } from 'framer-motion'

export function Settings() {
    const { theme, setTheme } = useTheme()
    const { addLog } = useLog()
    const [backups, setBackups] = useState<any[]>([])
    const [backupLocation, setBackupLocation] = useState('')
    const [creatingBackup, setCreatingBackup] = useState(false)
    const [appVersion] = useState('1.0.0')
    const [buildDate] = useState(new Date().toLocaleDateString())

    useEffect(() => {
        loadBackups()
    }, [])

    const loadBackups = async () => {
        try {
            const result = await window.ipcRenderer?.invoke('list-backups')
            if (result?.success) {
                setBackups(result.backups || [])
                setBackupLocation(result.backupDir || '')
            }
        } catch (error) {
            console.error('Failed to load backups:', error)
        }
    }

    const handleCreateBackup = async () => {
        setCreatingBackup(true)
        addLog('SYSTEM', 'Creating backup...')
        try {
            const result = await window.ipcRenderer?.invoke('create-backup')
            if (result?.success) {
                addLog('SETTINGS', `Backup created: ${result.path}`)
                await loadBackups()
            } else {
                addLog('ERROR', `Backup failed: ${result?.message}`)
            }
        } catch (error) {
            addLog('ERROR', 'Failed to create backup')
        }
        setCreatingBackup(false)
    }

    const handleRestore = async (backupPath: string) => {
        addLog('SYSTEM', `Restoring backup...`)
        try {
            const result = await window.ipcRenderer?.invoke('restore-backup', backupPath)
            if (result?.success) {
                addLog('SETTINGS', 'Backup restored - restart app to apply')
                if (result.data?.optimizations) {
                    localStorage.setItem('optimizations', JSON.stringify(result.data.optimizations))
                }
            } else {
                addLog('ERROR', `Restore failed: ${result?.message}`)
            }
        } catch (error) {
            addLog('ERROR', 'Failed to restore backup')
        }
    }

    const handleDeleteBackup = async (backupPath: string) => {
        addLog('SYSTEM', 'Deleting backup...')
        try {
            const result = await window.ipcRenderer?.invoke('delete-backup', backupPath)
            if (result?.success) {
                addLog('SETTINGS', 'Backup deleted')
                await loadBackups()
            } else {
                addLog('ERROR', `Delete failed: ${result?.message}`)
            }
        } catch (error) {
            addLog('ERROR', 'Failed to delete backup')
        }
    }

    const handleClearAllBackups = async () => {
        if (!confirm(`Are you sure you want to delete all ${backups.length} backups?`)) return
        addLog('SYSTEM', 'Clearing all backups...')
        for (const backup of backups) {
            await handleDeleteBackup(backup.path)
        }
    }

    const handleExportSettings = () => {
        const settings = {
            theme,
            version: appVersion,
            exportDate: new Date().toISOString(),
            settings: {
                // Add any other app settings here
            }
        }

        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `settings-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
        addLog('SETTINGS', 'Settings exported successfully')
    }

    const handleImportSettings = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (e: any) => {
            const file = e.target.files[0]
            if (!file) return

            try {
                const text = await file.text()
                const settings = JSON.parse(text)

                if (settings.theme) {
                    setTheme(settings.theme)
                }

                addLog('SETTINGS', 'Settings imported successfully')
            } catch (error) {
                addLog('ERROR', 'Failed to import settings - invalid format')
            }
        }
        input.click()
    }

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme)
        addLog('SYSTEM', `Theme changed to ${newTheme}`)
    }

    const totalBackupSize = backups.reduce((sum, b) => sum + (b.size || 0), 0)

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-wide text-white uppercase flex items-center gap-3">
                        Settings
                        <span className="text-sm font-mono font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center gap-2">
                            <Info className="w-3.5 h-3.5 text-primary" />
                            v{appVersion}
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Configure application preferences and manage backups
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportSettings}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white"
                        title="Export settings to file"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Settings</span>
                    </button>
                    <button
                        onClick={handleImportSettings}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white"
                        title="Import settings from file"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Import Settings</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <div className="space-y-6 pb-6">
                    {/* Appearance Section */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-white uppercase tracking-wide">
                            <Monitor className="w-5 h-5 text-primary" />
                            Appearance
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleThemeChange('light')}
                                className={clsx(
                                    "p-6 rounded-xl border flex flex-col items-center gap-3 transition-all",
                                    theme === 'light'
                                        ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                                        : "bg-[#0a0e13] border-white/10 text-muted-foreground hover:border-primary/30 hover:text-white"
                                )}
                            >
                                <Sun className={clsx("w-8 h-8", theme === 'light' && "text-primary")} />
                                <span className="font-bold uppercase tracking-wider text-sm">Light</span>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleThemeChange('dark')}
                                className={clsx(
                                    "p-6 rounded-xl border flex flex-col items-center gap-3 transition-all",
                                    theme === 'dark'
                                        ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                                        : "bg-[#0a0e13] border-white/10 text-muted-foreground hover:border-primary/30 hover:text-white"
                                )}
                            >
                                <Moon className={clsx("w-8 h-8", theme === 'dark' && "text-primary")} />
                                <span className="font-bold uppercase tracking-wider text-sm">Dark</span>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleThemeChange('system')}
                                className={clsx(
                                    "p-6 rounded-xl border flex flex-col items-center gap-3 transition-all",
                                    theme === 'system'
                                        ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
                                        : "bg-[#0a0e13] border-white/10 text-muted-foreground hover:border-primary/30 hover:text-white"
                                )}
                            >
                                <Monitor className={clsx("w-8 h-8", theme === 'system' && "text-primary")} />
                                <span className="font-bold uppercase tracking-wider text-sm">System</span>
                            </motion.button>
                        </div>
                    </section>

                    {/* Backup & Restore Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-white uppercase tracking-wide">
                                <Database className="w-5 h-5 text-primary" />
                                Backup & Restore
                            </h3>
                            {backups.length > 0 && (
                                <button
                                    onClick={handleClearAllBackups}
                                    className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Clear All
                                </button>
                            )}
                        </div>

                        <div className="bg-[#0a0e13] border border-white/10 rounded-xl p-6 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="font-bold text-white uppercase tracking-wide mb-1">System Backup</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">Create a backup of your optimization settings and configurations</p>
                                    {backupLocation && (
                                        <p className="text-[10px] text-primary mt-2 font-mono break-all bg-primary/5 p-2 rounded border border-primary/10">{backupLocation}</p>
                                    )}
                                </div>
                                <button
                                    onClick={handleCreateBackup}
                                    disabled={creatingBackup}
                                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap font-bold uppercase tracking-wider text-xs shadow-sm"
                                >
                                    {creatingBackup ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            CREATING...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-3.5 h-3.5" />
                                            CREATE BACKUP
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Backup Statistics */}
                            {backups.length > 0 && (
                                <div className="grid grid-cols-3 gap-4 p-4 bg-white/[0.02] rounded-lg border border-white/5">
                                    <div className="text-center">
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Backups</div>
                                        <div className="text-2xl font-bold text-primary font-mono">{backups.length}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Size</div>
                                        <div className="text-2xl font-bold text-primary font-mono">{(totalBackupSize / 1024).toFixed(1)} KB</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Backup</div>
                                        <div className="text-xs font-bold text-white font-mono">
                                            {backups.length > 0 ? new Date(backups[0].date).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {backups.length > 0 && (
                                <div className="border-t border-white/10 pt-4">
                                    <h4 className="font-bold text-white uppercase tracking-wide mb-3 text-sm">Available Backups</h4>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                        <AnimatePresence>
                                            {backups.map((backup, idx) => (
                                                <motion.div
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg hover:border-white/10 transition-colors group"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-mono text-xs text-primary truncate">{backup.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono mt-1">
                                                            {new Date(backup.date).toLocaleString()} • {(backup.size / 1024).toFixed(1)} KB
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 ml-4">
                                                        <button
                                                            onClick={() => handleRestore(backup.path)}
                                                            className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary/20 transition-colors text-xs font-bold uppercase tracking-wider"
                                                        >
                                                            Restore
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteBackup(backup.path)}
                                                            className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors"
                                                            title="Delete backup"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* App Info Section */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-white uppercase tracking-wide">
                            <Info className="w-5 h-5 text-primary" />
                            Application Info
                        </h3>
                        <div className="bg-[#0a0e13] border border-white/10 rounded-xl p-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                                    <FileJson className="w-5 h-5 text-primary flex-shrink-0" />
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Version</div>
                                        <div className="font-bold text-white font-mono">{appVersion}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/5">
                                    <Database className="w-5 h-5 text-primary flex-shrink-0" />
                                    <div>
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Build Date</div>
                                        <div className="font-bold text-white font-mono">{buildDate}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
