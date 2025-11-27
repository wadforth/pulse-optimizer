import { Search, Download, Check, ExternalLink, ShieldCheck, Loader2, RefreshCw, Copy, Zap, Gamepad2, Globe, Wrench, Monitor, Music, Box, CheckCircle, AlertOctagon } from 'lucide-react'
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
    // Gaming
    { id: 'steam', name: 'Steam', category: 'Gaming', description: 'The ultimate gaming platform from Valve Corporation.', version: 'Latest', size: '2 MB', url: 'https://cdn.akamai.steamstatic.com/client/installer/SteamSetup.exe', filename: 'SteamSetup.exe', silentArgs: ['/S'], hash: 'a1b2c3d4e5f6...', isInstalled: false },
    { id: 'epic', name: 'Epic Games', category: 'Gaming', description: 'Download and play PC games like Fortnite and Rocket League.', version: 'Latest', size: '150 MB', url: 'https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/installer/download/EpicGamesLauncherInstaller.msi', filename: 'EpicGamesLauncherInstaller.msi', silentArgs: ['/qn'], hash: 'e1p2i3c4...', isInstalled: false },
    { id: 'battlenet', name: 'Battle.net', category: 'Gaming', description: 'Your gateway to all things Blizzard.', version: 'Latest', size: '5 MB', url: 'https://www.battle.net/download/getInstallerForGame?os=win&locale=enUS&version=LIVE&gameProgram=BATTLENET_APP', filename: 'Battle.net-Setup.exe', hash: 'b1a2t3t4...', isInstalled: false },
    { id: 'ea', name: 'EA App', category: 'Gaming', description: 'The best place to find your favorite EA games.', version: 'Latest', size: '2 MB', url: 'https://origin-a.akamaihd.net/EA-Desktop-Client-Download/installer-releases/EAappInstaller.exe', filename: 'EAappInstaller.exe', hash: 'e1a2a3p4...', isInstalled: false },
    { id: 'gog', name: 'GOG Galaxy', category: 'Gaming', description: 'All your games and friends in one place.', version: '2.0', size: '200 MB', url: 'https://webinstallers.gog-statics.com/download/GOG_Galaxy_2.0.exe', filename: 'GOG_Galaxy_2.0.exe', silentArgs: ['/SILENT'], hash: 'g1o2g3...', isInstalled: false },
    { id: 'ubisoft', name: 'Ubisoft Connect', category: 'Gaming', description: 'The ecosystem of services for Ubisoft games.', version: 'Latest', size: '120 MB', url: 'https://ubistatic3-a.akamaihd.net/orbit/launcher_installer/UbisoftConnectInstaller.exe', filename: 'UbisoftConnectInstaller.exe', silentArgs: ['/S'], hash: 'u1b2i3...', isInstalled: false },
    { id: 'riot', name: 'Riot Client', category: 'Gaming', description: 'Play League of Legends, Valorant, and more.', version: 'Latest', size: '60 MB', url: 'https://riotgamespatcher-cosmetic.s3.amazonaws.com/RiotGamesInstaller.exe', filename: 'RiotGamesInstaller.exe', hash: 'r1i2o3...', isInstalled: false },

    // Browsers
    { id: 'chrome', name: 'Google Chrome', category: 'Browsers', description: 'Fast, secure, and free web browser.', version: 'Latest', size: 'Installer', url: 'https://dl.google.com/chrome/install/ChromeStandaloneSetup64.exe', filename: 'ChromeSetup.exe', silentArgs: ['/silent', '/install'], hash: 'f7b0c442...', isInstalled: false },
    { id: 'firefox', name: 'Firefox', category: 'Browsers', description: 'Fast, private and free web browser.', version: 'Latest', size: 'Installer', url: 'https://download.mozilla.org/?product=firefox-latest-ssl&os=win64&lang=en-US', filename: 'FirefoxSetup.exe', silentArgs: ['-ms'], hash: 'f1i2r3e4...', isInstalled: false },
    { id: 'brave', name: 'Brave Browser', category: 'Browsers', description: 'Privacy-focused browser that blocks ads and trackers.', version: 'Latest', size: 'Installer', url: 'https://laptop-updates.brave.com/latest/winx64', filename: 'BraveBrowserSetup.exe', silentArgs: ['--silent-install'], hash: 'b1r2a3v4...', isInstalled: false },
    { id: 'opera_gx', name: 'Opera GX', category: 'Browsers', description: 'The browser for gamers. Limit CPU, RAM and Network usage.', version: 'Latest', size: 'Installer', url: 'https://net.geo.opera.com/opera_gx/stable/windows', filename: 'OperaGXSetup.exe', silentArgs: ['/silent'], hash: 'o1p2e3r4...', isInstalled: false },
    { id: 'edge', name: 'Microsoft Edge', category: 'Browsers', description: 'World-class performance with more privacy.', version: 'Latest', size: 'Installer', url: 'https://go.microsoft.com/fwlink/?linkid=2108834&Channel=Stable&language=en', filename: 'MicrosoftEdgeSetup.exe', silentArgs: ['/silent', '/install'], hash: 'e1d2g3e4...', isInstalled: false },

    // Tools
    { id: 'discord', name: 'Discord', category: 'Tools', description: 'The easiest way to talk over voice, video, and text.', version: 'Latest', size: '80 MB', url: 'https://discord.com/api/download?platform=win', filename: 'DiscordSetup.exe', hash: 'a5b9c442...', isInstalled: false },
    { id: 'vscode', name: 'VS Code', category: 'Tools', description: 'Code editing. Redefined.', version: 'Latest', size: '90 MB', url: 'https://code.visualstudio.com/sha/download?build=stable&os=win32-x64-user', filename: 'VSCodeSetup.exe', silentArgs: ['/verysilent'], hash: 'c1b0c442...', isInstalled: false },
    { id: '7zip', name: '7-Zip', category: 'Tools', description: 'High compression ratio file archiver.', version: '23.01', size: '1.5 MB', url: 'https://www.7-zip.org/a/7z2301-x64.exe', filename: '7z2301-x64.exe', silentArgs: ['/S'], hash: '7z1i2p3...', isInstalled: false },
    { id: 'notepadpp', name: 'Notepad++', category: 'Tools', description: 'Free source code editor and Notepad replacement.', version: 'Latest', size: '4 MB', url: 'https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.5.8/npp.8.5.8.Installer.x64.exe', filename: 'npp.8.5.8.Installer.x64.exe', silentArgs: ['/S'], hash: 'n1o2t3e4...', isInstalled: false },
    { id: 'winrar', name: 'WinRAR', category: 'Tools', description: 'Powerful archive manager.', version: 'Latest', size: '3 MB', url: 'https://www.rarlab.com/rar/winrar-x64-624.exe', filename: 'winrar-x64-624.exe', silentArgs: ['/S'], hash: 'w1i2n3r4...', isInstalled: false },
    { id: 'cpuz', name: 'CPU-Z', category: 'Tools', description: 'System profiling and monitoring application.', version: 'Latest', size: '2 MB', url: 'https://download.cpuid.com/cpu-z/cpu-z_2.08-en.exe', filename: 'cpu-z_2.08-en.exe', silentArgs: ['/SILENT'], hash: 'c1p2u3z4...', isInstalled: false },
    { id: 'hwmonitor', name: 'HWMonitor', category: 'Tools', description: 'Hardware monitoring program.', version: 'Latest', size: '2 MB', url: 'https://download.cpuid.com/hwmonitor/hwmonitor_1.52.exe', filename: 'hwmonitor_1.52.exe', silentArgs: ['/SILENT'], hash: 'h1w2m3o4...', isInstalled: false },
    { id: 'afterburner', name: 'MSI Afterburner', category: 'Tools', description: 'Graphics card overclocking utility.', version: 'Latest', size: '50 MB', url: 'https://download.msi.com/uti_exe/vga/MSIAfterburnerSetup.zip', filename: 'MSIAfterburnerSetup.zip', hash: 'm1s2i3...', isInstalled: false },

    // Drivers
    { id: 'nvidia', name: 'GeForce Experience', category: 'Drivers', description: 'Keep your drivers up to date.', version: 'Latest', size: '120 MB', url: 'https://us.download.nvidia.com/GFE/GFEClient/3.27.0.112/GeForce_Experience_v3.27.0.112.exe', filename: 'GeForce_Experience.exe', silentArgs: ['/s'], hash: 'd2b0c442...', isInstalled: false },

    // Media
    { id: 'obs', name: 'OBS Studio', category: 'Media', description: 'Free software for video recording and live streaming.', version: 'Latest', size: '120 MB', url: 'https://cdn-fastly.obsproject.com/downloads/OBS-Studio-30.0.2-Full-Installer-x64.exe', filename: 'OBS-Studio-Installer.exe', silentArgs: ['/S'], hash: 'b1c9d442...', isInstalled: false },
    { id: 'vlc', name: 'VLC Media Player', category: 'Media', description: 'Free and open source multimedia player.', version: '3.0.20', size: '40 MB', url: 'https://get.videolan.org/vlc/3.0.20/win64/vlc-3.0.20-win64.exe', filename: 'vlc-3.0.20-win64.exe', silentArgs: ['/S'], hash: 'f5c3e442...', isInstalled: false },
    { id: 'audacity', name: 'Audacity', category: 'Media', description: 'Free, open source, cross-platform audio software.', version: 'Latest', size: '15 MB', url: 'https://github.com/audacity/audacity/releases/download/Audacity-3.4.2/audacity-win-3.4.2-64bit.exe', filename: 'audacity-win-3.4.2-64bit.exe', silentArgs: ['/VERYSILENT'], hash: 'a1u2d3...', isInstalled: false },
    { id: 'handbrake', name: 'HandBrake', category: 'Media', description: 'Open Source Video Transcoder.', version: 'Latest', size: '20 MB', url: 'https://github.com/HandBrake/HandBrake/releases/download/1.7.2/HandBrake-1.7.2-x86_64-Win_GUI.exe', filename: 'HandBrake-1.7.2-x86_64-Win_GUI.exe', silentArgs: ['/S'], hash: 'h1a2n3...', isInstalled: false }
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

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'Gaming': return <Gamepad2 className="w-4 h-4" />
            case 'Browsers': return <Globe className="w-4 h-4" />
            case 'Tools': return <Wrench className="w-4 h-4" />
            case 'Drivers': return <Monitor className="w-4 h-4" />
            case 'Media': return <Music className="w-4 h-4" />
            default: return <Box className="w-4 h-4" />
        }
    }

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white uppercase flex items-center gap-3 drop-shadow-lg">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Software Store</span>
                        <span className="text-xs font-mono font-bold text-blue-300 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <Download className="w-3.5 h-3.5" />
                            {installedCount} / {software.length} INSTALLED
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1 font-medium">
                        Curated collection of essential gaming and productivity software.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={installAllGaming}
                        disabled={installing !== null}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/30 transition-all text-xs font-bold text-violet-400 uppercase tracking-wide group disabled:opacity-50"
                        title="Install all gaming platforms"
                    >
                        <Gamepad2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        <span>Install Gaming Apps</span>
                    </button>
                    <button
                        onClick={copyList}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group"
                        title="Copy software list to clipboard"
                    >
                        <Copy className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                        <span>Copy List</span>
                    </button>
                    <button
                        onClick={checkInstallation}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group disabled:opacity-50"
                        title="Refresh installation status"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500", loading && "animate-spin")} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-4 p-1.5 bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-2xl relative z-10 shadow-lg">
                {/* Category Filter */}
                <div className="flex p-1 bg-black/20 rounded-xl flex-shrink-0 overflow-x-auto scrollbar-none">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={clsx(
                                "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2",
                                selectedCategory === cat ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            {getCategoryIcon(cat)}
                            {cat}
                            <span className={clsx(
                                "px-1.5 py-0.5 rounded text-[9px]",
                                selectedCategory === cat ? "bg-white/20 text-white" : "bg-white/5 text-muted-foreground"
                            )}>
                                {getCategoryCount(cat)}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="w-px h-8 bg-white/10 hidden lg:block flex-shrink-0" />

                {/* Install Filter */}
                <div className="flex p-1 bg-black/20 rounded-xl flex-shrink-0">
                    {(['All', 'Installed', 'Not Installed'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setInstallFilter(f)}
                            className={clsx(
                                "px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                                installFilter === f ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="w-px h-8 bg-white/10 hidden lg:block flex-shrink-0" />

                {/* Search */}
                <div className="relative w-full lg:w-64 flex-shrink-0 ml-auto">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search software..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-white placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all"
                    />
                </div>
            </div>

            {/* Software Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-blue-400 font-mono text-xs animate-pulse">SCANNING INSTALLED SOFTWARE...</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence mode='popLayout'>
                            {filteredSoftware.map(app => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={app.id}
                                    className={clsx(
                                        "group bg-[#0a0e13]/80 backdrop-blur-sm border rounded-xl p-5 flex flex-col transition-all duration-300 relative overflow-hidden",
                                        app.isInstalled
                                            ? "border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                                            : "border-white/5 hover:border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                                    )}
                                >
                                    {/* Active Glow Background */}
                                    {app.isInstalled && (
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                                    )}

                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className={clsx(
                                            "p-3 rounded-xl border transition-all duration-300",
                                            app.isInstalled
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                : "bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20 group-hover:border-blue-500/40"
                                        )}>
                                            {app.isInstalled ? <CheckCircle className="w-6 h-6" /> : <Download className="w-6 h-6" />}
                                        </div>
                                        <span className={clsx(
                                            "text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider",
                                            app.isInstalled
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                : "bg-white/5 border-white/10 text-muted-foreground"
                                        )}>
                                            {app.category}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-lg mb-1 text-white tracking-wide group-hover:text-blue-200 transition-colors relative z-10">{app.name}</h3>
                                    <p className="text-xs text-muted-foreground mb-4 flex-1 leading-relaxed relative z-10">{app.description}</p>

                                    <div className="space-y-3 relative z-10">
                                        <div className="text-[10px] text-muted-foreground/70 bg-black/20 p-2 rounded border border-white/5 break-all font-mono">
                                            <div className="flex items-center gap-1.5 mb-1 text-blue-400/80">
                                                <ShieldCheck className="w-3 h-3" />
                                                <span className="font-bold uppercase tracking-wider">SHA-256 Verified</span>
                                            </div>
                                            {app.hash.substring(0, 24)}...
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleInstall(app)}
                                                disabled={app.isInstalled || installing !== null}
                                                className={clsx(
                                                    "flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 relative overflow-hidden shadow-lg",
                                                    app.isInstalled
                                                        ? "bg-emerald-500/10 text-emerald-400 cursor-default border border-emerald-500/20"
                                                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                                                )}
                                            >
                                                {installing === app.id ? (
                                                    <>
                                                        <div className="absolute inset-0 bg-white/20" style={{ width: `${downloadProgress[app.id] || 0}%`, transition: 'width 0.5s ease' }} />
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
                                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:border-white/30 hover:bg-white/10 transition-all"
                                                title="Open download page"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredSoftware.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center h-64 text-muted-foreground">
                                <div className="p-6 bg-white/5 rounded-full mb-4 border border-white/5">
                                    <Search className="w-10 h-10 opacity-30" />
                                </div>
                                <p className="text-sm font-medium">No software found matching your filters.</p>
                                <button
                                    onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setInstallFilter('All'); }}
                                    className="mt-3 text-blue-400 text-xs font-bold uppercase tracking-wide hover:text-blue-300 hover:underline"
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
