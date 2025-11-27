import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Cpu, Shield, Zap, Activity, HardDrive, Wifi, Server } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LoadingScreenProps {
    onComplete: () => void
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState('INITIALIZING SYSTEM CORE')
    const [currentStepIndex, setCurrentStepIndex] = useState(0)

    const steps = [
        { text: "INITIALIZING SYSTEM CORE", icon: Terminal },
        { text: "LOADING KERNEL MODULES", icon: Cpu },
        { text: "MOUNTING FILE SYSTEM", icon: HardDrive },
        { text: "VERIFYING SECURITY PROTOCOLS", icon: Shield },
        { text: "ESTABLISHING IPC BRIDGE", icon: Server },
        { text: "ALLOCATING VRAM BUFFERS", icon: Zap },
        { text: "SYNCING REGISTRY KEYS", icon: Activity },
        { text: "OPTIMIZING NETWORK STACK", icon: Wifi },
        { text: "LOADING USER PROFILE", icon: Terminal },
        { text: "STARTING SERVICES", icon: Zap },
        { text: "SYSTEM READY", icon: Terminal }
    ]

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                const increment = Math.floor(Math.random() * 5) + 1 // Slower, more deliberate progress
                const next = Math.min(prev + increment, 100)

                const stepIndex = Math.floor((next / 100) * (steps.length - 1))
                if (stepIndex > currentStepIndex) {
                    setCurrentStepIndex(stepIndex)
                    setStatus(steps[stepIndex].text)
                }

                if (next >= 100) {
                    clearInterval(timer)
                    setTimeout(onComplete, 1200) // Longer pause at 100% for effect
                }
                return next
            })
        }, 100)

        return () => clearInterval(timer)
    }, [onComplete, currentStepIndex])

    const today = new Date()
    const buildDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`
    const CurrentIcon = steps[currentStepIndex].icon

    return (
        <div className="fixed inset-0 bg-[#050505] z-[100] flex flex-col items-center justify-center text-foreground font-mono overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-900/10 via-[#050505] to-[#050505]" />
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
            <div className="scanline absolute inset-0 pointer-events-none z-[101] opacity-50" />

            {/* Ambient Glows */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-[450px] relative z-10 flex flex-col items-center">
                {/* Logo Section */}
                <div className="relative mb-12 group">
                    <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full animate-pulse-slow" />
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative z-10 p-6 rounded-2xl bg-[#0a0e13]/80 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(139,92,246,0.15)]"
                    >
                        <Terminal className="w-16 h-16 text-violet-500 drop-shadow-[0_0_15px_rgba(139,92,246,0.8)]" />
                    </motion.div>
                </div>

                {/* Title */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="text-center space-y-2 mb-12"
                >
                    <h1 className="text-5xl font-black tracking-[0.2em] text-white relative">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 animate-gradient-x drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                            PULSE
                        </span>
                    </h1>
                    <div className="flex items-center justify-center gap-3 text-[10px] tracking-[0.4em] text-muted-foreground font-bold uppercase">
                        <span className="text-violet-400">System</span>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-cyan-400">Optimizer</span>
                    </div>
                </motion.div>

                {/* Status & Progress */}
                <div className="w-full space-y-4 relative">
                    {/* Status Text */}
                    <div className="flex items-center justify-between px-1 h-6">
                        <AnimatePresence mode='wait'>
                            <motion.div
                                key={currentStepIndex}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="flex items-center gap-2 text-xs font-bold text-cyan-400 tracking-wider"
                            >
                                <CurrentIcon className="w-3.5 h-3.5 animate-pulse" />
                                {status}
                            </motion.div>
                        </AnimatePresence>
                        <span className="text-xs font-bold text-violet-400 font-mono">{progress}%</span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
                        <motion.div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 shadow-[0_0_15px_rgba(139,92,246,0.8)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", stiffness: 50, damping: 15 }}
                        >
                            {/* Leading Edge Glow */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-4 bg-white blur-[4px]" />
                        </motion.div>
                    </div>

                    {/* Technical Details Grid */}
                    <div className="grid grid-cols-3 gap-1 pt-2 opacity-40">
                        <div className="h-0.5 bg-violet-500/50 rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                        <div className="h-0.5 bg-fuchsia-500/50 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="h-0.5 bg-cyan-500/50 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                </div>
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-8 w-full px-12 flex justify-between items-end text-[9px] font-mono tracking-widest text-white/20 uppercase">
                <div className="flex flex-col gap-1">
                    <span>Mem_Alloc: 0x{Math.floor(Math.random() * 999999).toString(16).toUpperCase()}</span>
                    <span>Init_Time: {performance.now().toFixed(2)}ms</span>
                </div>
                <div className="text-right flex flex-col gap-1">
                    <span>v2.0.0 // Build_{buildDate}</span>
                    <span className="text-emerald-500/50">SECURE_BOOT_ENABLED</span>
                </div>
            </div>
        </div>
    )
}
