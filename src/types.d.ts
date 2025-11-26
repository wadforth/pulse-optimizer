export { }

declare global {
    interface Window {
        ipcRenderer: {
            send(channel: string, ...args: any[]): void
            on(channel: string, listener: (event: any, ...args: any[]) => void): void
            off(channel: string, listener: (event: any, ...args: any[]) => void): void
            invoke(channel: 'minimize-window' | 'maximize-window' | 'close-window' | 'get-user-info' | 'get-system-stats' | 'get-system-specs' | 'clean-memory' | 'flush-dns', ...args: any[]): Promise<any>
            invoke(channel: string, ...args: any[]): Promise<any>
        }
    }
}
