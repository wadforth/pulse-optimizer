import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useLog } from './LogContext'

export interface Optimization {
    id: string
    name: string
    description: string
    risk: 'Low' | 'Medium' | 'High'
    category: 'NETWORK' | 'SYSTEM' | 'PRIVACY' | 'GAMING'
    isEnabled: boolean
    impact: 'High' | 'Medium' | 'Low'
    breakage: string
    command?: string
    revertCommand?: string
    registryPath?: string
    registryKey?: string
    registryType?: 'REG_DWORD' | 'REG_SZ'
    currentValue?: string
    intendedValue?: string
    originalValue?: string // Store original value for revert
    requiresAdmin?: boolean
    requiresRestart?: boolean
    exists?: boolean
    error?: string
    riskDetails?: string
}

interface SystemRestoreStatus {
    enabled: boolean
    error?: string
}

interface OptimizationContextType {
    optimizations: Optimization[]
    applyOptimization: (id: string) => Promise<boolean>
    revertOptimization: (id: string) => Promise<boolean>
    refreshOptimizations: () => Promise<void>
    optimizationScore: number
    loading: boolean
    systemRestoreStatus: SystemRestoreStatus | null
    checkSystemRestore: () => Promise<void>
    enableSystemRestore: () => Promise<boolean>
}

