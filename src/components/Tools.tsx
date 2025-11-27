import { Shield, Globe, Lock, RefreshCw, Check, FileText, AlertTriangle, Download, Save, RotateCcw, Activity, Search, Copy, Zap, BarChart3, Wifi, Server, FileCode, Trash2, ExternalLink } from 'lucide-react'
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
        cons: ['Collects some usage data', 'No built-in ad blocking'],
        category: 'Fast'
    },
    {
        id: 'cloudflare',
        name: 'Cloudflare DNS',
        primary: '1.1.1.1',
        secondary: '1.0.0.1',
        description: 'Focused on privacy and speed. Claims not to log IP addresses.',
        pros: ['Extremely fast (often fastest)', 'Strong privacy focus', 'No logging'],
        cons: ['Can be aggressive with caching', 'No content filtering'],
        category: 'Fast'
    },
    {
        id: 'quad9',
        name: 'Quad9',
        primary: '9.9.9.9',
        secondary: '149.112.112.112',
        description: 'Security-focused DNS that blocks malicious domains.',
        pros: ['Blocks malware/phishing', 'Good privacy policy', 'Global anycast network'],
        cons: ['Slightly slower than Cloudflare', 'Can block legitimate sites'],
        category: 'Secure'
    },
    {
        id: 'adguard',
        name: 'AdGuard DNS',
        primary: '94.140.14.14',
        secondary: '94.140.15.15',
        description: 'Blocks ads and trackers at the DNS level.',
        pros: ['Blocks ads system-wide', 'Blocks trackers', 'Family protection'],
        cons: ['Can break some websites', 'Slower than non-filtering DNS'],
        category: 'Ad-blocking'
    },
    {
        id: 'opendns',
        name: 'OpenDNS Home',
        primary: '208.67.222.222',
        secondary: '208.67.220.220',
        description: 'Classic DNS with phishing protection and optional filtering.',
        pros: ['Reliable and established', 'Phishing protection', 'Customizable filtering'],
        cons: ['Requires account for customization', 'Slower than Google/Cloudflare'],
        category: 'Secure'
    },
    {
        id: 'cleanbrowsing',
        name: 'CleanBrowsing',
        primary: '185.228.168.9',
        secondary: '185.228.169.9',
        description: 'Family-safe DNS that blocks adult content.',
        pros: ['Blocks adult content', 'Blocks malicious domains', 'No tracking'],
        cons: ['Strict filtering', 'May block mixed content'],
        category: 'Secure'
    }
]

