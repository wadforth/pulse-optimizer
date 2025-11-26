import { motion } from 'framer-motion'
import { Terminal } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LoadingScreenProps {
    onComplete: () => void
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState('Initializing System Core...')
    const [currentStepIndex, setCurrentStepIndex] = useState(0)

    const steps = [
        "Initializing System Core...",
        "Loading Kernel Modules...",
        "Mounting File System...",
        "Verifying Security Protocols...",
        "Establishing IPC Bridge...",
        "Allocating VRAM Buffers...",
        "Syncing Registry Keys...",
        "Optimizing Network Stack...",
        "Loading User Profile...",
        "Starting Services...",
        "System Ready"
    ]

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                const increment = Math.floor(Math.random() * 8) + 1
                const next = Math.min(prev + increment, 100)

                const stepIndex = Math.floor((next / 100) * (steps.length - 1))
                if (stepIndex > currentStepIndex) {
                    setCurrentStepIndex(stepIndex)
                    setStatus(steps[stepIndex])
                }

                if (next >= 100) {
                    clearInterval(timer)
                    setTimeout(onComplete, 800)
                }
                return next
            })
        }, 150)

        return () => clearInterval(timer)
    }, [onComplete, currentStepIndex])

    const today = new Date()
    const buildDate = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`

    return (
        <div className="fixed inset-0 bg-[#09090b] z-[100] flex flex-col items-center justify-center text-foreground font-mono bg-grid-pattern">
            <div className="scanline absolute inset-0 pointer-events-none z-[101]" />

            <div className="w-96 space-y-8 relative z-10">
                {/* Logo/Header */}
                <div className="text-center space-y-2">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="inline-block p-4 rounded-full bg-primary/10 mb-4 border border-primary/20 shadow-[0_0_20px_rgba(124,58,237,0.2)]"
                    >
                        <Terminal className="w-12 h-12 text-primary" />
                    </motion.div>
                    <h1 className="text-4xl font-bold tracking-widest text-white">
                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent text-glow-purple">PULSE</span>
                    </h1>
                    <p className="text-xs text-primary/70 tracking-[0.3em] uppercase">System Initialization</p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                        <span className="text-primary animate-pulse">{status}</span>
                        <span className="text-muted-foreground">{progress}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            className="h-full bg-gradient-to-r from-primary to-secondary shadow-[0_0_10px_rgba(124,58,237,0.8)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.1 }}
                        />
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="grid grid-cols-3 gap-2 opacity-30">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-0.5 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                </div>

                <div className="text-[10px] text-center text-white/10 font-mono pt-4">
                    LOADING ASSETS... PLEASE WAIT
                </div>
            </div>

            {/* Version Info */}
            <div className="absolute bottom-8 text-[10px] text-muted-foreground/30 font-mono tracking-wider">
                v2.0.0-beta // BUILD_{buildDate} // SECURE_BOOT_ENABLED
            </div>
        </div>
    )
}