const defaultOptimizations: Optimization[] = [
    {
        id: 'disable_sysmain',
        name: 'Disable SysMain (Superfetch)',
        description: 'Reduces background disk activity. May slightly increase app load times on HDDs.',
        risk: 'Low',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Medium',
        command: 'Stop-Service "SysMain" -Force; Set-Service "SysMain" -StartupType Disabled',
        revertCommand: 'Set-Service "SysMain" -StartupType Automatic; Start-Service "SysMain"',
        currentValue: 'Automatic',
        intendedValue: 'Disabled',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'May increase app load times on HDDs. No issues on SSDs.'
    },
    {
        id: 'network_throttling',
        name: 'Disable Network Throttling Index',
        description: 'Removes Windows network throttling for multimedia applications.',
        risk: 'Low',
        category: 'NETWORK',
        isEnabled: false,
        impact: 'Medium',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile',
        registryKey: 'NetworkThrottlingIndex',
        registryType: 'REG_DWORD',
        currentValue: '10',
        intendedValue: '4294967295', // ffffffff
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'May affect multimedia streaming quality in rare cases.'
    },
    {
        id: 'system_responsiveness',
        name: 'Optimize System Responsiveness',
        description: 'Prioritizes gaming applications over background services.',
        risk: 'Low',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Medium',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile',
        registryKey: 'SystemResponsiveness',
        registryType: 'REG_DWORD',
        currentValue: '20',
        intendedValue: '0',
        requiresAdmin: true,
        requiresRestart: true,
        breakage: 'Background tasks might be slightly slower.'
    },
    {
        id: 'tcp_nodelay',
        name: 'Enable TCP NoDelay',
        description: 'Disables Nagle algorithm for lower network latency in games.',
        risk: 'Low',
        category: 'NETWORK',
        isEnabled: false,
        impact: 'High',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\MSMQ\\Parameters',
        registryKey: 'TCPNoDelay',
        registryType: 'REG_DWORD',
        currentValue: '0',
        intendedValue: '1',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'Slightly higher network bandwidth usage due to more frequent packets.'
    },
    {
        id: 'game_dvr',
        name: 'Disable Xbox Game DVR',
        description: 'Disables Xbox Game Bar recording which can cause FPS drops.',
        risk: 'Low',
        category: 'GAMING',
        isEnabled: false,
        impact: 'Medium',
        registryPath: 'HKEY_CURRENT_USER\\System\\GameConfigStore',
        registryKey: 'GameDVR_Enabled',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '0',
        requiresAdmin: false,
        requiresRestart: false,
        breakage: 'Cannot record gameplay with Xbox Game Bar.'
    },
    {
        id: 'game_mode',
        name: 'Enable Game Mode',
        description: 'Ensures Windows Game Mode is enabled for best performance.',
        risk: 'Low',
        category: 'GAMING',
        isEnabled: false,
        impact: 'Medium',
        registryPath: 'HKEY_CURRENT_USER\\Software\\Microsoft\\GameBar',
        registryKey: 'AutoGameModeEnabled',
        registryType: 'REG_DWORD',
        currentValue: '0',
        intendedValue: '1',
        requiresAdmin: false,
        requiresRestart: false,
        breakage: 'None. Recommended for all gamers.'
    },
    {
        id: 'priority_control',
        name: 'Optimize Win32 Priority Separation',
        description: 'Optimizes processor scheduling for foreground applications.',
        risk: 'Medium',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Medium',
        registryPath: 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl',
        registryKey: 'Win32PrioritySeparation',
        registryType: 'REG_DWORD',
        currentValue: '2',
        intendedValue: '38', // 0x26
        requiresAdmin: true,
        requiresRestart: true,
        breakage: 'May affect background service performance.'
    },
    {
        id: 'disable_telemetry',
        name: 'Disable Windows Telemetry',
        description: 'Reduces background data collection and transmission.',
        risk: 'Low',
        category: 'PRIVACY',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
        registryKey: 'AllowTelemetry',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '0',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'Windows Insider builds may not work correctly.'
    },
    {
        id: 'disable_cortana',
        name: 'Disable Cortana',
        description: 'Completely disables Cortana voice assistant and related services.',
        risk: 'Low',
        category: 'PRIVACY',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search',
        registryKey: 'AllowCortana',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '0',
        requiresAdmin: true,
        requiresRestart: true,
        breakage: 'Voice commands will not work. Search may be less comprehensive.'
    },
    {
        id: 'disable_advertising_id',
        name: 'Disable Advertising ID',
        description: 'Prevents Windows from tracking you for targeted advertising.',
        risk: 'Low',
        category: 'PRIVACY',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo',
        registryKey: 'Enabled',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '0',
        requiresAdmin: false,
        requiresRestart: false,
        breakage: 'May see less relevant ads (actually a benefit).'
    },
    {
        id: 'disable_feedback',
        name: 'Disable Feedback Requests',
        description: 'Stops Windows from asking for feedback.',
        risk: 'Low',
        category: 'PRIVACY',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Siuf\\Rules',
        registryKey: 'NumberOfSIUFInPeriod',
        registryType: 'REG_DWORD',
        currentValue: '0',
        intendedValue: '0',
        requiresAdmin: false,
        requiresRestart: false,
        breakage: 'No impact. Purely beneficial.'
    },
    {
        id: 'disable_tips',
        name: 'Disable Windows Tips',
        description: 'Disables Windows tips and suggestions.',
        risk: 'Low',
        category: 'PRIVACY',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
        registryKey: 'SubscribedContent-338389Enabled',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '0',
        requiresAdmin: false,
        requiresRestart: false,
        breakage: 'No helpful Windows tips. No real downside.'
    },
    {
        id: 'disable_fullscreen_opt',
        name: 'Disable Fullscreen Optimizations',
        description: 'Prevents Windows from interfering with fullscreen games.',
        risk: 'Low',
        category: 'GAMING',
        isEnabled: false,
        impact: 'High',
        registryPath: 'HKEY_CURRENT_USER\\System\\GameConfigStore',
        registryKey: 'GameDVR_DXGIHonorFSEWindowsCompatible',
        registryType: 'REG_DWORD',
        currentValue: '0',
        intendedValue: '1',
        requiresAdmin: false,
        requiresRestart: false,
        breakage: 'May introduce input lag in some games. Test first.'
    },
    {
        id: 'gpu_hardware_scheduling',
        name: 'Enable GPU Hardware Scheduling',
        description: 'Let GPU manage its own memory. Requires Windows 10 2004+ and compatible GPU.',
        risk: 'Low',
        category: 'GAMING',
        isEnabled: false,
        impact: 'High',
        registryPath: 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers',
        registryKey: 'HwSchMode',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '2',
        requiresAdmin: true,
        requiresRestart: true,
        breakage: 'Requires compatible GPU (NVIDIA 10-series or newer, AMD RX 5000+).'
    },
    {
        id: 'msi_mode_gpu',
        name: 'Enable MSI Mode for GPU',
        description: 'Enables Message Signaled Interrupts for lower latency. Risky on some systems.',
        risk: 'High',
        category: 'GAMING',
        isEnabled: false,
        impact: 'High',
        registryPath: 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Enum\\PCI',
        registryKey: 'MSISupported',
        registryType: 'REG_DWORD',
        currentValue: '0',
        intendedValue: '1',
        requiresAdmin: true,
        requiresRestart: true,
        breakage: 'May cause system instability or crashes on some hardware. Risky!'
    },
    {
        id: 'disable_windows_update',
        name: 'Disable Automatic Windows Updates',
        description: 'Prevents automatic Windows updates. You will need to manually check for updates.',
        risk: 'Medium',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU',
        registryKey: 'NoAutoUpdate',
        registryType: 'REG_DWORD',
        currentValue: '0',
        intendedValue: '1',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'Must manually check for updates. Security risk if forgotten.'
    },
    {
        id: 'visual_effects',
        name: 'Disable Visual Effects',
        description: 'Disables animations and transparency for better performance.',
        risk: 'Low',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Medium',
        registryPath: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects',
        registryKey: 'VisualFXSetting',
        registryType: 'REG_DWORD',
        currentValue: '0',
        intendedValue: '2',
        requiresAdmin: false,
        requiresRestart: false,
        breakage: 'Windows will look less polished. No animations or transparency.'
    },
    {
        id: 'disable_netbios',
        name: 'Disable NetBIOS over TCP/IP',
        description: 'Disables legacy NetBIOS protocol for improved security and slight speed boost.',
        risk: 'Low',
        category: 'NETWORK',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\NetBT\\Parameters',
        registryKey: 'NodeType',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '2',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'May break legacy network shares and printers.'
    },
    {
        id: 'dns_cache_limit',
        name: 'Increase DNS Cache Size',
        description: 'Increases DNS cache limit for faster repeated domain lookups.',
        risk: 'Low',
        category: 'NETWORK',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters',
        registryKey: 'CacheHashTableSize',
        registryType: 'REG_DWORD',
        currentValue: '384',
        intendedValue: '1024',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'Slightly increased memory usage (negligible).'
    },
    {
        id: 'disable_activity_history',
        name: 'Disable Activity History',
        description: 'Stops Windows from collecting your activity history.',
        risk: 'Low',
        category: 'PRIVACY',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Microsoft\\Windows\\System',
        registryKey: 'EnableActivityFeed',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '0',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'Timeline feature will not work.'
    },
    // New Optimizations
    {
        id: 'disable_hibernation',
        name: 'Disable Hibernation',
        description: 'Frees up disk space equal to RAM size and removes hiberfil.sys.',
        risk: 'Low',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Medium',
        command: 'powercfg -h off',
        revertCommand: 'powercfg -h on',
        currentValue: 'Unknown',
        intendedValue: 'Off',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'Cannot use Hibernate mode. Fast Startup will be disabled.'
    },
    {
        id: 'disable_print_spooler',
        name: 'Disable Print Spooler',
        description: 'Disables printer service if you don\'t use a printer.',
        risk: 'Low',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Low',
        command: 'Stop-Service "Spooler" -Force; Set-Service "Spooler" -StartupType Disabled',
        revertCommand: 'Set-Service "Spooler" -StartupType Automatic; Start-Service "Spooler"',
        currentValue: 'Automatic',
        intendedValue: 'Disabled',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'Cannot print documents.'
    },
    {
        id: 'disable_fax',
        name: 'Disable Fax Service',
        description: 'Disables legacy Fax service.',
        risk: 'Low',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Low',
        command: 'Stop-Service "Fax" -Force; Set-Service "Fax" -StartupType Disabled',
        revertCommand: 'Set-Service "Fax" -StartupType Manual',
        currentValue: 'Manual',
        intendedValue: 'Disabled',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'Cannot send/receive faxes.'
    },
    {
        id: 'ntfs_memory_usage',
        name: 'Increase NTFS Memory Usage',
        description: 'Increases memory allocated to NTFS file system for better disk performance.',
        risk: 'Low',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Medium',
        registryPath: 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\FileSystem',
        registryKey: 'NtfsMemoryUsage',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '2',
        requiresAdmin: true,
        requiresRestart: true,
        breakage: 'Slightly higher RAM usage.'
    },
    {
        id: 'disable_search_indexing',
        name: 'Disable Windows Search Indexing',
        description: 'Reduces background disk usage by disabling file indexing.',
        risk: 'Medium',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Medium',
        command: 'Stop-Service "WSearch" -Force; Set-Service "WSearch" -StartupType Disabled',
        revertCommand: 'Set-Service "WSearch" -StartupType Automatic; Start-Service "WSearch"',
        currentValue: 'Automatic',
        intendedValue: 'Disabled',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'File search will be slow and manual.'
    },
    {
        id: 'mouse_acceleration',
        name: 'Disable Mouse Acceleration',
        description: 'Disables "Enhance Pointer Precision" for 1:1 mouse movement.',
        risk: 'Low',
        category: 'GAMING',
        isEnabled: false,
        impact: 'High',
        registryPath: 'HKEY_CURRENT_USER\\Control Panel\\Mouse',
        registryKey: 'MouseSpeed',
        registryType: 'REG_SZ',
        currentValue: '1',
        intendedValue: '0',
        requiresAdmin: false,
        requiresRestart: true,
        breakage: 'Mouse feel will change. Better for aiming.'
    },
    {
        id: 'lan_manager_auth',
        name: 'Disable LAN Manager Authentication',
        description: 'Disables legacy LM authentication for security.',
        risk: 'Low',
        category: 'NETWORK',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Lsa',
        registryKey: 'LmCompatibilityLevel',
        registryType: 'REG_DWORD',
        currentValue: '3',
        intendedValue: '5',
        requiresAdmin: true,
        requiresRestart: true,
        breakage: 'May break connection to very old NAS or servers.'
    },
    {
        id: 'disable_sticky_keys',
        name: 'Disable Sticky Keys',
        description: 'Prevents Sticky Keys popup from interrupting games.',
        risk: 'Low',
        category: 'GAMING',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_CURRENT_USER\\Control Panel\\Accessibility\\StickyKeys',
        registryKey: 'Flags',
        registryType: 'REG_SZ',
        currentValue: '510',
        intendedValue: '506',
        requiresAdmin: false,
        requiresRestart: false,
        breakage: 'Sticky keys accessibility feature disabled.'
    },
    {
        id: 'disable_remote_assistance',
        name: 'Disable Remote Assistance',
        description: 'Disables Remote Assistance connections for security.',
        risk: 'Low',
        category: 'PRIVACY',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Remote Assistance',
        registryKey: 'fAllowToGetHelp',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '0',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'Cannot receive remote help via Windows Remote Assistance.'
    },
    {
        id: 'uac_dimming',
        name: 'Disable UAC Dimming',
        description: 'Disables the secure desktop dimming when UAC prompts appear.',
        risk: 'Low',
        category: 'SYSTEM',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System',
        registryKey: 'PromptOnSecureDesktop',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '0',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'UAC prompt will appear on normal desktop. Slightly less secure.'
    },
    {
        id: 'gpu_priority_games',
        name: 'High Priority GPU for Games',
        description: 'Sets GPU priority to High for gaming tasks.',
        risk: 'Low',
        category: 'GAMING',
        isEnabled: false,
        impact: 'High',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games',
        registryKey: 'GPU Priority',
        registryType: 'REG_DWORD',
        currentValue: '8',
        intendedValue: '8',
        requiresAdmin: true,
        requiresRestart: true,
        breakage: 'None known.'
    },
    {
        id: 'disable_power_throttling',
        name: 'Disable Power Throttling',
        description: 'Prevents Windows from throttling power to background apps.',
        risk: 'Low',
        category: 'GAMING',
        isEnabled: false,
        impact: 'Medium',
        registryPath: 'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling',
        registryKey: 'PowerThrottlingOff',
        registryType: 'REG_DWORD',
        currentValue: '0',
        intendedValue: '1',
        requiresAdmin: true,
        requiresRestart: true,
        breakage: 'Slightly increased power consumption.'
    },
    {
        id: 'disable_location_tracking',
        name: 'Disable Location Tracking',
        description: 'Prevents Windows and apps from accessing your location.',
        risk: 'Low',
        category: 'PRIVACY',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\location',
        registryKey: 'Value',
        registryType: 'REG_SZ',
        currentValue: 'Allow',
        intendedValue: 'Deny',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'Maps and weather apps won\'t auto-detect location.'
    },
    {
        id: 'disable_wifi_sense',
        name: 'Disable Wi-Fi Sense',
        description: 'Prevents sharing Wi-Fi credentials with contacts.',
        risk: 'Low',
        category: 'PRIVACY',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\WcmSvc\\wifinetworkmanager\\config',
        registryKey: 'AutoConnectAllowedOEM',
        registryType: 'REG_DWORD',
        currentValue: '1',
        intendedValue: '0',
        requiresAdmin: true,
        requiresRestart: false,
        breakage: 'None.'
    },
    {
        id: 'disable_bing_search',
        name: 'Disable Bing in Start Menu',
        description: 'Removes web search results from the Start Menu.',
        risk: 'Low',
        category: 'PRIVACY',
        isEnabled: false,
        impact: 'Low',
        registryPath: 'HKEY_CURRENT_USER\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer',
        registryKey: 'DisableSearchBoxSuggestions',
        registryType: 'REG_DWORD',
        currentValue: '0',
        intendedValue: '1',
        requiresAdmin: true,
        requiresRestart: true,
        breakage: 'No web results in Start Menu search (cleaner).'
    }
]

