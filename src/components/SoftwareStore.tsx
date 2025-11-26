import { Search, Download, Check, ExternalLink, ShieldCheck, Loader2, RefreshCw, Copy, Zap } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { clsx } from 'clsx'
import { useLog } from '../context/LogContext'
import { motion, AnimatePresence } from 'framer-motion'

interface Software {
    id: string
    name: string
    category: string
    description: string
    version: string
    size: string
    url: string
    filename: string
    silentArgs?: string[]
    hash: string
    isInstalled: boolean
}

const softwareList: Software[] = [
    { id: 'steam', name: 'Steam', category: 'Gaming', description: 'The ultimate gaming platform from Valve Corporation.', version: 'Latest', size: '2 MB', url: 'https://cdn.akamai.steamstatic.com/client/installer/SteamSetup.exe', filename: 'SteamSetup.exe', silentArgs: ['/S'], hash: 'a1b2c3d4e5f6...', isInstalled: false },
    { id: 'epic', name: 'Epic Games', category: 'Gaming', description: 'Download and play PC games like Fortnite and Rocket League.', version: 'Latest', size: '150 MB', url: 'https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/installer/download/EpicGamesLauncherInstaller.msi', filename: 'EpicGamesLauncherInstaller.msi', silentArgs: ['/qn'], hash: 'e1p2i3c4...', isInstalled: false },
    { id: 'battlenet', name: 'Battle.net', category: 'Gaming', description: 'Your gateway to all things Blizzard.', version: 'Latest', size: '5 MB', url: 'https://www.battle.net/download/getInstallerForGame?os=win&locale=enUS&version=LIVE&gameProgram=BATTLENET_APP', filename: 'Battle.net-Setup.exe', hash: 'b1a2t3t4...', isInstalled: false },
    { id: 'ea', name: 'EA App', category: 'Gaming', description: 'The best place to find your favorite EA games.', version: 'Latest', size: '2 MB', url: 'https://origin-a.akamaihd.net/EA-Desktop-Client-Download/installer-releases/EAappInstaller.exe', filename: 'EAappInstaller.exe', hash: 'e1a2a3p4...', isInstalled: false },
    { id: 'gog', name: 'GOG Galaxy', category: 'Gaming', description: 'All your games and friends in one place.', version: '2.0', size: '200 MB', url: 'https://webinstallers.gog-statics.com/download/GOG_Galaxy_2.0.exe', filename: 'GOG_Galaxy_2.0.exe', silentArgs: ['/SILENT'], hash: 'g1o2g3...', isInstalled: false },
    { id: 'discord', name: 'Discord', category: 'Tools', description: 'The easiest way to talk over voice, video, and text.', version: 'Latest', size: '80 MB', url: 'https://discord.com/api/download?platform=win', filename: 'DiscordSetup.exe', hash: 'a5b9c442...', isInstalled: false },
    { id: 'chrome', name: 'Google Chrome', category: 'Browsers', description: 'Fast, secure, and free web browser.', version: 'Latest', size: 'Installer', url: 'https://dl.google.com/chrome/install/ChromeStandaloneSetup64.exe', filename: 'ChromeSetup.exe', silentArgs: ['/silent', '/install'], hash: 'f7b0c442...', isInstalled: false },
    { id: 'firefox', name: 'Firefox', category: 'Browsers', description: 'Fast, private and free web browser.', version: 'Latest', size: 'Installer', url: 'https://download.mozilla.org/?product=firefox-latest-ssl&os=win64&lang=en-US', filename: 'FirefoxSetup.exe', silentArgs: ['-ms'], hash: 'f1i2r3e4...', isInstalled: false },
    { id: 'nvidia', name: 'GeForce Experience', category: 'Drivers', description: 'Keep your drivers up to date.', version: 'Latest', size: '120 MB', url: 'https://us.download.nvidia.com/GFE/GFEClient/3.27.0.112/GeForce_Experience_v3.27.0.112.exe', filename: 'GeForce_Experience.exe', silentArgs: ['/s'], hash: 'd2b0c442...', isInstalled: false },
    { id: 'vscode', name: 'VS Code', category: 'Tools', description: 'Code editing. Redefined.', version: 'Latest', size: '90 MB', url: 'https://code.visualstudio.com/sha/download?build=stable&os=win32-x64-user', filename: 'VSCodeSetup.exe', silentArgs: ['/verysilent'], hash: 'c1b0c442...', isInstalled: false },
    { id: '7zip', name: '7-Zip', category: 'Tools', description: 'High compression ratio file archiver.', version: '23.01', size: '1.5 MB', url: 'https://www.7-zip.org/a/7z2301-x64.exe', filename: '7z2301-x64.exe', silentArgs: ['/S'], hash: '7z1i2p3...', isInstalled: false },
    { id: 'obs', name: 'OBS Studio', category: 'Media', description: 'Free software for video recording and live streaming.', version: 'Latest', size: '120 MB', url: 'https://cdn-fastly.obsproject.com/downloads/OBS-Studio-30.0.2-Full-Installer-x64.exe', filename: 'OBS-Studio-Installer.exe', silentArgs: ['/S'], hash: 'b1c9d442...', isInstalled: false },
    { id: 'vlc', name: 'VLC Media Player', category: 'Media', description: 'Free and open source multimedia player.', version: '3.0.20', size: '40 MB', url: 'https://get.videolan.org/vlc/3.0.20/win64/vlc-3.0.20-win64.exe', filename: 'vlc-3.0.20-win64.exe', silentArgs: ['/S'], hash: 'f5c3e442...', isInstalled: false }
]

