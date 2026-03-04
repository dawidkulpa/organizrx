import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { RefreshCw, Download, Trash2, Search, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { api } from '../../api/client'

interface LogEntry { timestamp: string; level: string; msg: string; [key: string]: unknown }
interface LogMeta { page: number; limit: number; total: number; pages: number }
interface LogFile { filename: string; sizeBytes: number; modifiedAt: string }

const LEVELS = ['all', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const
const LEVEL_COLORS: Record<string, string> = {
  fatal: 'bg-red-600 text-white', error: 'bg-red-500/20 text-red-400',
  warn: 'bg-amber-500/20 text-amber-400', info: 'bg-blue-500/20 text-blue-400',
  debug: 'bg-gray-500/20 text-gray-400', trace: 'bg-gray-400/10 text-gray-500',
}
const INPUT = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
const BTN = 'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

const fmtBytes = (b: number) => {
  if (b === 0) return '0 B'
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return `${parseFloat((b / Math.pow(1024, i)).toFixed(1))} ${['B', 'KB', 'MB', 'GB'][i]}`
}
const fmtTime = (ts: string) => { try { return new Date(ts).toLocaleString() } catch { return ts } }
const extraKeys = (e: LogEntry) =>
  Object.entries(e).filter(([k]) => !['timestamp', 'level', 'msg', 'time', 'message'].includes(k))

export default function SettingsLogs() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [meta, setMeta] = useState<LogMeta>({ page: 1, limit: 50, total: 0, pages: 0 })
  const [files, setFiles] = useState<LogFile[]>([])
  const [level, setLevel] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const fetchLogs = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit: 50 }
      if (level !== 'all') params.level = level
      if (search) params.search = search
      const res = await api.logs.getEntries(params as { page?: number; limit?: number; level?: string; search?: string })
      setEntries(res.data.data); setMeta(res.data.meta)
    } catch { toast.error('Failed to load log entries') }
    finally { setLoading(false) }
  }, [page, level, search])

  const fetchFiles = useCallback(async () => {
    try { const res = await api.logs.getFiles(); setFiles(res.data.data) } catch { /* ignore */ }
  }, [])

  useEffect(() => { setLoading(true); fetchLogs(); fetchFiles() }, [fetchLogs, fetchFiles])
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => { fetchLogs(); fetchFiles() }, 5000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchLogs, fetchFiles])

  const handleSearch = () => { setSearch(searchInput); setPage(1) }
  const handleClear = async () => {
    try {
      await api.logs.clear(); toast.success('Log files cleared')
      setShowClearConfirm(false); setEntries([])
      setMeta({ page: 1, limit: 50, total: 0, pages: 0 }); setFiles([])
    } catch { toast.error('Failed to clear log files') }
  }
  const handleDownload = async (filename: string) => {
    try {
      const res = await api.logs.download(filename)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click(); window.URL.revokeObjectURL(url)
    } catch { toast.error('Failed to download log file') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Logs</h2>
        <p className="text-muted-foreground">View and manage server log entries.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1) }}
          className={`${INPUT} w-36`} aria-label="Filter by log level">
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l === 'all' ? 'All Levels' : l.charAt(0).toUpperCase() + l.slice(1)}</option>
          ))}
        </select>
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search messages..." value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className={`${INPUT} pl-8`} aria-label="Search log messages" />
          </div>
          <button onClick={handleSearch} className={`${BTN} bg-primary text-primary-foreground hover:bg-primary/90`}>Search</button>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
          <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} /> Auto-refresh
        </label>
        <button onClick={() => setShowClearConfirm(true)} aria-label="Clear all logs"
          className={`${BTN} border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground`}>
          <Trash2 className="h-4 w-4" /> Clear
        </button>
      </div>

      {showClearConfirm && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive font-medium">
            <AlertTriangle className="h-5 w-5" /> Are you sure you want to delete all log files?
          </div>
          <p className="mt-1 text-sm text-muted-foreground">This action cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleClear} className={`${BTN} bg-destructive text-destructive-foreground hover:bg-destructive/90`}>Yes, delete all</button>
            <button onClick={() => setShowClearConfirm(false)} className={`${BTN} border border-input hover:bg-muted`}>Cancel</button>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="rounded-md border p-4">
          <h3 className="text-sm font-medium mb-2">Log Files</h3>
          <div className="flex flex-wrap gap-2">
            {files.map((f) => (
              <button key={f.filename} onClick={() => handleDownload(f.filename)}
                className={`${BTN} border border-input text-sm hover:bg-muted`}>
                <Download className="h-3.5 w-3.5" /> {f.filename} ({fmtBytes(f.sizeBytes)})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-8 p-2" />
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Timestamp</th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Level</th>
              <th className="px-3 py-2 text-left font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground"><RefreshCw className="mx-auto h-6 w-6 animate-spin" /></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No log entries found.</td></tr>
            ) : entries.map((entry, i) => {
              const extras = extraKeys(entry)
              const isExp = expandedRow === i
              return (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-2">
                    {extras.length > 0 && (
                      <button onClick={() => setExpandedRow(isExp ? null : i)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={isExp ? 'Collapse row' : 'Expand row'}>
                        {isExp ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">{fmtTime(entry.timestamp)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase ${LEVEL_COLORS[entry.level] ?? 'bg-gray-500/20 text-gray-400'}`}>
                      {entry.level}
                    </span>
                  </td>
                  <td className="px-3 py-2 break-all">
                    {entry.msg}
                    {isExp && extras.length > 0 && (
                      <pre className="mt-2 rounded bg-muted p-2 text-xs overflow-x-auto">{JSON.stringify(Object.fromEntries(extras), null, 2)}</pre>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {meta.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {meta.page} of {meta.pages} ({meta.total} entries)</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.page <= 1}
              className={`${BTN} border border-input hover:bg-muted`}>Previous</button>
            <button onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={meta.page >= meta.pages}
              className={`${BTN} border border-input hover:bg-muted`}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