const OptimizationContext = createContext<OptimizationContextType | undefined>(undefined)

export function OptimizationProvider({ children }: { children: ReactNode }) {
    const [optimizations, setOptimizations] = useState<Optimization[]>(defaultOptimizations)
    const [loading, setLoading] = useState(true)
    const [systemRestoreStatus, setSystemRestoreStatus] = useState<SystemRestoreStatus | null>(null)
    const { addLog } = useLog()

    const loadOptimizations = async () => {
        setLoading(true)
        try {
            const checkedOpts = await Promise.all(
                defaultOptimizations.map(async (opt) => {
                    let actuallyEnabled = false
                    let currentValue = opt.currentValue

                    let exists = true
                    let error = undefined

                    if (opt.command) {
                        const serviceName = extractServiceName(opt.command)
                        if (serviceName) {
                            const result = await window.ipcRenderer?.invoke('check-service-status', serviceName)
                            if (result?.success) {
                                actuallyEnabled = result.startupType === 'Disabled' || result.status === 'Stopped'
                                currentValue = result.startupType
                            } else {
                                // If check fails, assume service might not exist or error
                                exists = false
                                error = result?.error || 'Service check failed'
                            }
                        }
                    } else if (opt.registryPath && opt.registryKey) {
                        const result = await window.ipcRenderer?.invoke('get-registry-value', opt.registryKey, opt.registryPath)
                        if (result?.success) {
                            currentValue = result.value
                            // Compare values (handle string/number differences)
                            actuallyEnabled = String(result.value) === String(opt.intendedValue)
                        } else {
                            // If result.success is false, it might be missing or error
                            currentValue = 'Unknown'
                            exists = false
                            error = result?.error || 'Key not found'
                        }
                    }

                    return {
                        ...opt,
                        isEnabled: actuallyEnabled,
                        currentValue: currentValue,
                        originalValue: currentValue, // Store initial value as original for now
                        exists,
                        error
                    }
                })
            )

            setOptimizations(checkedOpts)
        } catch (error) {
            console.error('Failed to load optimizations:', error)
            addLog('ERROR', 'Failed to scan system optimizations')
        } finally {
            setLoading(false)
        }
    }

    const checkSystemRestore = async () => {
        try {
            const result = await window.ipcRenderer?.invoke('check-system-restore-status')
            setSystemRestoreStatus(result)
        } catch (error) {
            console.error('Failed to check system restore status:', error)
        }
    }

    const enableSystemRestore = async (): Promise<boolean> => {
        try {
            const result = await window.ipcRenderer?.invoke('enable-system-restore')
            if (result?.success) {
                addLog('OPTIMIZER', 'System Restore enabled successfully')
                await checkSystemRestore()
                return true
            } else {
                addLog('ERROR', result?.error || 'Failed to enable System Restore')
                return false
            }
        } catch (error) {
            addLog('ERROR', 'Failed to enable System Restore')
            return false
        }
    }

    useEffect(() => {
        loadOptimizations()
        checkSystemRestore()
    }, [])

    const applyOptimization = async (id: string): Promise<boolean> => {
        const opt = optimizations.find(o => o.id === id)
        if (!opt) return false

        addLog('OPTIMIZER', `Applying: ${opt.name}...`)

        try {
            let success = false
            if (opt.command) {
                const result = await window.ipcRenderer?.invoke('execute-powershell-command', opt.command)
                success = result?.success
                if (!success) addLog('ERROR', result?.error || 'Failed to execute command')
            } else if (opt.registryPath && opt.registryKey && opt.intendedValue) {
                const result = await window.ipcRenderer?.invoke(
                    'set-registry-value',
                    opt.registryKey,
                    opt.registryPath,
                    opt.intendedValue,
                    opt.registryType || 'REG_DWORD'
                )
                success = result?.success
                if (!success) addLog('ERROR', result?.error || 'Failed to write registry key')
            }

            if (success) {
                addLog('OPTIMIZER', `Applied ${opt.name}`)
                await refreshOptimizations() // Reload state to verify
                return true
            }
        } catch (error) {
            addLog('ERROR', `Error applying ${opt.name}`)
        }
        return false
    }

    const revertOptimization = async (id: string): Promise<boolean> => {
        const opt = optimizations.find(o => o.id === id)
        if (!opt) return false

        // If we don't have an original value or it's unknown, we can't safely revert
        // Unless we have a known "default" value in the config?
        // For now, let's use 'currentValue' captured at start if it differs from intended
        // But if it was ALREADY optimized, originalValue might be the optimized one.
        // Ideally we'd have a 'defaultValue' in the config.

        // Let's assume 'currentValue' from the config is the "Default" for Windows
        const defaultValue = defaultOptimizations.find(o => o.id === id)?.currentValue

        if (!defaultValue) {
            addLog('ERROR', 'Cannot revert: No default value known')
            return false
        }

        addLog('OPTIMIZER', `Reverting: ${opt.name}...`)

        try {
            let success = false
            if (opt.revertCommand) {
                const result = await window.ipcRenderer?.invoke('execute-powershell-command', opt.revertCommand)
                success = result?.success
                if (!success) addLog('ERROR', result?.error || 'Failed to execute revert command')
            } else if (opt.registryPath && opt.registryKey) {
                const result = await window.ipcRenderer?.invoke(
                    'set-registry-value',
                    opt.registryKey,
                    opt.registryPath,
                    defaultValue,
                    opt.registryType || 'REG_DWORD'
                )
                success = result?.success
            }

            if (success) {
                addLog('OPTIMIZER', `Reverted ${opt.name}`)
                await refreshOptimizations()
                return true
            }
        } catch (error) {
            addLog('ERROR', `Error reverting ${opt.name}`)
        }
        return false
    }

    const refreshOptimizations = async () => {
        await loadOptimizations()
    }

    const impactWeights = { 'High': 3, 'Medium': 2, 'Low': 1 }
    // Only count existing optimizations
    const existingOptimizations = optimizations.filter(opt => opt.exists !== false)
    const totalWeight = existingOptimizations.reduce((acc, opt) => acc + impactWeights[opt.impact], 0)
    const enabledWeight = existingOptimizations.reduce((acc, opt) =>
        acc + (opt.isEnabled ? impactWeights[opt.impact] : 0), 0
    )
    const optimizationScore = totalWeight > 0 ? Math.round((enabledWeight / totalWeight) * 100) : 0

    return (
        <OptimizationContext.Provider value={{
            optimizations,
            applyOptimization,
            revertOptimization,
            refreshOptimizations,
            optimizationScore,
            loading,
            systemRestoreStatus,
            checkSystemRestore,
            enableSystemRestore
        }}>
            {children}
        </OptimizationContext.Provider>
    )
}

function extractServiceName(command: string): string | null {
    const match = command.match(/["']([^"']+)["']/)
    return match ? match[1] : null
}

export function useOptimization() {
    const context = useContext(OptimizationContext)
    if (context === undefined) {
        throw new Error('useOptimization must be used within an OptimizationProvider')
    }
    return context
}