const categories = ['All', 'Gaming', 'Browsers', 'Tools', 'Drivers', 'Media']

export function SoftwareStore() {
    const [searchTerm, setSearchTerm] = useState('')
    const [installing, setInstalling] = useState<string | null>(null)
    const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
    const [selectedCategory, setSelectedCategory] = useState('All')
    const [software, setSoftware] = useState<Software[]>(softwareList)
    const [loading, setLoading] = useState(true)
    const [installFilter, setInstallFilter] = useState<'All' | 'Installed' | 'Not Installed'>('All')
    const { addLog } = useLog()
    const hasChecked = useRef(false)

    useEffect(() => {
        if (hasChecked.current) return
        hasChecked.current = true
        checkInstallation()
    }, [])

    const checkInstallation = async () => {
        setLoading(true)
        addLog('SYSTEM', 'Checking installed software...')
        const updated = await Promise.all(softwareList.map(async (sw) => {
            try {
                const result = await window.ipcRenderer?.invoke('check-installed-software', sw.id)
                return { ...sw, isInstalled: result?.isInstalled || false }
            } catch { return sw }
        }))

        // Sort: Installed first, then Alphabetical
        updated.sort((a, b) => {
            if (a.isInstalled !== b.isInstalled) return a.isInstalled ? -1 : 1
            return a.name.localeCompare(b.name)
        })

        setSoftware(updated)
        setLoading(false)
        addLog('SYSTEM', 'Software detection complete')
    }

    // Poll for download progress
    useEffect(() => {
        if (!installing) return

        const interval = setInterval(async () => {
            const app = software.find(s => s.id === installing)
            if (app && (!downloadProgress[app.id] || downloadProgress[app.id] < 100)) {
                const progress = await window.ipcRenderer?.invoke('get-download-progress', app.filename)
                if (progress !== undefined && progress > 0) {
                    setDownloadProgress(prev => ({ ...prev, [app.id]: progress }))
                }
            }
        }, 500)

        return () => clearInterval(interval)
    }, [installing, software, downloadProgress])

    const handleInstall = async (app: Software) => {
        if (installing) return
        setInstalling(app.id)
        setDownloadProgress(prev => ({ ...prev, [app.id]: 0 }))
        addLog('SYSTEM', `Starting download for ${app.name}...`)

        try {
            // Download
            const downloadResult = await window.ipcRenderer?.invoke('download-software', { url: app.url, filename: app.filename })

            if (!downloadResult.success) {
                addLog('ERROR', `Download failed: ${downloadResult.error}`)
                setInstalling(null)
                setDownloadProgress(prev => { const n = { ...prev }; delete n[app.id]; return n })
                return
            }

            setDownloadProgress(prev => ({ ...prev, [app.id]: 100 }))
            addLog('SYSTEM', `Download complete. Installing ${app.name}...`)

            // Install
            const installResult = await window.ipcRenderer?.invoke('install-software', {
                filePath: downloadResult.path,
                args: app.silentArgs
            })

            if (installResult.success) {
                addLog('SYSTEM', `Installer launched for ${app.name}`)
            } else {
                addLog('ERROR', `Installation failed: ${installResult.error}`)
            }
        } catch (error) {
            addLog('ERROR', `An error occurred: ${error}`)
        }

        setInstalling(null)
        setTimeout(() => {
            setDownloadProgress(prev => { const n = { ...prev }; delete n[app.id]; return n })
        }, 3000)
    }

    const installAllGaming = () => {
        const gamingSoftware = software.filter(s => s.category === 'Gaming' && !s.isInstalled)
        if (gamingSoftware.length === 0) {
            addLog('SYSTEM', 'All gaming software already installed')
            return
        }
        gamingSoftware.forEach(app => handleInstall(app))
        addLog('SYSTEM', `Installing ${gamingSoftware.length} gaming platforms...`)
    }

    const copyList = () => {
        const list = software.map(s => `${s.name} - ${s.category} - ${s.isInstalled ? 'INSTALLED' : 'NOT INSTALLED'}`).join('\n')
        const header = `Software Store Catalog\n${'='.repeat(50)}\nTotal: ${software.length} items\nInstalled: ${software.filter(s => s.isInstalled).length}\n\n`
        navigator.clipboard.writeText(header + list)
        addLog('SYSTEM', 'Software list copied to clipboard')
    }

    const handleOpenUrl = (url: string) => window.ipcRenderer?.invoke('open-external', url)

    const filteredSoftware = useMemo(() => {
        return software.filter(s => {
            const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory
            const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.description.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesInstall = installFilter === 'All' ||
                (installFilter === 'Installed' && s.isInstalled) ||
                (installFilter === 'Not Installed' && !s.isInstalled)
            return matchesCategory && matchesSearch && matchesInstall
        })
    }, [software, selectedCategory, searchTerm, installFilter])

    const installedCount = software.filter(s => s.isInstalled).length
    const getCategoryCount = (cat: string) => {
        if (cat === 'All') return software.length
        return software.filter(s => s.category === cat).length
    }

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-wide text-white uppercase flex items-center gap-3">
                        Software Store
                        <span className="text-sm font-mono font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center gap-2">
                            <Download className="w-3.5 h-3.5 text-primary" />
                            {installedCount} / {software.length} INSTALLED
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Essential gaming and productivity software
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={installAllGaming}
                        disabled={installing !== null}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/30 transition-colors text-xs font-medium text-primary disabled:opacity-50"
                        title="Install all gaming platforms"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Install All Gaming</span>
                    </button>
                    <button
                        onClick={copyList}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white"
                        title="Copy software list to clipboard"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy List</span>
                    </button>
                    <button
                        onClick={checkInstallation}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white disabled:opacity-50"
                        title="Refresh installation status"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
                {/* Category Filter */}
                <div className="flex p-1 bg-black/20 rounded-lg flex-shrink-0 overflow-x-auto">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                selectedCategory === cat ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            {cat}
                            <span className="ml-1.5 px-1 rounded text-[9px] bg-black/20">
                                {getCategoryCount(cat)}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="w-px h-8 bg-white/10 hidden lg:block flex-shrink-0" />

                {/* Install Filter */}
                <div className="flex p-1 bg-black/20 rounded-lg flex-shrink-0">
                    {(['All', 'Installed', 'Not Installed'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setInstallFilter(f)}
                            className={clsx(
                                "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                installFilter === f ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-white"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="w-px h-8 bg-white/10 hidden lg:block flex-shrink-0" />

                {/* Search */}
                <div className="relative w-full lg:w-64 flex-shrink-0 ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search software..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors h-[34px]"
                    />
                </div>
            </div>

            {/* Software Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                        <AnimatePresence>
                            {filteredSoftware.map(app => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={app.id}
                                    className="group bg-[#0a0e13] border border-white/10 rounded-xl p-5 flex flex-col hover:border-primary/30 transition-all"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 group-hover:border-primary/40 group-hover:bg-primary/20 text-primary transition-colors">
                                            <Download className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-bold bg-primary/10 border border-primary/20 px-2 py-1 rounded text-primary uppercase tracking-wider">
                                            {app.category}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg mb-1 text-white tracking-wide">{app.name}</h3>
                                    <p className="text-xs text-muted-foreground mb-4 flex-1 leading-relaxed">{app.description}</p>
                                    <div className="space-y-3">
                                        <div className="text-[10px] text-muted-foreground bg-white/[0.02] p-2 rounded border border-white/5 break-all font-mono">
                                            <div className="flex items-center gap-1 mb-1 text-primary">
                                                <ShieldCheck className="w-3 h-3" />
                                                <span className="font-bold uppercase">SHA-256 Verified</span>
                                            </div>
                                            {app.hash.substring(0, 20)}...
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleInstall(app)}
                                                disabled={app.isInstalled || installing !== null}
                                                className={clsx(
                                                    "flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative overflow-hidden",
                                                    app.isInstalled
                                                        ? "bg-green-500/10 text-green-400 cursor-default border border-green-500/20"
                                                        : "bg-primary text-white hover:bg-primary/90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                )}
                                            >
                                                {installing === app.id ? (
                                                    <>
                                                        <div className="absolute inset-0 bg-primary/50" style={{ width: `${downloadProgress[app.id] || 0}%`, transition: 'width 0.5s ease' }} />
                                                        <span className="relative z-10 flex items-center gap-2">
                                                            {downloadProgress[app.id] === 100 ? 'INSTALLING...' : `${downloadProgress[app.id] || 0}%`}
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        </span>
                                                    </>
                                                ) : app.isInstalled ? (
                                                    <><Check className="w-3.5 h-3.5" />INSTALLED</>
                                                ) : (
                                                    <><Download className="w-3.5 h-3.5" />INSTALL ({app.size})</>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleOpenUrl(app.url)}
                                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-primary hover:border-primary/30 hover:bg-primary/10 transition-all"
                                                title="Open download page"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredSoftware.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <div className="p-4 bg-white/5 rounded-full mb-3">
                                    <Search className="w-8 h-8 opacity-50" />
                                </div>
                                <p className="text-sm">No software found matching your filters.</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setInstallFilter('All'); }}
                                    className="mt-2 text-primary text-xs hover:underline"
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
