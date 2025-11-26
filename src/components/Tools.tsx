import { Shield, Globe, Lock, RefreshCw, Check, FileText, AlertTriangle, Download, Save, RotateCcw, Activity, Search, Copy, Zap, BarChart3 } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { clsx } from 'clsx'
import { useLog } from '../context/LogContext'
import { motion, AnimatePresence } from 'framer-motion'

interface DNSProvider {
    id: string
    name: string
    primary: string
    secondary: string
    description: string
    pros: string[]
    cons: string[]
    category: 'Fast' | 'Secure' | 'Ad-blocking'
}

const dnsProviders: DNSProvider[] = [
    {
        id: 'google',
        name: 'Google Public DNS',
        primary: '8.8.8.8',
        secondary: '8.8.4.4',
        description: 'The most popular public DNS service. Fast and reliable.',
        pros: ['Very fast global response times', 'Highly reliable', 'Supports DNS-over-HTTPS'],
        cons: ['Collects some usage data (privacy concern)', 'No built-in ad blocking'],
        category: 'Fast'
    },
    {
        id: 'cloudflare',
        name: 'Cloudflare DNS',
        primary: '1.1.1.1',
        secondary: '1.0.0.1',
        description: 'Focused on privacy and speed. Claims not to log IP addresses.',
        pros: ['Extremely fast (often fastest)', 'Strong privacy focus', 'No logging'],
        cons: ['Can be aggressive with caching', 'No content filtering (standard version)'],
        category: 'Fast'
    },
    {
        id: 'quad9',
        name: 'Quad9',
        primary: '9.9.9.9',
        secondary: '149.112.112.112',
        description: 'Security-focused DNS that blocks malicious domains.',
        pros: ['Blocks malware/phishing domains', 'Good privacy policy', 'Global anycast network'],
        cons: ['Slightly slower than Cloudflare/Google', 'Can block legitimate sites (false positives)'],
        category: 'Secure'
    },
    {
        id: 'adguard',
        name: 'AdGuard DNS',
        primary: '94.140.14.14',
        secondary: '94.140.15.15',
        description: 'Blocks ads and trackers at the DNS level.',
        pros: ['Blocks ads system-wide', 'Blocks trackers', 'Family protection options'],
        cons: ['Can break some websites/apps', 'Slower than non-filtering DNS'],
        category: 'Ad-blocking'
    }
]

