import { LayoutDashboard, Zap, Activity, Terminal, Download, Shield, Trash2, HardDrive, Rocket, X, Minus, Square } from 'lucide-react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface NavbarProps {
    activeTab: string
    setActiveTab: (tab: string) => void
    onWindowControl: (action: 'minimize' | 'maximize' | 'close') => void
}

export function Navbar({ activeTab, setActiveTab, onWindowControl }: NavbarProps) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'system', label: 'System Info', icon: Activity },
        { id: 'optimizer', label: 'Optimizer', icon: Zap },
        { id: 'startup', label: 'Startup', icon: Rocket },
        { id: 'storage', label: 'Storage', icon: HardDrive },
        { id: 'debloater', label: 'Debloater', icon: Trash2 },
        { id: 'software', label: 'Software', icon: Download },
        { id: 'tools', label: 'Tools', icon: Shield },
    ]

    return (
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 titlebar-drag-region bg-[#0a0e13]/80 backdrop-blur-md z-50 relative shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            {/* Logo Section */}
            <div className="flex items-center gap-3 no-drag group cursor-default">
                <div className="relative">
                    <div className="absolute inset-0 bg-violet-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Terminal className="w-6 h-6 text-violet-500 drop-shadow-[0_0_10px_rgba(139,92,246,0.5)] relative z-10 transition-transform group-hover:scale-110 duration-300" />
                </div>
                <div className="flex flex-col">
                    <span className="font-black tracking-widest text-lg leading-none">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">PULSE</span>
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground tracking-[0.2em] uppercase leading-none opacity-60 group-hover:opacity-100 transition-opacity">
                        Optimizer
                    </span>
                </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 flex items-center justify-center gap-1 px-4 no-drag overflow-x-auto custom-scrollbar-hide">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className="relative px-4 py-2 rounded-xl group transition-all duration-300 outline-none"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-active"
                                    className="absolute inset-0 bg-white/5 rounded-xl border border-white/5 shadow-[0_0_15px_rgba(139,92,246,0.1)]"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            <div className="relative z-10 flex items-center gap-2">
                                <item.icon
                                    className={clsx(
                                        "w-4 h-4 transition-all duration-300",
                                        isActive
                                            ? "text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)] scale-110"
                                            : "text-muted-foreground group-hover:text-white group-hover:scale-110"
                                    )}
                                />
                                <span className={clsx(
                                    "text-xs font-bold uppercase tracking-wider transition-colors duration-300",
                                    isActive ? "text-white" : "text-muted-foreground group-hover:text-white/80"
                                )}>
                                    {item.label}
                                </span>
                            </div>

                            {/* Hover Glow */}
                            {!isActive && (
                                <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            )}
                        </button>
                    )
                })}
            </nav>

            {/* Window Controls */}
            <div className="flex items-center gap-2 no-drag pl-4 border-l border-white/5">
                <WindowButton onClick={() => onWindowControl('minimize')} icon={Minus} label="Minimize" />
                <WindowButton onClick={() => onWindowControl('maximize')} icon={Square} label="Maximize" size={12} />
                <WindowButton onClick={() => onWindowControl('close')} icon={X} label="Close" isClose />
            </div>
        </header>
    )
}

function WindowButton({ onClick, icon: Icon, label, isClose, size = 16 }: any) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "p-2 rounded-lg transition-all duration-200 group relative overflow-hidden",
                isClose
                    ? "hover:bg-rose-500/20 hover:text-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                    : "hover:bg-white/10 hover:text-white"
            )}
            title={label}
        >
            <Icon size={size} className={clsx("transition-transform group-hover:scale-110", !isClose && "text-muted-foreground group-hover:text-white")} />
        </button>
    )
}