const blocklists = [
    { name: 'Unified (Adware + Malware)', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts', description: 'Standard protection against ads and malware.' },
    { name: 'Gambling', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling/hosts', description: 'Blocks online gambling sites.' },
    { name: 'Pornography', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn/hosts', description: 'Blocks adult content sites.' },
    { name: 'Social Media', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/social/hosts', description: 'Blocks Facebook, Twitter, Instagram, etc.' },
    { name: 'Fake News', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews/hosts', description: 'Blocks known fake news sources.' }
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
            const header = `\n\n# Added by Gaming Optimizer - ${name}\n`
            setHostsContent(prev => prev + header + newContent)
            addLog('SYSTEM', `Blocklist added to editor. Click Save to apply.`)
        } else {
            addLog('ERROR', `Failed to download blocklist: ${result?.error}`)
        }
    }

    const handleClearHosts = () => {
        const defaultHosts = `# Copyright (c) 1993-2009 Microsoft Corp.
#
# This is a sample HOSTS file used by Microsoft TCP/IP for Windows.
#
# This file contains the mappings of IP addresses to host names. Each
# entry should be kept on an individual line. The IP address should
# be placed in the first column followed by the corresponding host name.
# The IP address and the host name should be separated by at least one
# space.
#
# Additionally, comments (such as these) may be inserted on individual
# lines or following the machine name denoted by a '#' symbol.
#
# For example:
#
#      102.54.94.97     rhino.acme.com          # source server
#       38.25.63.10     x.acme.com              # x client host

# localhost name resolution is handled within DNS itself.
#	127.0.0.1       localhost
#	::1             localhost
`
        setHostsContent(defaultHosts)
        addLog('SYSTEM', 'Hosts file reset to default template. Click Save to apply.')
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
            {/* Background Ambient Glow */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white uppercase flex items-center gap-3 drop-shadow-lg">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">Network Tools</span>
                        <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                            <Globe className="w-3.5 h-3.5" />
                            {currentDNS?.primary || 'DHCP'}
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1 font-medium">
                        Advanced network configuration and diagnostics.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={applyBest}
                        disabled={applying}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/30 transition-all text-xs font-bold text-cyan-400 uppercase tracking-wide group disabled:opacity-50"
                        title="Apply recommended DNS"
                    >
                        <Zap className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        <span>Quick Optimize</span>
                    </button>
                    <button
                        onClick={copyDNSSettings}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group"
                        title="Copy DNS settings to clipboard"
                    >
                        <Copy className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                        <span>Copy DNS</span>
                    </button>
                    <button
                        onClick={exportConfig}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-xs font-bold text-muted-foreground hover:text-white uppercase tracking-wide group"
                        title="Export configuration"
                    >
                        <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                        <span>Export Config</span>
                    </button>
                </div>
            </div>

            {/* Speed Test Section */}
            <div className="bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 relative z-10 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-white uppercase tracking-wide">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        Network Speed Test
                    </h3>
                    <button
                        onClick={handleRunSpeedTest}
                        disabled={testingSpeed}
                        className={clsx(
                            "px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-xs uppercase tracking-wider shadow-lg",
                            testingSpeed
                                ? "bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5"
                                : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20 hover:shadow-cyan-500/40 border border-transparent"
                        )}
                    >
                        {testingSpeed ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                TESTING...
                            </>
                        ) : (
                            <>
                                <Zap className="w-3.5 h-3.5" />
                                START TEST
                            </>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-black/40 rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2 z-10">Ping (Latency)</div>
                        <div className={clsx(
                            "text-4xl font-black font-mono z-10 transition-colors",
                            !speedTest ? "text-white/10" :
                                speedTest.ping < 20 ? "text-emerald-400" :
                                    speedTest.ping < 50 ? "text-amber-400" : "text-rose-400"
                        )}>
                            {speedTest ? speedTest.ping : '--'} <span className="text-sm font-bold text-muted-foreground">ms</span>
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2 z-10">Jitter</div>
                        <div className="text-4xl font-black font-mono text-white z-10">
                            {speedTest ? speedTest.jitter : '--'} <span className="text-sm font-bold text-muted-foreground">ms</span>
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider mb-2 z-10">Download</div>
                        <div className="text-4xl font-black font-mono text-cyan-400 z-10">
                            {speedTest ? speedTest.download : '--'} <span className="text-sm font-bold text-muted-foreground">Mbps</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                {/* DNS Section */}
                <div className="space-y-6 flex flex-col h-full">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-white uppercase tracking-wide">
                            <Globe className="w-5 h-5 text-cyan-400" />
                            DNS Providers
                        </h3>
                        <div className="flex gap-2">
                            <select
                                value={dnsFilter}
                                onChange={(e) => setDnsFilter(e.target.value as any)}
                                className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                            >
                                <option value="All">All Types</option>
                                <option value="Fast">Fast</option>
                                <option value="Secure">Secure</option>
                                <option value="Ad-blocking">Ad-blocking</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 max-h-[600px]">
                        <AnimatePresence mode='popLayout'>
                            {filteredDNS.map(dns => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={dns.id}
                                    className={clsx(
                                        "bg-[#0a0e13]/80 backdrop-blur-sm border rounded-xl p-5 transition-all duration-300 group relative overflow-hidden",
                                        activeDNS === dns.id
                                            ? "border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                                            : "border-white/5 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                                    )}
                                >
                                    {/* Active Glow Background */}
                                    {activeDNS === dns.id && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
                                    )}

                                    <div className="flex items-start justify-between mb-4 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className={clsx(
                                                "p-3 rounded-xl border transition-all duration-300",
                                                activeDNS === dns.id
                                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                    : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40"
                                            )}>
                                                <Server className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm text-white tracking-wide group-hover:text-cyan-200 transition-colors">{dns.name}</h3>
                                                <div className="flex gap-2 text-xs font-mono text-muted-foreground mt-1">
                                                    <span className="text-cyan-400 bg-cyan-500/10 px-1.5 rounded">{dns.primary}</span>
                                                    <span className="text-white/20">•</span>
                                                    <span className="text-cyan-400 bg-cyan-500/10 px-1.5 rounded">{dns.secondary}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleApplyDNS(dns.id, dns.primary, dns.secondary)}
                                            disabled={applying || activeDNS === dns.id}
                                            className={clsx(
                                                "px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 text-xs uppercase tracking-wider whitespace-nowrap shadow-lg",
                                                activeDNS === dns.id
                                                    ? 'bg-emerald-500/10 text-emerald-400 cursor-default border border-emerald-500/20'
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

                                    <p className="text-muted-foreground mb-4 text-xs leading-relaxed relative z-10">{dns.description}</p>

                                    <div className="grid grid-cols-2 gap-4 text-[10px] relative z-10">
                                        <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                                            <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                                                <Shield className="w-3 h-3" /> Pros
                                            </h4>
                                            <ul className="space-y-1.5">
                                                {dns.pros.map((pro, i) => (
                                                    <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0 mt-1" />
                                                        {pro}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                                            <h4 className="font-bold text-rose-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                                                <Lock className="w-3 h-3" /> Cons
                                            </h4>
                                            <ul className="space-y-1.5">
                                                {dns.cons.map((con, i) => (
                                                    <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                                                        <div className="w-1 h-1 rounded-full bg-rose-400 flex-shrink-0 mt-1" />
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
                                <Shield className="w-5 h-5 text-cyan-400" />
                                Custom DNS
                            </h3>
                            <button
                                onClick={handleResetDNS}
                                disabled={applying}
                                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold uppercase tracking-wide transition-colors"
                            >
                                <RotateCcw className="w-3 h-3" /> Reset to Default
                            </button>
                        </div>

                        <div className="bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Primary DNS</label>
                                    <input
                                        type="text"
                                        value={customPrimary}
                                        onChange={(e) => setCustomPrimary(e.target.value)}
                                        placeholder="8.8.8.8"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:bg-black/60 text-white placeholder:text-muted-foreground/30 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">Secondary DNS</label>
                                    <input
                                        type="text"
                                        value={customSecondary}
                                        onChange={(e) => setCustomSecondary(e.target.value)}
                                        placeholder="8.8.4.4"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:bg-black/60 text-white placeholder:text-muted-foreground/30 transition-all"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleApplyCustomDNS}
                                disabled={!customPrimary || applying}
                                className={clsx(
                                    "w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg",
                                    !customPrimary || applying
                                        ? "bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5"
                                        : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20 hover:shadow-cyan-500/40 border border-transparent"
                                )}
                            >
                                {applying ? 'APPLYING...' : 'APPLY CUSTOM DNS'}
                            </button>
                        </div>
                    </section>

                    {/* Hosts File Section */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-white uppercase tracking-wide">
                            <FileCode className="w-5 h-5 text-cyan-400" />
                            Hosts File Editor
                        </h3>

                        <div className="bg-[#0a0e13]/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col h-[400px]">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" /> System Hosts
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleClearHosts}
                                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold uppercase tracking-wide transition-colors mr-2"
                                    >
                                        <Trash2 className="w-3 h-3" /> Reset
                                    </button>
                                    <button
                                        onClick={fetchHosts}
                                        disabled={loadingHosts}
                                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold uppercase tracking-wide transition-colors"
                                    >
                                        <RefreshCw className={clsx("w-3 h-3", loadingHosts && "animate-spin")} /> Reload
                                    </button>
                                    <button
                                        onClick={handleSaveHosts}
                                        disabled={savingHosts}
                                        className={clsx(
                                            "px-3 py-1 rounded-lg text-xs flex items-center gap-1 transition-all font-bold uppercase tracking-wide",
                                            savingHosts
                                                ? "bg-white/5 text-muted-foreground"
                                                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                                        )}
                                    >
                                        <Save className="w-3 h-3" /> {savingHosts ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </div>

                            <textarea
                                value={hostsContent}
                                onChange={(e) => setHostsContent(e.target.value)}
                                className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-cyan-500/50 focus:bg-black/60 text-white resize-none custom-scrollbar leading-relaxed"
                                placeholder="Loading hosts file..."
                                spellCheck={false}
                            />

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Download className="w-3 h-3" /> Quick Add Blocklist
                                </label>
                                <div className="grid grid-cols-1 gap-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                                    {blocklists.map((list, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleAddBlocklist(list.url, list.name)}
                                            className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-left flex items-center justify-between transition-all group"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{list.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{list.description}</span>
                                            </div>
                                            <Download className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Administrator Rights Required</p>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        Modifying the hosts file requires administrator privileges. If saving fails,
                                        <button onClick={handleRestartAdmin} className="text-amber-300 hover:underline ml-1">click here to restart as Admin</button>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