const blocklists = [
    { name: 'StevenBlack Unified (Adware + Malware)', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts' },
    { name: 'StevenBlack Gambling', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling/hosts' },
    { name: 'StevenBlack Porn', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn/hosts' }
]

export function Tools() {
    const [activeDNS, setActiveDNS] = useState<string>('')
    const [currentDNS, setCurrentDNS] = useState<{ primary: string, secondary: string, interface?: string } | null>(null)
    const [applying, setApplying] = useState(false)
    const [customPrimary, setCustomPrimary] = useState('')
    const [customSecondary, setCustomSecondary] = useState('')
    const [hostsContent, setHostsContent] = useState('')
    const [loadingHosts, setLoadingHosts] = useState(false)
    const [savingHosts, setSavingHosts] = useState(false)
    const [speedTest, setSpeedTest] = useState<{ ping: number, jitter: number, download: number } | null>(null)
    const [testingSpeed, setTestingSpeed] = useState(false)
    const [dnsSearch, setDnsSearch] = useState('')
    const [dnsFilter, setDnsFilter] = useState<'All' | 'Fast' | 'Secure' | 'Ad-blocking'>('All')
    const [showComparison, setShowComparison] = useState(false)
    const { addLog } = useLog()

    useEffect(() => {
        fetchDNS()
        fetchHosts()
    }, [])

    useEffect(() => {
        const handler = (_event: any, message: string) => {
            addLog('NETWORK', message)
        }

        window.ipcRenderer?.on('speed-test-progress', handler)

        return () => {
            window.ipcRenderer?.off('speed-test-progress', handler)
        }
    }, [])

    const fetchDNS = async () => {
        try {
            const result = await window.ipcRenderer?.invoke('get-dns-settings')
            if (result?.success) {
                setCurrentDNS(result.dns)
                const match = dnsProviders.find(p => p.primary === result.dns.primary)
                if (match) setActiveDNS(match.id)
                else if (result.dns.primary) setActiveDNS('custom')
                else setActiveDNS('dhcp')
            }
        } catch (e) {
            console.error(e)
        }
    }

    const fetchHosts = async () => {
        setLoadingHosts(true)
        try {
            const result = await window.ipcRenderer?.invoke('get-hosts-content')
            if (result?.success) {
                setHostsContent(result.content)
            }
        } catch (e) {
            addLog('ERROR', 'Failed to read hosts file')
        } finally {
            setLoadingHosts(false)
        }
    }

    const handleApplyDNS = async (id: string, primary: string, secondary: string) => {
        setApplying(true)
        addLog('NETWORK', `Applying DNS provider: ${id}...`)

        const result = await window.ipcRenderer?.invoke('set-dns-settings', { primary, secondary })

        if (result?.success) {
            addLog('NETWORK', `DNS changed successfully`)
            await fetchDNS()
        } else {
            addLog('ERROR', `Failed to set DNS: ${result?.error || 'Unknown error'}`)
            if (result?.error?.includes('RunAs')) {
                addLog('SYSTEM', 'Please restart app as Administrator to change DNS.')
            }
        }
        setApplying(false)
    }

    const handleResetDNS = async () => {
        setApplying(true)
        addLog('NETWORK', `Resetting DNS to Default (DHCP)...`)

        const result = await window.ipcRenderer?.invoke('set-dns-settings', { primary: 'dhcp' })

        if (result?.success) {
            addLog('NETWORK', `DNS reset successfully`)
            await fetchDNS()
        } else {
            addLog('ERROR', `Failed to reset DNS: ${result?.error}`)
        }
        setApplying(false)
    }

    const handleApplyCustomDNS = () => {
        if (!customPrimary) return
        handleApplyDNS('custom', customPrimary, customSecondary)
    }

    const handleSaveHosts = async () => {
        setSavingHosts(true)
        addLog('SYSTEM', 'Saving hosts file...')

        const result = await window.ipcRenderer?.invoke('write-hosts-content', hostsContent)

        if (result?.success) {
            addLog('SYSTEM', 'Hosts file saved successfully')
        } else {
            addLog('ERROR', `Failed to save hosts file: ${result?.error}`)
            addLog('SYSTEM', 'Try restarting as Administrator.')
        }
        setSavingHosts(false)
    }

    const handleAddBlocklist = async (url: string, name: string) => {
        addLog('NETWORK', `Downloading blocklist: ${name}...`)
        const result = await window.ipcRenderer?.invoke('fetch-blocklist', url)

        if (result?.success) {
            const newContent = result.content
            const header = `\n\n# Added by Pulse - ${name}\n`
            setHostsContent(prev => prev + header + newContent)
            addLog('SYSTEM', `Blocklist added to editor. Click Save to apply.`)
        } else {
            addLog('ERROR', `Failed to download blocklist: ${result?.error}`)
        }
    }

    const handleRestartAdmin = () => {
        addLog('SYSTEM', 'Requesting restart as Administrator...')
        window.ipcRenderer?.invoke('restart-as-admin')
    }

    const handleRunSpeedTest = async () => {
        setTestingSpeed(true)
        setSpeedTest(null)
        addLog('NETWORK', 'Running network speed test (Ping & Download)...')
        addLog('WARNING', 'Internet may be slow during the test.')

        const result = await window.ipcRenderer?.invoke('run-network-test')

        if (result?.success) {
            setSpeedTest({ ping: result.ping, jitter: result.jitter, download: result.download })
            addLog('NETWORK', `Test complete: ${result.ping}ms Ping, ${result.download} Mbps`)
        } else {
            addLog('ERROR', 'Speed test failed')
        }
        setTestingSpeed(false)
    }

    const applyBest = () => {
        const best = dnsProviders.find(p => p.id === 'cloudflare')
        if (best) {
            handleApplyDNS(best.id, best.primary, best.secondary)
            addLog('SYSTEM', 'Applying recommended DNS (Cloudflare - fastest & most private)')
        }
    }

    const copyDNSSettings = () => {
        const config = `Current DNS Configuration\nPrimary: ${currentDNS?.primary || 'DHCP'}\nSecondary: ${currentDNS?.secondary || 'DHCP'}\nInterface: ${currentDNS?.interface || 'N/A'}`
        navigator.clipboard.writeText(config)
        addLog('SYSTEM', 'DNS settings copied to clipboard')
    }

    const exportConfig = () => {
        const config = `Network Configuration\n${'='.repeat(50)}\nGenerated: ${new Date().toLocaleString()}\n\nDNS Settings:\n  Primary: ${currentDNS?.primary || 'DHCP'}\n  Secondary: ${currentDNS?.secondary || 'DHCP'}\n  Interface: ${currentDNS?.interface || 'N/A'}\n\nSpeed Test:\n  Ping: ${speedTest?.ping || 'N/A'} ms\n  Jitter: ${speedTest?.jitter || 'N/A'} ms\n  Download: ${speedTest?.download || 'N/A'} Mbps\n\nHosts File Entries: ${hostsContent.split('\n').filter(l => l.trim() && !l.startsWith('#')).length} custom entries`

        const blob = new Blob([config], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `network-config-${Date.now()}.txt`
        a.click()
        URL.revokeObjectURL(url)
        addLog('SYSTEM', 'Configuration exported successfully')
    }

    const filteredDNS = useMemo(() => {
        return dnsProviders.filter(dns => {
            const matchesSearch = dns.name.toLowerCase().includes(dnsSearch.toLowerCase()) ||
                dns.description.toLowerCase().includes(dnsSearch.toLowerCase())
            const matchesFilter = dnsFilter === 'All' || dns.category === dnsFilter
            return matchesSearch && matchesFilter
        })
    }, [dnsSearch, dnsFilter])

    return (
        <div className="h-full flex flex-col p-6 space-y-6 relative overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-wide text-white uppercase flex items-center gap-3">
                        Network Tools
                        <span className="text-sm font-mono font-normal text-muted-foreground bg-white/5 px-2 py-1 rounded border border-white/5 flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-primary" />
                            {currentDNS?.primary || 'DHCP'}
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage DNS and network configurations
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={applyBest}
                        disabled={applying}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/30 transition-colors text-xs font-medium text-primary disabled:opacity-50"
                        title="Apply recommended DNS"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Quick Apply Best</span>
                    </button>
                    <button
                        onClick={copyDNSSettings}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white"
                        title="Copy DNS settings to clipboard"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy DNS</span>
                    </button>
                    <button
                        onClick={exportConfig}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-medium text-muted-foreground hover:text-white"
                        title="Export configuration"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Config</span>
                    </button>
                </div>
            </div>

            {/* Speed Test Section */}
            <div className="bg-[#0a0e13] border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white uppercase tracking-wide">
                        <Activity className="w-5 h-5 text-primary" />
                        Network Speed Test
                    </h3>
                    <button
                        onClick={handleRunSpeedTest}
                        disabled={testingSpeed}
                        className={clsx(
                            "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-xs uppercase tracking-wider",
                            testingSpeed
                                ? "bg-white/5 text-muted-foreground cursor-not-allowed"
                                : "bg-primary text-white hover:bg-primary/90 shadow-sm"
                        )}
                    >
                        {testingSpeed ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                TESTING...
                            </>
                        ) : (
                            'START TEST'
                        )}
                    </button>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                        <span className="text-yellow-400 font-bold">Note:</span> Your internet connection may be slow or unresponsive during the download test.
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-black/20 rounded-lg p-4 border border-white/5 text-center">
                        <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-2">Ping (Latency)</div>
                        <div className={clsx(
                            "text-3xl font-bold font-mono",
                            !speedTest ? "text-white/20" :
                                speedTest.ping < 20 ? "text-green-400" :
                                    speedTest.ping < 50 ? "text-yellow-400" : "text-red-400"
                        )}>
                            {speedTest ? speedTest.ping : '--'} <span className="text-sm text-muted-foreground">ms</span>
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-lg p-4 border border-white/5 text-center">
                        <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-2">Jitter</div>
                        <div className="text-3xl font-bold font-mono text-white">
                            {speedTest ? speedTest.jitter : '--'} <span className="text-sm text-muted-foreground">ms</span>
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-lg p-4 border border-white/5 text-center">
                        <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider mb-2">Download</div>
                        <div className="text-3xl font-bold font-mono text-primary">
                            {speedTest ? speedTest.download : '--'} <span className="text-sm text-muted-foreground">Mbps</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* DNS Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-white uppercase tracking-wide">
                            <Globe className="w-5 h-5 text-primary" />
                            DNS Providers
                        </h3>
                        <button
                            onClick={() => setShowComparison(!showComparison)}
                            className="flex items-center gap-2 text-xs text-primary hover:text-primary/80"
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            {showComparison ? 'Hide' : 'Show'} Comparison
                        </button>
                    </div>

                    {/* DNS Comparison Table */}
                    <AnimatePresence>
                        {showComparison && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-[#0a0e13] border border-white/10 rounded-xl p-4 overflow-hidden"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left p-2 text-muted-foreground font-bold">Provider</th>
                                                <th className="text-left p-2 text-muted-foreground font-bold">Primary</th>
                                                <th className="text-left p-2 text-muted-foreground font-bold">Type</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dnsProviders.map(dns => (
                                                <tr key={dns.id} className="border-b border-white/5 last:border-0">
                                                    <td className="p-2 text-white font-mono">{dns.name}</td>
                                                    <td className="p-2 text-primary font-mono">{dns.primary}</td>
                                                    <td className="p-2">
                                                        <span className={clsx(
                                                            "text-[9px] px-1.5 py-0.5 rounded uppercase font-bold",
                                                            dns.category === 'Fast' ? "bg-blue-500/10 text-blue-400" :
                                                                dns.category === 'Secure' ? "bg-green-500/10 text-green-400" :
                                                                    "bg-purple-500/10 text-purple-400"
                                                        )}>
                                                            {dns.category}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Search and Filter */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search DNS providers..."
                                value={dnsSearch}
                                onChange={(e) => setDnsSearch(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors h-[34px]"
                            />
                        </div>
                        <select
                            value={dnsFilter}
                            onChange={(e) => setDnsFilter(e.target.value as any)}
                            className="bg-black/20 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors h-[34px]"
                        >
                            <option value="All">All Types</option>
                            <option value="Fast">Fast</option>
                            <option value="Secure">Secure</option>
                            <option value="Ad-blocking">Ad-blocking</option>
                        </select>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                            <span className="text-yellow-400 font-bold">Caution:</span> Changing DNS settings can affect your internet connectivity.
                            If you lose connection, click "Reset to Default".
                        </p>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <AnimatePresence>
                            {filteredDNS.map(dns => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={dns.id}
                                    className="bg-[#0a0e13] border border-white/10 rounded-xl p-4 hover:border-primary/30 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:border-primary/40 transition-colors">
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-white tracking-wide">{dns.name}</h3>
                                                <div className="flex gap-2 text-xs font-mono text-muted-foreground mt-0.5">
                                                    <span className="text-primary">{dns.primary}</span>
                                                    <span className="text-white/20">•</span>
                                                    <span className="text-primary">{dns.secondary}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleApplyDNS(dns.id, dns.primary, dns.secondary)}
                                            disabled={applying || activeDNS === dns.id}
                                            className={clsx(
                                                "px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-2 text-xs uppercase tracking-wider whitespace-nowrap",
                                                activeDNS === dns.id
                                                    ? 'bg-green-500/10 text-green-400 cursor-default border border-green-500/20'
                                                    : 'bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-muted-foreground hover:text-white'
                                            )}
                                        >
                                            {applying && activeDNS === dns.id ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : activeDNS === dns.id ? (
                                                <>
                                                    <Check className="w-3.5 h-3.5" />
                                                    ACTIVE
                                                </>
                                            ) : (
                                                'APPLY'
                                            )}
                                        </button>
                                    </div>

                                    <p className="text-muted-foreground mb-3 text-xs leading-relaxed">{dns.description}</p>

                                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                                        <div>
                                            <h4 className="font-bold text-green-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                                                <Shield className="w-3 h-3" /> Pros
                                            </h4>
                                            <ul className="space-y-1">
                                                {dns.pros.map((pro, i) => (
                                                    <li key={i} className="flex items-center gap-1.5 text-muted-foreground">
                                                        <div className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0" />
                                                        {pro}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                                                <Lock className="w-3 h-3" /> Cons
                                            </h4>
                                            <ul className="space-y-1">
                                                {dns.cons.map((con, i) => (
                                                    <li key={i} className="flex items-center gap-1.5 text-muted-foreground">
                                                        <div className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                                                        {con}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Custom DNS & Hosts */}
                <div className="space-y-6">
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-white uppercase tracking-wide">
                                <Shield className="w-5 h-5 text-primary" />
                                Custom DNS
                            </h3>
                            <button
                                onClick={handleResetDNS}
                                disabled={applying}
                                className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                            >
                                <RotateCcw className="w-3 h-3" /> Reset to Default
                            </button>
                        </div>

                        <div className="bg-[#0a0e13] border border-white/10 rounded-xl p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Primary DNS</label>
                                    <input
                                        type="text"
                                        value={customPrimary}
                                        onChange={(e) => setCustomPrimary(e.target.value)}
                                        placeholder="8.8.8.8"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-white placeholder:text-muted-foreground/30"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Secondary DNS</label>
                                    <input
                                        type="text"
                                        value={customSecondary}
                                        onChange={(e) => setCustomSecondary(e.target.value)}
                                        placeholder="8.8.4.4"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-white placeholder:text-muted-foreground/30"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleApplyCustomDNS}
                                disabled={!customPrimary || applying}
                                className={clsx(
                                    "w-full py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all",
                                    !customPrimary || applying
                                        ? "bg-white/5 text-muted-foreground cursor-not-allowed"
                                        : "bg-primary text-white hover:bg-primary/90"
                                )}
                            >
                                {applying ? 'APPLYING...' : 'APPLY CUSTOM DNS'}
                            </button>
                        </div>
                    </section>

                    {/* Hosts File Section */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-white uppercase tracking-wide">
                            <FileText className="w-5 h-5 text-primary" />
                            Hosts File Editor
                        </h3>

                        <div className="bg-[#0a0e13] border border-white/10 rounded-xl p-4 space-y-3">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Hosts File</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={fetchHosts}
                                            disabled={loadingHosts}
                                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                        >
                                            <RefreshCw className={clsx("w-3 h-3", loadingHosts && "animate-spin")} /> Reload
                                        </button>
                                        <button
                                            onClick={handleSaveHosts}
                                            disabled={savingHosts}
                                            className={clsx(
                                                "px-3 py-1 rounded text-xs flex items-center gap-1 transition-all",
                                                savingHosts
                                                    ? "bg-white/5 text-muted-foreground"
                                                    : "bg-green-600 text-white hover:bg-green-500"
                                            )}
                                        >
                                            <Save className="w-3 h-3" /> {savingHosts ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    value={hostsContent}
                                    onChange={(e) => setHostsContent(e.target.value)}
                                    className="w-full h-48 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-white resize-none"
                                    placeholder="Loading hosts file..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Download className="w-3 h-3" /> Quick Add Blocklist
                                </label>
                                <div className="space-y-1.5">
                                    {blocklists.map((list, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleAddBlocklist(list.url, list.name)}
                                            className="w-full py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-left flex items-center justify-between transition-all"
                                        >
                                            <span className="text-muted-foreground font-mono">{list.name}</span>
                                            <Download className="w-3 h-3 text-primary" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs space-y-2">
                                <p className="text-red-400 font-bold">⚠️ Administrator Rights Required</p>
                                <p className="text-muted-foreground">Modifying the hosts file requires administrator privileges.</p>
                                <button
                                    onClick={handleRestartAdmin}
                                    className="text-primary hover:text-primary/80 underline"
                                >
                                    Click here to restart as Administrator
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
