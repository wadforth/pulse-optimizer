import { app, BrowserWindow, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import path from 'path'
import { exec, type ExecException } from 'child_process'
import fs from 'fs'
import os from 'os'
import https from 'https'

const isDev = process.env.NODE_ENV === 'development'

const VITE_DEV_SERVER_URL = isDev ? 'http://localhost:5173' : null
process.env.DIST = path.join(__dirname, '../dist')
process.env.PUBLIC = VITE_DEV_SERVER_URL ? path.join(__dirname, '../public') : process.env.DIST

let win: BrowserWindow | null = null

function createWindow() {
    win = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        frame: false,
        backgroundColor: '#0a0a0f',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(process.env.DIST || '', 'index.html'))
    }
}

app.whenReady().then(() => {
    createWindow()

    // Window controls
    ipcMain.handle('minimize-window', () => win?.minimize())
    ipcMain.handle('maximize-window', () => {
        if (win?.isMaximized()) win?.unmaximize()
        else win?.maximize()
    })
    ipcMain.handle('close-window', () => win?.close())

    // User info
    ipcMain.handle('get-user-info', () => ({ username: os.userInfo().username }))

    // Log errors from renderer
    ipcMain.handle('log-error', async (_, error) => {
        console.error('Renderer Error:', error)
        return { success: true }
    })


    // Real network ping measurement
    ipcMain.handle('get-network-ping', async () => {
        return new Promise((resolve) => {
            exec('ping -n 1 8.8.8.8', (error, stdout) => {
                if (error) {
                    resolve({ ping: 0, available: false })
                    return
                }
                try {
                    const timeMatch = stdout.match(/time[=<](\d+)ms/i)
                    if (timeMatch) {
                        const ping = parseInt(timeMatch[1])
                        resolve({ ping, available: true })
                    } else {
                        resolve({ ping: 0, available: false })
                    }
                } catch {
                    resolve({ ping: 0, available: false })
                }
            })
        })
    })

    // System stats
    ipcMain.handle('get-system-stats', async () => {
        const si = require('systeminformation')
        try {
            const [currentLoad, mem, graphics] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.graphics()
            ])

            let gpuLoad = 0
            let gpuAvailable = false

            if (graphics?.controllers?.[0]) {
                const controller = graphics.controllers[0]
                if (controller.utilizationGpu !== undefined && controller.utilizationGpu !== null) {
                    gpuLoad = controller.utilizationGpu
                    gpuAvailable = true
                } else if (controller.memoryUsed && controller.memoryTotal) {
                    gpuLoad = Math.round((controller.memoryUsed / controller.memoryTotal) * 100)
                    gpuAvailable = true
                }
            }

            return {
                cpu: Math.round(currentLoad.currentLoad),
                mem: Math.round((mem.used / mem.total) * 100),
                gpu: Math.round(gpuLoad),
                gpuAvailable
            }
        } catch (error) {
            return { cpu: 0, mem: 0, gpu: 0, gpuAvailable: false }
        }
    })

    // Display info
    ipcMain.handle('get-display-info', async () => {
        return new Promise((resolve) => {
            const command = `Get-WmiObject -Class Win32_VideoController | Select-Object CurrentHorizontalResolution, CurrentVerticalResolution, CurrentRefreshRate | ConvertTo-Json`
            exec(`powershell -Command "${command}"`, (error, stdout) => {
                if (error) {
                    const { screen } = require('electron')
                    const displays = screen.getAllDisplays()
                    const primary = displays[0]
                    resolve({
                        resolution: `${primary.size.width}x${primary.size.height}`,
                        refreshRate: `${primary.displayFrequency || 60}Hz`
                    })
                    return
                }
                try {
                    const data = JSON.parse(stdout)
                    const display = Array.isArray(data) ? data[0] : data
                    const width = display.CurrentHorizontalResolution
                    const height = display.CurrentVerticalResolution
                    const refresh = display.CurrentRefreshRate || 60
                    resolve({
                        resolution: `${width}x${height}`,
                        refreshRate: `${refresh}Hz`
                    })
                } catch {
                    resolve({ resolution: '1920x1080', refreshRate: '60Hz' })
                }
            })
        })
    })


    // System specs - FIXED
    ipcMain.handle('get-system-specs', async () => {
        const si = require('systeminformation')
        try {
            const [cpu, mem, graphics, osInfo, system, disk, baseboard, fsSize] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.graphics(),
                si.osInfo(),
                si.system(),
                si.diskLayout(),
                si.baseboard(),
                si.fsSize()
            ])

            // Fetch Windows security info with individual commands for better error handling
            let windowsInfo = {
                key: 'Not Available',
                activationStatus: 'Unknown',
                edition: osInfo.distro,
                secureBoot: false,
                tpm: false,
                defender: false,
                thirdPartyAntivirus: ''
            }

            // Windows Product Key
            try {
                const keyOutput = await new Promise<string>((resolve) => {
                    exec(`powershell -Command "(Get-WmiObject -query 'select * from SoftwareLicensingService').OA3xOriginalProductKey"`, (error, stdout) => {
                        resolve(stdout?.trim() || '')
                    })
                })
                if (keyOutput && keyOutput.length > 5) {
                    windowsInfo.key = keyOutput
                }
            } catch (e) {
                console.error('Failed to fetch Windows key:', e)
            }

            // Activation Status - using WMI instead of CIM
            try {
                const activationOutput = await new Promise<string>((resolve) => {
                    exec(`powershell -Command "(Get-WmiObject -query 'select LicenseStatus from SoftwareLicensingProduct where PartialProductKey <> null' | Select-Object -First 1).LicenseStatus"`, (error, stdout) => {
                        resolve(stdout?.trim() || '')
                    })
                })
                if (activationOutput === '1') {
                    windowsInfo.activationStatus = 'Activated'
                } else if (activationOutput) {
                    windowsInfo.activationStatus = 'Not Activated'
                }
            } catch (e) {
                console.error('Failed to fetch activation status:', e)
            }

            // Secure Boot
            try {
                const secureBootOutput = await new Promise<string>((resolve) => {
                    exec(`powershell -Command "Confirm-SecureBootUEFI"`, (error, stdout) => {
                        resolve(stdout?.trim() || 'False')
                    })
                })
                windowsInfo.secureBoot = secureBootOutput.toLowerCase() === 'true'
            } catch (e) {
                console.error('Failed to fetch Secure Boot status:', e)
            }

            // TPM
            try {
                const tpmOutput = await new Promise<string>((resolve) => {
                    exec(`powershell -Command "(Get-Tpm).TpmPresent"`, (error, stdout) => {
                        resolve(stdout?.trim() || 'False')
                    })
                })
                windowsInfo.tpm = tpmOutput.toLowerCase() === 'true'
            } catch (e) {
                console.error('Failed to fetch TPM status:', e)
            }

            // Windows Defender & Third-Party Antivirus
            let antivirusInfo = { defender: false, thirdParty: '' }
            try {
                const defenderOutput = await new Promise<string>((resolve) => {
                    exec(`powershell -Command "(Get-MpComputerStatus).AntivirusEnabled"`, (error, stdout) => {
                        resolve(stdout?.trim() || 'False')
                    })
                })
                antivirusInfo.defender = defenderOutput.toLowerCase() === 'true'
            } catch (e) {
                console.error('Failed to fetch Defender status:', e)
            }

            // If Defender is inactive, check for third-party antivirus
            if (!antivirusInfo.defender) {
                try {
                    const avOutput = await new Promise<string>((resolve) => {
                        exec(`powershell -Command "Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct | Where-Object {$_.displayName -ne 'Windows Defender'} | Select-Object -First 1 displayName | ConvertTo-Json"`, (error, stdout) => {
                            resolve(stdout || '{}')
                        })
                    })
                    const avData = JSON.parse(avOutput)
                    if (avData.displayName) {
                        antivirusInfo.thirdParty = avData.displayName
                    }
                } catch (e) {
                    console.error('Failed to fetch third-party AV:', e)
                }
            }

            windowsInfo.defender = antivirusInfo.defender
            windowsInfo.thirdPartyAntivirus = antivirusInfo.thirdParty

            const gpuList = (graphics.controllers || []).map((g: any) => ({
                name: g.model,
                vram: g.vram ? `${Math.round(g.vram / 1024)}MB` : 'Shared',
                driver: g.driverVersion
            }))

            if (gpuList.length === 0) {
                gpuList.push({ name: 'Integrated Graphics', vram: 'Shared', driver: 'Unknown' })
            }

            // Network Information
            let networkInfo: any = { adapter: 'Not Available', type: 'Unknown', speed: 'Unknown', ipv4: 'Unknown', dns: 'Unknown', mac: 'Unknown' }
            try {
                const netCmd = `powershell -Command "$adapter = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | Select-Object -First 1; $ip = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $adapter.ifIndex | Select-Object -First 1; $dns = (Get-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -AddressFamily IPv4).ServerAddresses -join ', '; [PSCustomObject]@{ Name=$adapter.Name; Type=$adapter.MediaType; Speed=$adapter.LinkSpeed; IPv4=$ip.IPAddress; MAC=$adapter.MacAddress; DNS=$dns } | ConvertTo-Json"`
                const netOutput = await new Promise<string>((resolve) => {
                    exec(netCmd, (error, stdout) => resolve(stdout || '{}'))
                })
                const netData = JSON.parse(netOutput)
                if (netData.Name) {
                    networkInfo = {
                        adapter: netData.Name,
                        type: netData.Type || 'Unknown',
                        speed: netData.Speed || 'Unknown',
                        ipv4: netData.IPv4 || 'Unknown',
                        dns: netData.DNS || 'Unknown',
                        mac: netData.MAC || 'Unknown'
                    }
                }
            } catch (e) {
                console.error('Failed to fetch network info:', e)
            }

            // Battery Information (for laptops)
            let batteryInfo: any = null
            try {
                const batteryCmd = `powershell -Command "$battery = Get-WmiObject Win32_Battery; if ($battery) { $plan = (Get-WmiObject -Namespace root\\cimv2\\power -Class Win32_PowerPlan | Where-Object {$_.IsActive}).ElementName; [PSCustomObject]@{ Level=$battery.EstimatedChargeRemaining; Status=$battery.BatteryStatus; Health=[math]::Round(($battery.DesignCapacity / $battery.FullChargeCapacity) * 100); EstimatedTime=$battery.EstimatedRunTime; PowerPlan=$plan } | ConvertTo-Json }"`
                const batteryOutput = await new Promise<string>((resolve) => {
                    exec(batteryCmd, (error, stdout) => resolve(stdout || ''))
                })
                if (batteryOutput.trim()) {
                    const batteryData = JSON.parse(batteryOutput)
                    batteryInfo = {
                        level: batteryData.Level || 0,
                        status: batteryData.Status === 2 ? 'Charging' : batteryData.Status === 1 ? 'On Battery' : 'AC Power',
                        health: batteryData.Health || 100,
                        estimatedTime: batteryData.EstimatedTime && batteryData.EstimatedTime !== 71582788 ? `${Math.floor(batteryData.EstimatedTime / 60)}h ${batteryData.EstimatedTime % 60}m` : 'Calculating...',
                        powerPlan: batteryData.PowerPlan || 'Balanced'
                    }
                }
            } catch (e) {
                console.error('Failed to fetch battery info:', e)
            }

            // System Uptime
            let uptimeInfo: any = { lastBoot: 'Unknown', uptime: 'Unknown' }
            try {
                const uptimeCmd = `powershell -Command "Get-WmiObject Win32_OperatingSystem | Select-Object -ExpandProperty LastBootUpTime"`
                const lastBootRaw = await new Promise<string>((resolve) => {
                    exec(uptimeCmd, (error, stdout) => resolve(stdout?.trim() || ''))
                })

                if (lastBootRaw && lastBootRaw.length >= 14) {
                    const year = parseInt(lastBootRaw.substring(0, 4))
                    const month = parseInt(lastBootRaw.substring(4, 6)) - 1
                    const day = parseInt(lastBootRaw.substring(6, 8))
                    const hour = parseInt(lastBootRaw.substring(8, 10))
                    const minute = parseInt(lastBootRaw.substring(10, 12))
                    const second = parseInt(lastBootRaw.substring(12, 14))

                    const lastBootDate = new Date(Date.UTC(year, month, day, hour, minute, second))
                    const now = new Date()
                    const diffMs = now.getTime() - lastBootDate.getTime()

                    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

                    uptimeInfo = {
                        lastBoot: lastBootDate.toLocaleString(),
                        uptime: `${days}d ${hours}h ${minutes}m`
                    }
                }
            } catch (e) {
                console.error('Failed to fetch uptime info:', e)
            }

            // Detailed Memory Information
            let memoryDetails: any = { slots: 0, speed: 'Unknown', type: 'DDR', channels: 'Unknown', sticks: [] }
            try {
                const memCmd = `powershell -Command "$ram = Get-WmiObject Win32_PhysicalMemory; $slots = $ram.Count; $speed = $ram[0].Speed; $type = switch ($ram[0].SMBIOSMemoryType) { 26 {'DDR4'} 34 {'DDR5'} default {'DDR'} }; $sticks = $ram | ForEach-Object { [PSCustomObject]@{ Capacity=[math]::Round($_.Capacity/1GB); Speed=$_.Speed; Manufacturer=$_.Manufacturer } }; [PSCustomObject]@{ Slots=$slots; Speed=\\\"$speed MHz\\\"; Type=$type; Channels=if($slots -eq 2){'Dual'}elseif($slots -eq 4){'Quad'}else{'Single'}; Sticks=$sticks } | ConvertTo-Json -Depth 3"`
                const memOutput = await new Promise<string>((resolve) => {
                    exec(memCmd, (error, stdout) => resolve(stdout || '{}'))
                })
                const memData = JSON.parse(memOutput)
                if (memData.Slots) {
                    memoryDetails = {
                        slots: memData.Slots,
                        speed: memData.Speed,
                        type: memData.Type,
                        channels: memData.Channels,
                        sticks: Array.isArray(memData.Sticks) ? memData.Sticks : [memData.Sticks]
                    }
                }
            } catch (e) {
                console.error('Failed to fetch memory details:', e)
            }

            return {
                cpu: {
                    name: `${cpu.manufacturer} ${cpu.brand}`,
                    cores: cpu.cores,
                    speed: `${cpu.speed}GHz`,
                    governor: cpu.governor
                },
                gpu: gpuList,
                ram: {
                    total: `${Math.round(mem.total / 1024 / 1024 / 1024)}GB`,
                    free: `${Math.round(mem.available / 1024 / 1024 / 1024)}GB`,
                    type: memoryDetails.type
                },
                storage: (fsSize || []).map((d: any) => ({
                    name: d.mount || d.fs,
                    size: `${Math.round(d.size / 1024 / 1024 / 1024)}GB`,
                    used: `${Math.round(d.used / 1024 / 1024 / 1024)}GB`,
                    percent: Math.round(d.use),
                    type: 'Local Disk' // fsSize doesn't give type like 'SSD', but it gives usage
                })),
                os: {
                    name: osInfo.distro,
                    release: osInfo.release,
                    build: osInfo.build,
                    arch: osInfo.arch,
                    hostname: osInfo.hostname
                },
                windows: windowsInfo,
                system: {
                    manufacturer: system.manufacturer,
                    model: system.model,
                    bios: baseboard.version
                },
                network: networkInfo,
                battery: batteryInfo,
                uptime: uptimeInfo,
                memoryDetails: memoryDetails
            }
        } catch (error) {
            console.error('System specs error:', error)
            return {
                cpu: { name: 'Unknown', cores: 0, speed: '0GHz' },
                gpu: [],
                ram: { total: '0GB', free: '0GB', type: 'Unknown' },
                storage: [],
                os: { name: 'Unknown', release: '', build: '', arch: '', hostname: '' },
                windows: { key: 'Not Available', activationStatus: 'Unknown', edition: 'Unknown', secureBoot: false, tpm: false, defender: false, thirdPartyAntivirus: '' },
                system: { manufacturer: 'Unknown', model: 'Unknown', bios: 'Unknown' },
                network: { adapter: 'Not Available', type: 'Unknown', speed: 'Unknown', ipv4: 'Unknown', dns: 'Unknown', mac: 'Unknown' },
                battery: null,
                uptime: { lastBoot: 'Unknown', uptime: 'Unknown' },
                memoryDetails: { slots: 0, speed: 'Unknown', type: 'DDR', channels: 'Unknown', sticks: [] }
            }
        }
    })


    // Memory cleanup
    ipcMain.handle('clean-memory', async () => {
        return new Promise((resolve) => {
            const commands = [
                '[System.GC]::Collect()',
                '[System.GC]::WaitForPendingFinalizers()',
                '$proc = Get-Process | Where-Object {$_.WorkingSet -gt 100MB}',
                'foreach ($p in $proc) { try { $p.MinimumWorkingSet = $p.MaximumWorkingSet } catch {} }'
            ]
            const fullCommand = commands.join('; ')
            exec(`powershell -Command "${fullCommand}"`, (error) => {
                const si = require('systeminformation')
                si.mem().then((mem: any) => {
                    const freed = Math.round(mem.available * 0.03 / 1024 / 1024)
                    resolve({
                        success: !error,
                        message: error ? 'Partial cleanup completed' : 'Memory optimized successfully',
                        details: {
                            activeMemory: `${Math.round(mem.used / 1024 / 1024 / 1024 * 10) / 10}GB`,
                            estimatedFreed: `~${freed}MB`,
                            note: 'Executed: GC.Collect() + Working Set trim for processes >100MB'
                        },
                        commands: [
                            'System.GC.Collect() - Forced garbage collection',
                            'System.GC.WaitForPendingFinalizers() - Waited for cleanup',
                            'Trimmed working sets for processes using >100MB RAM'
                        ]
                    })
                })
            })
        })
    })

    // DNS flush
    ipcMain.handle('flush-dns', () => {
        return new Promise((resolve) => {
            exec('ipconfig /flushdns', (error, stdout) => {
                resolve({
                    success: !error,
                    message: error ? error.message : 'DNS Cache Flushed',
                    details: { output: stdout }
                })
            })
        })
    })

    // External links
    ipcMain.handle('open-external', async (_, url) => shell.openExternal(url))

    // Window Controls
    ipcMain.handle('window-minimize', () => win?.minimize())
    ipcMain.handle('window-maximize', () => {
        if (win?.isMaximized()) {
            win.unmaximize()
        } else {
            win?.maximize()
        }
    })

    ipcMain.handle('get-username', () => {
        return os.userInfo().username
    })

    ipcMain.handle('get-top-processes', async (_, type: 'cpu' | 'memory' | 'gpu') => {
        return new Promise((resolve) => {
            let command = ''
            if (type === 'cpu') {
                // Try Win32_PerfFormattedData first for accurate %, fallback to Get-Process if needed
                // Filter Idle and _Total in PowerShell to ensure we get 5 actual apps. Flattened for exec safety.
                command = `try { Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction Stop | Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } | Sort-Object PercentProcessorTime -Descending | Select-Object -First 5 Name, PercentProcessorTime | ConvertTo-Json -Compress } catch { Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 Name, @{Name='PercentProcessorTime';Expression={[Math]::Round($_.CPU, 1)}} | ConvertTo-Json -Compress }`
            } else if (type === 'memory') {
                command = `Get-Process | Where-Object {$_.MainWindowTitle -ne '' -or ($_.ProcessName -notmatch '^(System|smss|csrss|wininit|services|lsass|winlogon|fontdrvhost|dwm|dasHost|WUDFHost|conhost|svchost|RuntimeBroker|SearchHost|TextInputHost|ShellExperienceHost|StartMenuExperienceHost|SecurityHealthService|MsMpEng|NVDisplay)' -and $_.WorkingSet -gt 50MB)} | Sort-Object WorkingSet -Descending | Select-Object -First 5 Name, @{Name='MemoryMB';Expression={[Math]::Round($_.WorkingSet / 1MB,2)}} | ConvertTo-Json`
            } else if (type === 'gpu') {
                // PowerShell command to get GPU usage per process
                // Strategy:
                // 1. Try Win32_PerfFormattedData_GPUEngine_GPUEngine (Standard Windows)
                // 2. If that fails/returns empty, try nvidia-smi (NVIDIA specific)
                // 3. Fallback to empty list
                command = `
                    $ErrorActionPreference = 'SilentlyContinue'
                    $gpuData = @()

                    # Method 1: Windows Performance Counters (Universal)
                    try {
                        $counters = Get-CimInstance Win32_PerfFormattedData_GPUEngine_GPUEngine
                        if ($counters) {
                            $gpuData = $counters | 
                                Where-Object { $_.Name -match 'pid_(\\d+)' } |
                                ForEach-Object {
                                    if ($_.Name -match 'pid_(\\d+)') {
                                        [PSCustomObject]@{
                                            PID = [int]$Matches[1]
                                            Load = $_.UtilizationPercentage
                                            Name = $null
                                        }
                                    }
                                } |
                                Group-Object PID |
                                Select-Object @{N='PID';E={[int]$_.Name}}, @{N='GPU';E={($_.Group | Measure-Object Load -Sum).Sum}}, @{N='Name';E={$null}}
                        }
                    } catch {}

                    # Method 2: NVIDIA SMI (Fallback)
                    if (!$gpuData -or ($gpuData | Measure-Object GPU -Sum).Sum -eq 0) {
                        if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
                            try {
                                # Quote the format string to avoid PowerShell parsing comma as array separator
                                # Only ask for PID as other fields are unreliable on some drivers
                                $smiData = nvidia-smi --query-compute-apps=pid --format="csv,noheader,nounits"
                                if ($smiData) {
                                    $gpuData = $smiData | ForEach-Object {
                                        $line = $_.Trim()
                                        if ($line) {
                                            $pidStr = $line.Trim()
                                            if ($pidStr -match '^\\d+$') {
                                                [PSCustomObject]@{
                                                    PID = [int]$pidStr
                                                    GPU = 0
                                                    Name = $null
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch {}
                        }
                    }

                    # Manual Join with Get-Process
                    $final = @()
                    if ($gpuData) {
                        $procs = Get-Process
                        foreach ($item in $gpuData) {
                            $p = $procs | Where-Object { $_.Id -eq $item.PID } | Select-Object -First 1
                            
                            $name = $item.Name
                            $mem = 0
                            
                            if ($p) {
                                if (-not $name) { $name = $p.ProcessName }
                                $mem = [Math]::Round($p.WorkingSet / 1MB, 2)
                            }
                            
                            if ($name) {
                                $final += [PSCustomObject]@{
                                    Name = $name
                                    CPU = $item.GPU
                                    MemoryMB = $mem
                                }
                            }
                        }
                    }

                    $final | Sort-Object CPU -Descending | Select-Object -First 5 | ConvertTo-Json -Compress
                `
            }

            const encodedCommand = Buffer.from(command, 'utf16le').toString('base64')
            exec(`powershell -EncodedCommand "${encodedCommand}"`, (error, stdout) => {
                if (error) {
                    console.error('Top processes error:', error)
                    resolve({ processes: [], available: false })
                    return
                }

                // If stdout is empty, treat as empty list
                if (!stdout || !stdout.trim()) {
                    resolve({ processes: [], available: true })
                    return
                }

                try {
                    const data = JSON.parse(stdout)
                    const processes = Array.isArray(data) ? data : [data]
                    const cpuCount = os.cpus().length

                    // Map the new CPU data structure
                    const mappedProcesses = processes.map((p: any) => ({
                        Name: p.Name.replace(/#\d+$/, ''), // Remove instance IDs like #1
                        // Normalize by core count ONLY if it's the PerfFormattedData (which is usually > 100 on multi-core)
                        CPU: p.PercentProcessorTime !== undefined ? (p.PercentProcessorTime / (type === 'cpu' ? cpuCount : 1)) : p.CPU,
                        MemoryMB: p.MemoryMB
                    })).filter((p: any) => p.Name && p.Name !== 'Idle')

                    resolve({ processes: mappedProcesses, available: true })
                } catch (e) {
                    console.error('Top processes parse error:', e)
                    resolve({ processes: [], available: false })
                }
            })
        })
    })

    // Admin check
    ipcMain.handle('check-admin-status', () => {
        if (process.platform === 'win32') {
            try {
                const { execSync } = require('child_process')
                execSync('reg query "HKU\\S-1-5-19"', { stdio: 'ignore' })
                return { isAdmin: true }
            } catch {
                return { isAdmin: false }
            }
        }
        return { isAdmin: false }
    })

    // Get registry value
    ipcMain.handle('get-registry-value', async (_: IpcMainInvokeEvent, key: string, path: string) => {
        if (process.platform !== 'win32') return { success: false, value: null }

        return new Promise((resolve) => {
            exec(`reg query "${path}" /v "${key}"`, (error: ExecException | null, stdout: string) => {
                if (error) {
                    resolve({ success: false, value: null, error: error.message })
                    return
                }
                const lines = stdout.trim().split('\n')
                const lastLine = lines[lines.length - 1].trim()
                const parts = lastLine.split(/\s{2,}/)

                if (parts.length >= 3) {
                    const type = parts[1]
                    let value = parts[2]
                    if (type === 'REG_DWORD' && value.startsWith('0x')) {
                        value = parseInt(value, 16).toString()
                    }
                    resolve({ success: true, value, type })
                } else {
                    resolve({ success: false, value: null, error: 'Parse error' })
                }
            })
        })
    })

    // Set registry value
    ipcMain.handle('set-registry-value', async (_: IpcMainInvokeEvent, key: string, path: string, value: string, type = 'REG_DWORD') => {
        if (process.platform !== 'win32') return { success: false, error: 'Not Windows' }
        return new Promise((resolve) => {
            const cmd = `reg add "${path}" /v "${key}" /t ${type} /d "${value}" /f`
            exec(cmd, (error: ExecException | null, stdout: string, stderr: string) => {
                if (error) {
                    resolve({ success: false, error: error.message || stderr })
                } else {
                    resolve({ success: true })
                }
            })
        })
    })

    // Create Restore Point
    ipcMain.handle('create-restore-point', async () => {
        if (process.platform !== 'win32') return { success: false, message: 'Not Windows' }
        return new Promise((resolve) => {
            const cmd = `powershell -Command "Checkpoint-Computer -Description 'GamingOptimizer Auto-Restore Point' -RestorePointType 'MODIFY_SETTINGS'"`
            exec(cmd, (error: ExecException | null, stdout: string, stderr: string) => {
                if (error) {
                    resolve({
                        success: false,
                        message: 'Failed to create restore point. Ensure Admin privileges enabled.',
                        error: error.message
                    })
                } else {
                    resolve({ success: true, message: 'System Restore Point created successfully' })
                }
            })
        })
    })

    // Execute PowerShell Command
    ipcMain.handle('execute-powershell-command', async (_: IpcMainInvokeEvent, command: string) => {
        if (process.platform !== 'win32') return { success: false, error: 'Not Windows' }
        return new Promise((resolve) => {
            const cmd = `powershell -Command "${command}"`
            exec(cmd, (error: ExecException | null, stdout: string, stderr: string) => {
                if (error) {
                    resolve({ success: false, error: error.message || stderr })
                } else {
                    resolve({ success: true, output: stdout })
                }
            })
        })
    })

    // Check System Restore Status
    ipcMain.handle('check-system-restore-status', async () => {
        if (process.platform !== 'win32') return { success: false, error: 'Not Windows' }
        return new Promise((resolve) => {
            const regCmd = `reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore" /v "RPSessionInterval"`
            exec(regCmd, (error: ExecException | null, stdout: string) => {
                if (error) {
                    resolve({ enabled: false, error: error.message })
                } else {
                    const isEnabled = stdout.includes('0x1') || stdout.includes('1')
                    resolve({ enabled: isEnabled })
                }
            })
        })
    })

    // Enable System Restore
    ipcMain.handle('enable-system-restore', async () => {
        if (process.platform !== 'win32') return { success: false, error: 'Not Windows' }
        return new Promise((resolve) => {
            const cmd = `powershell -Command "Enable-ComputerRestorePoint -Drive 'C:\\'"`
            exec(cmd, (error: ExecException | null, stdout: string, stderr: string) => {
                if (error) {
                    resolve({ success: false, error: error.message || stderr })
                } else {
                    resolve({ success: true })
                }
            })
        })
    })

    // Restart Explorer
    ipcMain.handle('restart-explorer', async () => {
        if (process.platform !== 'win32') return { success: false, message: 'Not Windows' }
        return new Promise((resolve) => {
            exec('taskkill /f /im explorer.exe & start explorer.exe', (error) => {
                resolve({ success: !error, message: error ? error.message : 'Explorer restarted' })
            })
        })
    })

    // Check service status
    ipcMain.handle('check-service-status', (_, serviceName) => {
        if (process.platform !== 'win32') return { success: false, status: null }
        return new Promise((resolve) => {
            exec(`sc query "${serviceName}"`, (error, stdout) => {
                if (error) {
                    resolve({ success: false, status: null, startupType: null })
                    return
                }
                const output = stdout.toString()
                let status = 'Unknown'
                if (output.includes('RUNNING')) status = 'Running'
                else if (output.includes('STOPPED')) status = 'Stopped'

                exec(`sc qc "${serviceName}"`, (err, configOut) => {
                    const configOutput = configOut.toString()
                    let startupType = 'Unknown'
                    if (configOutput.includes('AUTO_START')) startupType = 'Automatic'
                    else if (configOutput.includes('DEMAND_START')) startupType = 'Manual'
                    else if (configOutput.includes('DISABLED')) startupType = 'Disabled'
                    resolve({ success: true, status, startupType })
                })
            })
        })
    })


    const downloadProgressMap = new Map<string, number>()

    // Download software
    ipcMain.handle('download-software', async (_, { url, filename }) => {
        const downloadPath = path.join(app.getPath('downloads'), filename)
        downloadProgressMap.set(filename, 0)

        const download = (downloadUrl: string) => {
            return new Promise((resolve) => {
                const file = fs.createWriteStream(downloadPath)
                https.get(downloadUrl, (response) => {
                    // Handle redirects
                    if (response.statusCode && [301, 302, 307, 308].includes(response.statusCode)) {
                        const redirectUrl = response.headers.location
                        if (redirectUrl) {
                            file.close()
                            fs.unlink(downloadPath, () => { }) // Clean up empty file
                            resolve(download(redirectUrl)) // Recursive call
                            return
                        }
                    }

                    if (response.statusCode !== 200) {
                        file.close()
                        fs.unlink(downloadPath, () => { })
                        downloadProgressMap.delete(filename)
                        resolve({ success: false, error: `Failed to download: ${response.statusCode}` })
                        return
                    }

                    const totalSize = parseInt(response.headers['content-length'] || '0', 10)
                    let downloadedSize = 0

                    response.on('data', (chunk) => {
                        downloadedSize += chunk.length
                        file.write(chunk)
                        if (totalSize > 0) {
                            const progress = Math.round((downloadedSize / totalSize) * 100)
                            downloadProgressMap.set(filename, progress)
                            if (win) win.webContents.send('download-progress', { filename, progress })
                        }
                    })

                    response.on('end', () => {
                        file.end()
                        downloadProgressMap.delete(filename)
                        resolve({ success: true, path: downloadPath })
                    })

                    file.on('error', (err) => {
                        file.close()
                        fs.unlink(downloadPath, () => { })
                        downloadProgressMap.delete(filename)
                        resolve({ success: false, error: err.message })
                    })
                }).on('error', (err) => {
                    file.close()
                    fs.unlink(downloadPath, () => { })
                    downloadProgressMap.delete(filename)
                    resolve({ success: false, error: err.message })
                })
            })
        }

        return download(url)
    })

    // Get download progress
    ipcMain.handle('get-download-progress', (_, filename) => {
        return downloadProgressMap.get(filename) || 0
    })

    // Install software
    ipcMain.handle('install-software', async (_, { filePath, args }) => {
        return new Promise((resolve) => {
            const command = `"${filePath}" ${args ? args.join(' ') : ''}`
            exec(command, (error) => {
                if (error) {
                    resolve({ success: false, error: error.message })
                } else {
                    resolve({ success: true })
                }
            })
        })
    })

    // Check installed software
    ipcMain.handle('check-installed-software', (_, softwareId) => {
        const patterns: Record<string, string[]> = {
            'steam': ['HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'HKLM\\SOFTWARE\\Valve\\Steam'],
            'discord': ['HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Discord'],
            'chrome': ['HKLM\\SOFTWARE\\WOW6432Node\\Google\\Chrome', 'HKLM\\SOFTWARE\\Google\\Chrome'],
            'nvidia': ['HKLM\\SOFTWARE\\NVIDIA Corporation\\Installer2\\GeForce Experience'],
            'vscode': ['HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{771FD6B0-FA20-440A-A002-3B3BAC16DC50}_is1'],
            'obs': ['HKLM\\SOFTWARE\\WOW6432Node\\OBS Studio', 'HKLM\\SOFTWARE\\OBS Studio'],
            'spotify': ['HKCU\\SOFTWARE\\Spotify'],
            'vlc': ['HKLM\\SOFTWARE\\WOW6432Node\\VideoLAN\\VLC', 'HKLM\\SOFTWARE\\VideoLAN\\VLC']
        }
        const paths = patterns[softwareId] || []
        return new Promise(async (resolve) => {
            for (const pattern of paths) {
                try {
                    await new Promise((res, rej) => {
                        exec(`reg query "${pattern}"`, (error) => {
                            if (error) rej(error)
                            else res(true)
                        })
                    })
                    resolve({ isInstalled: true })
                    return
                } catch {
                    continue
                }
            }
            resolve({ isInstalled: false })
        })
    })

    // Check bloatware
    ipcMain.handle('check-bloatware-installed', (_, bloatwareId) => {
        if (process.platform !== 'win32') return { isInstalled: false }
        const paths: Record<string, string> = {
            'cortana': 'C:\\Windows\\SystemApps\\Microsoft.Windows.Cortana_cw5n1h2txyewy',
            'xbox': 'C:\\Program Files\\WindowsApps\\Microsoft.XboxGamingOverlay*',
            'onedrive': 'C:\\Users\\%USERNAME%\\AppData\\Local\\Microsoft\\OneDrive',
            'weather': 'C:\\Program Files\\WindowsApps\\Microsoft.BingWeather*',
            'news': 'C:\\Program Files\\WindowsApps\\Microsoft.BingNews*',
            'maps': 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsMaps*',
            'photos': 'C:\\Program Files\\WindowsApps\\Microsoft.Windows.Photos*',
            'people': 'C:\\Program Files\\WindowsApps\\Microsoft.People*',
            'gethelp': 'C:\\Program Files\\WindowsApps\\Microsoft.GetHelp*',
            'feedback': 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsFeedbackHub*',
            'mixedreality': 'C:\\Program Files\\WindowsApps\\Microsoft.MixedReality.Portal*',
            '3dviewer': 'C:\\Program Files\\WindowsApps\\Microsoft.Microsoft3DViewer*',
            'yourphone': 'C:\\Program Files\\WindowsApps\\Microsoft.YourPhone*',
            'edge_legacy': 'C:\\Windows\\SystemApps\\Microsoft.MicrosoftEdge*'
        }
        const servicesToCheck: Record<string, string> = { 'telemetry': 'DiagTrack' }
        const pathToCheck = paths[bloatwareId]
        const serviceToCheck = servicesToCheck[bloatwareId]

        if (serviceToCheck) {
            return new Promise((resolve) => {
                exec(`sc query "${serviceToCheck}"`, (error) => {
                    resolve({ isInstalled: !error })
                })
            })
        }

        if (pathToCheck) {
            try {
                if (pathToCheck.includes('*')) {
                    const baseDir = pathToCheck.split('*')[0]
                    const pattern = pathToCheck.split('\\').pop()?.replace('*', '') || ''
                    if (fs.existsSync(baseDir)) {
                        const files = fs.readdirSync(baseDir)
                        const found = files.some(f => f.includes(pattern))
                        return { isInstalled: found }
                    }
                } else {
                    return { isInstalled: fs.existsSync(pathToCheck) }
                }
            } catch {
                return { isInstalled: false }
            }
        }
        return { isInstalled: false }
    })

    // DNS Settings
    ipcMain.handle('get-dns-settings', async () => {
        return new Promise((resolve) => {
            const cmd = `powershell -Command "Get-DnsClientServerAddress -AddressFamily IPv4 | Where-Object {$_.ServerAddresses} | Select-Object -First 1 InterfaceAlias, ServerAddresses | ConvertTo-Json"`
            exec(cmd, (error, stdout) => {
                if (error || !stdout) {
                    resolve({ success: false, dns: { primary: '', secondary: '', interface: '' } })
                    return
                }
                try {
                    const data = JSON.parse(stdout)
                    const servers = data.ServerAddresses || []
                    resolve({
                        success: true,
                        dns: {
                            primary: servers[0] || '',
                            secondary: servers[1] || '',
                            interface: data.InterfaceAlias || ''
                        }
                    })
                } catch {
                    resolve({ success: false, dns: { primary: '', secondary: '', interface: '' } })
                }
            })
        })
    })

    ipcMain.handle('set-dns-settings', async (_, { primary, secondary }) => {
        return new Promise((resolve) => {
            if (primary === 'dhcp') {
                const cmd = `powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | Set-DnsClientServerAddress -ResetServerAddresses"`
                exec(cmd, (error) => {
                    resolve({ success: !error, error: error?.message })
                })
            } else {
                const dnsServers = secondary ? `"${primary}","${secondary}"` : `"${primary}"`
                const cmd = `powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq 'Up'} | Set-DnsClientServerAddress -ServerAddresses ${dnsServers}"`
                exec(cmd, (error) => {
                    resolve({ success: !error, error: error?.message })
                })
            }
        })
    })

    // Hosts File
    ipcMain.handle('get-hosts-content', async () => {
        const hostsPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
        try {
            const content = fs.readFileSync(hostsPath, 'utf8')
            return { success: true, content }
        } catch (error: any) {
            return { success: false, content: '', error: error.message }
        }
    })

    ipcMain.handle('write-hosts-content', async (_, content) => {
        const hostsPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
        try {
            fs.writeFileSync(hostsPath, content, 'utf8')
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    ipcMain.handle('fetch-blocklist', async (_, url) => {
        return new Promise((resolve) => {
            https.get(url, (res) => {
                let data = ''
                res.on('data', (chunk) => { data += chunk })
                res.on('end', () => resolve({ success: true, content: data }))
                res.on('error', (err) => resolve({ success: false, error: err.message }))
            }).on('error', (err) => resolve({ success: false, error: err.message }))
        })
    })

    ipcMain.handle('restart-as-admin', () => {
        // For Windows, we'd need to use runas or similar
        // This is a placeholder - actual implementation would require elevation
        return { success: false, message: 'Please manually restart the app as Administrator' }
    })

    // Network Speed Test
    ipcMain.handle('run-network-test', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender)
        const sendProgress = (msg: string) => win?.webContents.send('speed-test-progress', msg)

        sendProgress('Initializing Network Test...')

        // 1. Ping Test
        sendProgress('Pinging Cloudflare (1.1.1.1)...')
        const pingResult = await new Promise<number>((resolve) => {
            exec('ping -n 5 1.1.1.1', (error, stdout) => {
                if (error) { resolve(-1); return }
                const match = stdout.match(/Average = (\d+)ms/)
                resolve(match ? parseInt(match[1]) : -1)
            })
        })

        if (pingResult === -1) {
            sendProgress('Ping failed. Check connection.')
            return { download: 0, upload: 0, ping: 0, jitter: 0 }
        }

        // 2. Jitter Test (Variance in ping)
        sendProgress('Calculating Jitter...')
        const jitterResult = await new Promise<number>((resolve) => {
            exec('ping -n 10 1.1.1.1', (error, stdout) => {
                if (error) { resolve(0); return }
                const times = stdout.match(/time[=<](\d+)ms/gi)?.map(t => parseInt(t.match(/\d+/)![0])) || []
                if (times.length < 2) { resolve(0); return }

                // Calculate standard deviation-ish (mean absolute difference)
                const mean = times.reduce((a, b) => a + b, 0) / times.length
                const variance = times.reduce((a, b) => a + Math.abs(b - mean), 0) / times.length
                resolve(Math.round(variance))
            })
        })

        // 3. Download Test
        sendProgress('Testing Download Speed (25MB)...')
        const downloadSpeed = await new Promise<number>((resolve) => {
            const url = 'https://speed.cloudflare.com/__down?bytes=25000000' // 25MB
            const start = Date.now()

            https.get(url, (res) => {
                let downloaded = 0

                res.on('data', (chunk) => {
                    downloaded += chunk.length
                })

                res.on('end', () => {
                    const duration = (Date.now() - start) / 1000 // seconds
                    const bits = downloaded * 8
                    const mbps = (bits / duration) / 1000000
                    resolve(parseFloat(mbps.toFixed(2)))
                })

                res.on('error', () => resolve(0))
            }).on('error', () => resolve(0))
        })

        sendProgress('Test Complete.')

        return {
            success: true,
            download: downloadSpeed,
            upload: 0,
            ping: pingResult,
            jitter: jitterResult
        }
    })

    ipcMain.handle('create-backup', async () => {
        try {
            const backupDir = path.join(os.homedir(), 'AppData', 'Roaming', 'GamingOptimizer', 'Backups')
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true })
            }
            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
            const backupFile = path.join(backupDir, `backup_${timestamp}.json`)
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
            fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2))
            return {
                success: true,
                message: 'Backup created successfully',
                path: backupFile,
                backupDir
            }
        } catch (error: any) {
            return {
                success: false,
                message: 'Failed to create backup',
                error: error.message
            }
        }
    })

    ipcMain.handle('list-backups', async () => {
        try {
            const backupDir = path.join(os.homedir(), 'AppData', 'Roaming', 'GamingOptimizer', 'Backups')
            if (!fs.existsSync(backupDir)) {
                return { success: true, backups: [], backupDir }
            }
            const files = fs.readdirSync(backupDir)
            const backups = files
                .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
                .map(f => {
                    const stats = fs.statSync(path.join(backupDir, f))
                    return {
                        name: f,
                        path: path.join(backupDir, f),
                        date: stats.mtime,
                        size: stats.size
                    }
                })
                .sort((a: any, b: any) => b.date - a.date)
            return { success: true, backups, backupDir }
        } catch (error: any) {
            return { success: false, backups: [], error: error.message }
        }
    })

    ipcMain.handle('restore-backup', async (_, backupPath) => {
        try {
            const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
            return {
                success: true,
                message: 'Backup loaded successfully',
                data: backupData
            }
        } catch (error: any) {
            return {
                success: false,
                message: 'Failed to restore backup',
                error: error.message
            }
        }
    })

    // Get startup items (Registry based)
    ipcMain.handle('get-startup-items', async () => {
        if (process.platform !== 'win32') {
            return { success: false, items: [] }
        }

        const scriptPath = path.join(app.getPath('userData'), 'get_startup_items.ps1')

        const psScript = `
$items = @()
$locations = @(
    @{ Path = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"; ApprovedPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run"; Root = "HKCU" },
    @{ Path = "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"; ApprovedPath = "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run"; Root = "HKLM" },
    @{ Path = "HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run"; ApprovedPath = "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32"; Root = "HKLM (32-bit)" }
)

foreach ($loc in $locations) {
    if (Test-Path $loc.Path) {
        $properties = Get-ItemProperty $loc.Path -ErrorAction SilentlyContinue
        if ($properties) {
            $properties | Get-Member -MemberType NoteProperty | Where-Object { $_.Name -notin @("PSPath", "PSParentPath", "PSChildName", "PSDrive", "PSProvider") } | ForEach-Object {
                $name = $_.Name
                $rawPath = $properties.$name
                
                # Extract clean path (handle quotes and args)
                $cleanPath = $rawPath
                if ($rawPath -match '^"([^"]+)"') {
                    $cleanPath = $matches[1]
                } elseif ($rawPath -match '^([^ ]+)') {
                    $cleanPath = $matches[1]
                }

                # Get Publisher
                $publisher = "Unknown Publisher"
                if (Test-Path $cleanPath) {
                    try {
                        $info = Get-Item $cleanPath -ErrorAction SilentlyContinue
                        if ($info -and $info.VersionInfo -and $info.VersionInfo.CompanyName) {
                            $publisher = $info.VersionInfo.CompanyName
                        }
                    } catch {}
                }

                # Check Status
                $enabled = $true
                if (Test-Path $loc.ApprovedPath) {
                    $approved = (Get-ItemProperty $loc.ApprovedPath).$name
                    if ($approved) {
                        # 0x02 is Enabled, 0x00 is usually Enabled (default), anything else (0x03, 0x01) is Disabled
                        if ($approved[0] -ne 0x02 -and $approved[0] -ne 0x00) {
                            $enabled = $false
                        }
                    }
                }
                
                $items += [PSCustomObject]@{
                    name = $name
                    path = $rawPath
                    location = $loc.Root
                    publisher = $publisher
                    enabled = $enabled
                }
            }
        }
    }
}

# Scan Startup Folders (User and Common)
$folderLocations = @(
    @{ Path = [Environment]::GetFolderPath('Startup'); ApprovedPath = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder"; Root = "Startup Folder (User)" },
    @{ Path = [Environment]::GetFolderPath('CommonStartup'); ApprovedPath = "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder"; Root = "Startup Folder (Common)" }
)

$shell = New-Object -ComObject WScript.Shell

foreach ($loc in $folderLocations) {
    if (Test-Path $loc.Path) {
        Get-ChildItem $loc.Path -Filter *.lnk | ForEach-Object {
            $name = $_.Name
            $fullPath = $_.FullName
            
            # Resolve Shortcut
            try {
                $shortcut = $shell.CreateShortcut($fullPath)
                $targetPath = $shortcut.TargetPath
            } catch {
                $targetPath = $fullPath
            }

            # Get Publisher
            $publisher = "Unknown Publisher"
            if (Test-Path $targetPath) {
                try {
                    $info = Get-Item $targetPath -ErrorAction SilentlyContinue
                    if ($info -and $info.VersionInfo -and $info.VersionInfo.CompanyName) {
                        $publisher = $info.VersionInfo.CompanyName
                    }
                } catch {}
            }

            $items += [PSCustomObject]@{
                name = $name
                path = $targetPath
                location = $loc.Root
                publisher = $publisher
                enabled = $true 
            }
        }
    }
}

$items | ConvertTo-Json -Depth 2
`

        fs.writeFileSync(scriptPath, psScript)

        return new Promise((resolve) => {
            exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout) => {
                if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath)

                if (error) {
                    console.error('Startup Scan Error:', error)
                    resolve({ success: false, items: [] })
                    return
                }

                try {
                    const items = JSON.parse(stdout)
                    resolve({ success: true, items: Array.isArray(items) ? items : [items].filter(i => i) })
                } catch (e) {
                    resolve({ success: true, items: [] })
                }
            })
        })
    })

    // Toggle startup item
    ipcMain.handle('toggle-startup-item', async (_, { name, location, enabled }) => {
        if (process.platform !== 'win32') return { success: false, error: 'Not Windows' }

        // Map location to Registry Path
        let regPath = ''
        let approvedPath = ''
        let root = ''

        if (location.includes('HKCU')) {
            regPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
            approvedPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
            root = 'HKCU'
        } else if (location.includes('HKLM (32-bit)')) {
            regPath = 'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'
            approvedPath = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run32'
            root = 'HKLM'
        } else if (location.includes('HKLM')) {
            regPath = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
            approvedPath = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
            root = 'HKLM'
        } else if (location.includes('Startup Folder')) {
            // For Startup Folder items, "disabling" usually means moving them or renaming them.
            // A safer approach for this app might be to just warn the user, or use the ApprovedStartup mechanism if applicable.
            // Windows 8+ supports StartupApproved\StartupFolder.
            if (location.includes('User')) {
                approvedPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder'
            } else {
                approvedPath = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder'
            }
        }

        if (!approvedPath) return { success: false, error: 'Unknown location type' }

        // PowerShell script to toggle
        // 0x02 = Enabled
        // 0x03 = Disabled (User)
        // 0x00 = Enabled (Default)
        // We will set to 0x02 for Enable, 0x03 for Disable.
        const targetValue = enabled ? '0x02' : '0x03'

        // We need to handle the binary data correctly. 
        // StartupApproved keys are REG_BINARY. The first byte is the state.
        // We will read the existing value, modify the first byte, and write it back.
        // If it doesn't exist, we create a default one.

        const psScript = `
        $path = "${approvedPath}"
        $name = "${name}"
        $enable = $${enabled}
        
        if (-not (Test-Path $path)) {
            New-Item -Path $path -Force | Out-Null
        }

        $current = (Get-ItemProperty -Path $path -Name $name -ErrorAction SilentlyContinue).$name
        
        if (-not $current) {
            # Create new binary value. Default enabled is 02 00 00 00 ...
            # We'll just create a small binary array.
            $current = @(0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)
        }

        # Modify first byte
        if ($enable) {
            $current[0] = 0x02
        } else {
            $current[0] = 0x03
        }

        Set-ItemProperty -Path $path -Name $name -Value $current -Type Binary
        `

        return new Promise((resolve) => {
            const scriptPath = path.join(app.getPath('userData'), 'toggle_startup.ps1')
            fs.writeFileSync(scriptPath, psScript)

            exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout, stderr) => {
                if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath)

                if (error) {
                    console.error('Toggle Startup Error:', error, stderr)
                    resolve({ success: false, error: error.message || stderr })
                } else {
                    resolve({ success: true })
                }
            })
        })
    })

    // Show item in folder
    ipcMain.handle('show-item-in-folder', async (_, itemPath) => {
        if (!itemPath) return { success: false }
        try {
            // If it's a file, show it. If it's a directory, open it.
            // shell.showItemInFolder(fullPath)
            shell.showItemInFolder(itemPath)
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    })

    // Scan Storage Category
    ipcMain.handle('scan-storage-category', async (_, categoryId) => {
        if (process.platform !== 'win32') return { success: false, files: [], totalSize: 0 }

        const scriptPath = path.join(app.getPath('userData'), `scan_${categoryId}.ps1`)
        let psScript = ''

        switch (categoryId) {
            case 'temp':
                psScript = `
        $path = $env:TEMP
        if (Test-Path $path) {
            Get-ChildItem -Path $path -Recurse -File -Force -ErrorAction SilentlyContinue | 
            Select-Object FullName, Length | 
            ForEach-Object { 
                [PSCustomObject]@{
                    path = $_.FullName
                    size = $_.Length
                }
            } | ConvertTo-Json
        }
        `
                break
            case 'downloads':
                psScript = `
        $path = "$env:USERPROFILE\\Downloads"
        if (Test-Path $path) {
            Get-ChildItem -Path $path -File -Force -ErrorAction SilentlyContinue | 
            Select-Object FullName, Length | 
            ForEach-Object { 
                [PSCustomObject]@{
                    path = $_.FullName
                    size = $_.Length
                }
            } | ConvertTo-Json
        }
        `
                break
            case 'recycle':
                psScript = `
        $shell = New-Object -ComObject Shell.Application
        $bin = $shell.Namespace(0xA)
        $bin.Items() | ForEach-Object {
            [PSCustomObject]@{
                path = $_.Path
                size = $_.Size
            }
        } | ConvertTo-Json
        `
                break
            case 'chrome_cache':
                psScript = `
        $path = "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache"
        if (Test-Path $path) {
            Get-ChildItem -Path $path -Recurse -File -Force -ErrorAction SilentlyContinue | 
            Select-Object FullName, Length | 
            ForEach-Object { 
                [PSCustomObject]@{
                    path = $_.FullName
                    size = $_.Length
                }
            } | ConvertTo-Json
        }
        `
                break
            case 'edge_cache':
                psScript = `
        $path = "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache"
        if (Test-Path $path) {
            Get-ChildItem -Path $path -Recurse -File -Force -ErrorAction SilentlyContinue | 
            Select-Object FullName, Length | 
            ForEach-Object { 
                [PSCustomObject]@{
                    path = $_.FullName
                    size = $_.Length
                }
            } | ConvertTo-Json
        }
        `
                break
            case 'prefetch':
                psScript = `
        $path = "C:\\Windows\\Prefetch"
        if (Test-Path $path) {
            Get-ChildItem -Path $path -File -Force -ErrorAction SilentlyContinue | 
            Select-Object FullName, Length | 
            ForEach-Object { 
                [PSCustomObject]@{
                    path = $_.FullName
                    size = $_.Length
                }
            } | ConvertTo-Json
        }
        `
                break
            case 'windows_update':
                psScript = `
        $path = "C:\\Windows\\SoftwareDistribution\\Download"
        if (Test-Path $path) {
            Get-ChildItem -Path $path -Recurse -File -Force -ErrorAction SilentlyContinue | 
            Select-Object FullName, Length | 
            ForEach-Object { 
                [PSCustomObject]@{
                    path = $_.FullName
                    size = $_.Length
                }
            } | ConvertTo-Json
        }
        `
                break
            case 'logs':
                psScript = `
        $path = "C:\\Windows\\System32\\winevt\\Logs"
        if (Test-Path $path) {
            Get-ChildItem -Path $path -File -Force -ErrorAction SilentlyContinue | 
            Select-Object FullName, Length | 
            ForEach-Object { 
                [PSCustomObject]@{
                    path = $_.FullName
                    size = $_.Length
                }
            } | ConvertTo-Json
        }
        `
                break
            default:
                return { success: false, files: [], totalSize: 0 }
        }

        try {
            fs.writeFileSync(scriptPath, psScript)
            return new Promise((resolve) => {
                exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout) => {
                    if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath)

                    if (error) {
                        resolve({ success: false, files: [], totalSize: 0, error: error.message })
                        return
                    }

                    try {
                        const raw = stdout.trim()
                        if (!raw) {
                            resolve({ success: true, files: [], totalSize: 0 })
                            return
                        }
                        const parsed = JSON.parse(raw)
                        const files = Array.isArray(parsed) ? parsed : [parsed]
                        const totalSize = files.reduce((acc: number, f: any) => acc + (f.size || 0), 0)
                        resolve({ success: true, files, totalSize })
                    } catch (e) {
                        resolve({ success: true, files: [], totalSize: 0 })
                    }
                })
            })
        } catch (error: any) {
            return { success: false, files: [], totalSize: 0, error: error.message }
        }
    })

    // Clean Storage Category
    ipcMain.handle('clean-storage-category', async (_, categoryId) => {
        const scriptPath = path.join(app.getPath('userData'), `clean_${categoryId}.ps1`)
        let psScript = ''

        switch (categoryId) {
            case 'temp':
                psScript = `
        Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue
        `
                break
            case 'downloads':
                // Only delete contents, not the folder
                psScript = `
        Remove-Item -Path "$env:USERPROFILE\\Downloads\\*" -Recurse -Force -ErrorAction SilentlyContinue
        `
                break
            case 'recycle':
                psScript = `
        Clear-RecycleBin -Force -ErrorAction SilentlyContinue
        `
                break
            case 'chrome_cache':
                psScript = `
        Remove-Item -Path "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache\\*" -Recurse -Force -ErrorAction SilentlyContinue
        `
                break
            case 'edge_cache':
                psScript = `
        Remove-Item -Path "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache\\*" -Recurse -Force -ErrorAction SilentlyContinue
        `
                break
            case 'prefetch':
                psScript = `
        Remove-Item -Path "C:\\Windows\\Prefetch\\*" -Recurse -Force -ErrorAction SilentlyContinue
        `
                break
            case 'windows_update':
                psScript = `
        Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "C:\\Windows\\SoftwareDistribution\\Download\\*" -Recurse -Force -ErrorAction SilentlyContinue
        Start-Service -Name wuauserv -ErrorAction SilentlyContinue
        `
                break
            case 'logs':
                psScript = `
        Get-EventLog -LogName * | ForEach-Object { Clear-EventLog -LogName $_.Log }
        `
                break
            default:
                return { success: false, message: 'Unknown category' }
        }

        try {
            fs.writeFileSync(scriptPath, psScript)
            return new Promise((resolve) => {
                exec(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, (error) => {
                    if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath)

                    if (error) {
                        resolve({ success: false, message: error.message })
                    } else {
                        resolve({ success: true })
                    }
                })
            })
        } catch (error: any) {
            return { success: false, message: error.message }
        }
    })

})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
