import { useEffect, useState, useMemo } from 'react'
import { Monitor, Cpu, HardDrive, Shield, Network, Battery, Clock, MemoryStick, Copy, Check, Download, Search, RefreshCw, Info, LayoutDashboard, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { motion } from 'framer-motion'

interface SystemSpec {
    cpu: { name: string; cores: number; speed: string }
    gpu: { name: string; vram: string; driver: string }[]
    ram: { total: string; free: string; type: string }
    storage: { name: string; size: string; used: string; percent: number; type: string }[]
    os: { name: string; release: string; build: string; arch: string; hostname: string }
    windows: {
        key: string
        activationStatus: string
        edition: string
        secureBoot: boolean
        tpm: boolean
        defender: boolean
        thirdPartyAntivirus: string
    }
    system: { manufacturer: string; model: string; bios: string }
    network?: { adapter: string; type: string; speed: string; ipv4: string; dns: string; mac: string }
    battery?: { level: number; status: string; health: number; estimatedTime: string; powerPlan: string } | null
    uptime?: { lastBoot: string; uptime: string }
    memoryDetails?: { slots: number; speed: string; type: string; channels: string; sticks: any[] }
}

const SpecRow = ({ label, value, className, status, tooltip }: { label: string, value: string | number, className?: string, status?: 'good' | 'warning' | 'bad' | 'neutral', tooltip?: string }) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(String(value))
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    return (
        <div className="group/row flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate flex items-center gap-2">
                {status && (
                    <span className={clsx("w-1.5 h-1.5 rounded-full",
                        status === 'good' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                            status === 'warning' ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" :
                                status === 'bad' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                    "bg-white/20"
                    )} />
                )}
                {label}
                {tooltip && (
                    <div className="group/tooltip relative">
                        <Info className="w-3 h-3 text-muted-foreground/40 hover:text-primary cursor-help" />
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 p-2 bg-black/90 border border-white/10 rounded text-[10px] text-white/80 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 backdrop-blur-md shadow-xl">
                            {tooltip}
                        </div>
                    </div>
                )}
            </span>
            <div className="flex items-center gap-2 min-w-0">
                <span className={clsx("font-mono text-sm text-right truncate select-all text-white/90", className)} title={String(value)}>{value}</span>
                <button
                    onClick={handleCopy}
                    className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-white p-1 rounded hover:bg-white/10"
                >
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </button>
            </div>
        </div>
    )
}

const DetailSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-3">
        <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider px-2">{title}</h3>
        <div className="bg-[#0a0e13]/50 border border-white/5 rounded-xl overflow-hidden p-1">
            {children}
        </div>
    </div>
)

