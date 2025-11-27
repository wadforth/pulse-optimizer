import { Sun, Moon, Monitor, Database, Download, Upload, Trash2, RefreshCw, Info, FileJson, Shield, Cpu, Zap, Activity } from 'lucide-react'
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
    const [appVersion] = useState('2.0.0')
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
        <div className="h-full flex flex-col p-6 space-y-8 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white uppercase flex items-center gap-3 drop-shadow-lg">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Settings</span>
                        <span className="text-xs font-mono font-bold text-violet-300 bg-violet-500/10 px-2 py-1 rounded border border-violet-500/20 flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                            <Shield className="w-3 h-3" />
                            v{appVersion}
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1 font-medium">
                        Configure application preferences and manage system backups
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportSettings}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group"
                        title="Export settings to file"
                    >
                        <Download className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                        <span>Export</span>
                    </button>
                    <button
                        onClick={handleImportSettings}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group"
                        title="Import settings from file"
                    >
                        <Upload className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
                        <span>Import</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10 space-y-8 pb-8">

                {/* Appearance Section */}
                <section className="space-y-5">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-white/80 uppercase tracking-widest border-b border-white/5 pb-2">
                        <Monitor className="w-4 h-4 text-violet-400" />
                        Appearance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            { id: 'light', icon: Sun, label: 'Light Mode' },
                            { id: 'dark', icon: Moon, label: 'Dark Mode' },
                            { id: 'system', icon: Monitor, label: 'System Default' }
                        ].map((item) => (
                            <motion.button
                                key={item.id}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleThemeChange(item.id as any)}
                                className={clsx(
                                    "p-6 rounded-2xl border flex flex-col items-center gap-4 transition-all duration-300 relative overflow-hidden group",
                                    theme === item.id
                                        ? "bg-violet-500/10 border-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                                        : "bg-[#0a0e13]/60 border-white/5 hover:border-white/20 hover:bg-white/5"
                                )}
                            >
                                {theme === item.id && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent pointer-events-none" />
                                )}
                                <div className={clsx(
                                    "p-4 rounded-full transition-colors",
                                    theme === item.id ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30" : "bg-white/5 text-muted-foreground group-hover:bg-white/10 group-hover:text-white"
                                )}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <span className={clsx(
                                    "font-bold uppercase tracking-wider text-xs",
                                    theme === item.id ? "text-white" : "text-muted-foreground group-hover:text-white"
                                )}>{item.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </section>

                {/* Backup & Restore Section */}
                <section className="space-y-5">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-white/80 uppercase tracking-widest">
                            <Database className="w-4 h-4 text-violet-400" />
                            Backup & Restore
                        </h3>
                        {backups.length > 0 && (
                            <button
                                onClick={handleClearAllBackups}
                                className="flex items-center gap-2 text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/10 transition-colors uppercase tracking-wide"
                            >
                                <Trash2 className="w-3 h-3" />
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-20 bg-violet-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                            <div className="flex-1">
                                <h4 className="font-bold text-white text-lg mb-1 flex items-center gap-2">
                                    System Backup
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wider font-mono">Active</span>
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                                    Create a secure snapshot of your current optimization settings, power plans, and configurations.
                                </p>
                                {backupLocation && (
                                    <div className="mt-3 flex items-center gap-2 text-[10px] text-violet-300/70 font-mono bg-violet-500/5 px-3 py-1.5 rounded-lg border border-violet-500/10 w-fit">
                                        <Database className="w-3 h-3" />
                                        {backupLocation}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleCreateBackup}
                                disabled={creatingBackup}
                                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap font-bold uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] border border-white/10 group"
                            >
                                {creatingBackup ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        PROCESSING...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                                        CREATE NEW BACKUP
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Backup Statistics */}
                        {backups.length > 0 && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 group hover:bg-white/[0.04] transition-colors">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Backups</div>
                                    <div className="text-2xl font-bold text-white font-mono group-hover:text-violet-300 transition-colors">{backups.length}</div>
                                </div>
                                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 group hover:bg-white/[0.04] transition-colors">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total Size</div>
                                    <div className="text-2xl font-bold text-white font-mono group-hover:text-violet-300 transition-colors">{(totalBackupSize / 1024).toFixed(1)} <span className="text-sm text-muted-foreground">KB</span></div>
                                </div>
                                <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 group hover:bg-white/[0.04] transition-colors">
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Latest</div>
                                    <div className="text-sm font-bold text-white font-mono group-hover:text-violet-300 transition-colors">
                                        {backups.length > 0 ? new Date(backups[0].date).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {backups.length > 0 && (
                            <div className="border-t border-white/5 pt-4">
                                <h4 className="font-bold text-white uppercase tracking-wide mb-4 text-xs flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-violet-400" />
                                    Available Snapshots
                                </h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                    <AnimatePresence>
                                        {backups.map((backup, idx) => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ delay: idx * 0.05 }}
                                                key={idx}
                                                className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                                                        <FileJson className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-mono text-xs text-white font-bold truncate group-hover:text-violet-200 transition-colors">{backup.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-2">
                                                            <span>{new Date(backup.date).toLocaleString()}</span>
                                                            <span className="w-1 h-1 rounded-full bg-white/20" />
                                                            <span>{(backup.size / 1024).toFixed(1)} KB</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleRestore(backup.path)}
                                                        className="px-3 py-1.5 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors text-[10px] font-bold uppercase tracking-wider hover:shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                                                    >
                                                        Restore
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteBackup(backup.path)}
                                                        className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors hover:shadow-[0_0_10px_rgba(239,68,68,0.2)]"
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
                <section className="space-y-5">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-white/80 uppercase tracking-widest border-b border-white/5 pb-2">
                        <Info className="w-4 h-4 text-violet-400" />
                        Application Details
                    </h3>
                    <div className="bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform duration-300">
                                    <Cpu className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Version</div>
                                    <div className="font-bold text-white font-mono text-lg">{appVersion}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 group-hover:scale-110 transition-transform duration-300">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Build Date</div>
                                    <div className="font-bold text-white font-mono text-lg">{buildDate}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