export function SystemInfo() {
    const [specs, setSpecs] = useState<SystemSpec | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('summary')
    const [searchTerm, setSearchTerm] = useState('')
    const [isRefreshing, setIsRefreshing] = useState(false)

    useEffect(() => {
        loadSpecs()
        const interval = setInterval(() => refreshDynamicData(), 5000)
        return () => clearInterval(interval)
    }, [])

    const loadSpecs = async () => {
        setLoading(true)
        const data = await window.ipcRenderer.invoke('get-system-specs')
        setSpecs(data)
        setLoading(false)
    }

    const refreshDynamicData = async () => {
        const data = await window.ipcRenderer.invoke('get-system-specs')
        setSpecs(prev => {
            if (!prev) return data
            return {
                ...prev,
                ram: data.ram,
                uptime: data.uptime,
                battery: data.battery,
                network: data.network
            }
        })
    }

    const handleManualRefresh = async () => {
        setIsRefreshing(true)
        await loadSpecs()
        setTimeout(() => setIsRefreshing(false), 500)
    }

    const handleExport = () => {
        if (!specs) return
        const text = JSON.stringify(specs, null, 2)
        const blob = new Blob([text], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `system-specs-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const handleCopyAll = () => {
        if (!specs) return
        const text = `System Specs Report\nCPU: ${specs.cpu.name}\nRAM: ${specs.ram.total}\nGPU: ${specs.gpu[0]?.name}\nOS: ${specs.os.name} ${specs.os.release}`
        navigator.clipboard.writeText(text)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Scanning Hardware...</p>
                </div>
            </div>
        )
    }

    if (!specs) return <div className="text-muted-foreground">Failed to load system specs</div>

    const tabs = [
        { id: 'summary', label: 'Summary', icon: LayoutDashboard },
        { id: 'cpu', label: 'Processor', icon: Cpu },
        { id: 'memory', label: 'Memory', icon: MemoryStick },
        { id: 'graphics', label: 'Graphics', icon: Monitor },
        { id: 'storage', label: 'Storage', icon: HardDrive },
        { id: 'network', label: 'Network', icon: Network },
        { id: 'os', label: 'Operating System', icon: Shield },
        { id: 'power', label: 'Power', icon: Battery, hidden: !specs.battery },
        { id: 'system', label: 'System', icon: Clock },
    ]

    return (
        <div className="h-full flex overflow-hidden bg-[#0a0e13]/30 rounded-2xl border border-white/5">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/5 bg-[#0a0e13]/50 flex flex-col">
                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {tabs.filter(t => !t.hidden).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                                activeTab === tab.id
                                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            <tab.icon className={clsx("w-4 h-4", activeTab === tab.id ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                            {tab.label}
                            {activeTab === tab.id && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-white/5 space-y-2">
                    <button onClick={handleManualRefresh} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium transition-colors text-muted-foreground hover:text-white">
                        <RefreshCw className={clsx("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                        Refresh Data
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleCopyAll} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium transition-colors text-muted-foreground hover:text-white">
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                        </button>
                        <button onClick={handleExport} className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-medium transition-colors text-muted-foreground hover:text-white">
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-transparent to-white/[0.02]">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-8"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                {(() => {
                                    const TabIcon = tabs.find(t => t.id === activeTab)?.icon || LayoutDashboard
                                    return <TabIcon className="w-6 h-6" />
                                })()}
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">{tabs.find(t => t.id === activeTab)?.label}</h2>
                        </div>

                        {/* Summary View */}
                        {activeTab === 'summary' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <DetailSection title="Core System">
                                    <SpecRow label="Processor" value={specs.cpu.name} className="text-white" />
                                    <SpecRow label="Memory" value={`${specs.ram.total} (${specs.ram.free} Free)`} status="good" />
                                    <SpecRow label="Graphics" value={specs.gpu[0]?.name} className="text-white" />
                                    <SpecRow label="OS" value={`${specs.os.name} ${specs.os.release}`} />
                                </DetailSection>
                                <DetailSection title="Status">
                                    <SpecRow label="Uptime" value={specs.uptime?.uptime || '-'} />
                                    <SpecRow label="Secure Boot" value={specs.windows.secureBoot ? 'Enabled' : 'Disabled'} status={specs.windows.secureBoot ? 'good' : 'bad'} />
                                    <SpecRow label="TPM 2.0" value={specs.windows.tpm ? 'Active' : 'Missing'} status={specs.windows.tpm ? 'good' : 'warning'} />
                                    <SpecRow label="Antivirus" value={specs.windows.defender ? 'Windows Defender' : (specs.windows.thirdPartyAntivirus || 'Other')} status="good" />
                                </DetailSection>
                            </div>
                        )}

                        {/* CPU View */}
                        {activeTab === 'cpu' && (
                            <DetailSection title="Processor Details">
                                <SpecRow label="Model Name" value={specs.cpu.name} className="text-white" />
                                <SpecRow label="Base Speed" value={specs.cpu.speed} />
                                <SpecRow label="Total Cores" value={specs.cpu.cores} />
                                <SpecRow label="Architecture" value={specs.os.arch} />
                            </DetailSection>
                        )}

                        {/* Memory View */}
                        {activeTab === 'memory' && (
                            <div className="space-y-6">
                                <DetailSection title="Capacity">
                                    <SpecRow label="Total Physical Memory" value={specs.ram.total} className="text-white" />
                                    <SpecRow label="Available Memory" value={specs.ram.free} status="good" />
                                </DetailSection>
                                {specs.memoryDetails && (
                                    <DetailSection title="Configuration">
                                        <SpecRow label="Type" value={specs.memoryDetails.type} />
                                        <SpecRow label="Speed" value={`${specs.memoryDetails.speed} MHz`} />
                                        <SpecRow label="Slots Used" value={`${specs.memoryDetails.sticks.length} / ${specs.memoryDetails.slots}`} />
                                    </DetailSection>
                                )}
                            </div>
                        )}

                        {/* Graphics View */}
                        {activeTab === 'graphics' && (
                            <div className="space-y-6">
                                {specs.gpu.map((gpu, idx) => (
                                    <DetailSection key={idx} title={`GPU ${idx + 1}`}>
                                        <SpecRow label="Model" value={gpu.name} className="text-white" />
                                        <SpecRow label="VRAM" value={gpu.vram} />
                                        <SpecRow label="Driver Version" value={gpu.driver} />
                                    </DetailSection>
                                ))}
                            </div>
                        )}

                        {/* Storage View */}
                        {activeTab === 'storage' && (
                            <div className="space-y-6">
                                {specs.storage.map((drive, idx) => (
                                    <DetailSection key={idx} title={drive.name || `Drive ${idx + 1}`}>
                                        <SpecRow label="Type" value={drive.type} />
                                        <SpecRow label="Total Size" value={drive.size} />
                                        <SpecRow label="Used Space" value={drive.used} />
                                        <div className="px-3 py-2">
                                            <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                                                <span>Usage</span>
                                                <span>{drive.percent}%</span>
                                            </div>
                                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={clsx("h-full rounded-full", drive.percent > 90 ? "bg-red-500" : "bg-primary")}
                                                    style={{ width: `${drive.percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    </DetailSection>
                                ))}
                            </div>
                        )}

                        {/* Network View */}
                        {activeTab === 'network' && specs.network && (
                            <DetailSection title="Active Connection">
                                <SpecRow label="Adapter Name" value={specs.network.adapter} className="text-white" />
                                <SpecRow label="Connection Type" value={specs.network.type} />
                                <SpecRow label="Link Speed" value={specs.network.speed} />
                                <SpecRow label="IPv4 Address" value={specs.network.ipv4} />
                                <SpecRow label="MAC Address" value={specs.network.mac} />
                                <SpecRow label="DNS Servers" value={specs.network.dns} />
                            </DetailSection>
                        )}

                        {/* OS View */}
                        {activeTab === 'os' && (
                            <div className="space-y-6">
                                <DetailSection title="Windows Specification">
                                    <SpecRow label="Edition" value={specs.os.name} className="text-white" />
                                    <SpecRow label="Version" value={specs.os.release} />
                                    <SpecRow label="OS Build" value={specs.os.build} />
                                    <SpecRow label="Hostname" value={specs.os.hostname} />
                                </DetailSection>
                                <DetailSection title="Security">
                                    <SpecRow label="Activation Status" value={specs.windows.activationStatus} status={specs.windows.activationStatus === 'Activated' ? 'good' : 'warning'} />
                                    <SpecRow label="Secure Boot" value={specs.windows.secureBoot ? 'Enabled' : 'Disabled'} status={specs.windows.secureBoot ? 'good' : 'bad'} />
                                    <SpecRow label="TPM Version" value={specs.windows.tpm ? '2.0' : 'Not Found'} status={specs.windows.tpm ? 'good' : 'warning'} />
                                </DetailSection>
                            </div>
                        )}

                        {/* System View */}
                        {activeTab === 'system' && (
                            <DetailSection title="Device Info">
                                <SpecRow label="Manufacturer" value={specs.system.manufacturer} />
                                <SpecRow label="Model" value={specs.system.model} className="text-white" />
                                <SpecRow label="BIOS Version" value={specs.system.bios} />
                                <SpecRow label="Last Boot" value={specs.uptime?.lastBoot || '-'} />
                            </DetailSection>
                        )}

                        {/* Power View */}
                        {activeTab === 'power' && specs.battery && (
                            <DetailSection title="Battery Status">
                                <SpecRow label="Charge Level" value={`${specs.battery.level}%`} status={specs.battery.level > 20 ? 'good' : 'bad'} />
                                <SpecRow label="Status" value={specs.battery.status} />
                                <SpecRow label="Health" value={`${specs.battery.health}%`} />
                                <SpecRow label="Power Plan" value={specs.battery.powerPlan} />
                            </DetailSection>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
