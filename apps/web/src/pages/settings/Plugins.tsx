import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Search, Download, Trash2, RefreshCw, Box, Loader2 } from 'lucide-react'
import { api } from '../../api/client'
import { cn } from '../../utils'

interface Plugin {
  name: string
  version: string
  description?: string
  author?: string
  installed: boolean
  updateAvailable?: boolean
}

const INPUT_CLASS = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

export default function PluginsSettings() {
  const [installedPlugins, setInstalledPlugins] = useState<Plugin[]>([])
  const [searchResults, setSearchResults] = useState<Plugin[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null) // name of plugin being processed

  const fetchInstalled = async () => {
    try {
      setIsLoading(true)
      const res = await api.plugins.getAll()
      // Assuming res.data is Plugin[]
      setInstalledPlugins(res.data as Plugin[])
    } catch (error) {
      toast.error('Failed to load installed plugins')
      toast.error('Failed to load installed plugins')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInstalled()
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      const res = await api.plugins.search(query)
      setSearchResults(res.data as Plugin[])
    } catch (error) {
      toast.error('Plugin search failed')
      toast.error('Plugin search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const handleInstall = async (plugin: Plugin) => {
    try {
      setProcessing(plugin.name)
      await api.plugins.install({ name: plugin.name })
      toast.success(`Installed ${plugin.name}`)
      await fetchInstalled()
      // Remove from search results or mark as installed
      setSearchResults((prev) => 
        prev.map(p => p.name === plugin.name ? { ...p, installed: true } : p)
      )
    } catch (error) {
      toast.error(`Failed to install ${plugin.name}`)
      toast.error(`Failed to install ${plugin.name}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleRemove = async (plugin: Plugin) => {
    if (!confirm(`Are you sure you want to remove ${plugin.name}?`)) return

    try {
      setProcessing(plugin.name)
      await api.plugins.remove(plugin.name)
      toast.success(`Removed ${plugin.name}`)
      await fetchInstalled()
    } catch (error) {
      toast.error(`Failed to remove ${plugin.name}`)
      toast.error(`Failed to remove ${plugin.name}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleUpdate = async (plugin: Plugin) => {
    try {
      setProcessing(plugin.name)
      await api.plugins.update(plugin.name)
      toast.success(`Updated ${plugin.name}`)
      await fetchInstalled()
    } catch (error) {
      toast.error(`Failed to update ${plugin.name}`)
      toast.error(`Failed to update ${plugin.name}`)
    } finally {
      setProcessing(null)
    }
  }

  const PluginCard = ({ plugin, isInstalledList = false }: { plugin: Plugin, isInstalledList?: boolean }) => {
    const isProcessing = processing === plugin.name

    return (
      <div className="flex items-center justify-between rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-2">
            <Box className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">{plugin.name}</h4>
            <p className="text-sm text-muted-foreground">{plugin.description || 'No description available'}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="bg-secondary px-2 py-0.5 rounded">v{plugin.version}</span>
              {plugin.author && <span>by {plugin.author}</span>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              {plugin.updateAvailable && (
                <button
                  onClick={() => handleUpdate(plugin)}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  title="Update"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update
                </button>
              )}
              
              {isInstalledList ? (
                <button
                  onClick={() => handleRemove(plugin)}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-destructive/50 bg-destructive/10 px-3 text-sm font-medium text-destructive shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  title="Uninstall"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </button>
              ) : (
                <button
                  onClick={() => handleInstall(plugin)}
                  disabled={plugin.installed}
                  className={cn(
                    "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    plugin.installed 
                      ? "bg-muted text-muted-foreground cursor-not-allowed" 
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {plugin.installed ? 'Installed' : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Install
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Plugins</h2>
        <p className="text-muted-foreground">Extend functionality with plugins.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search for plugins..."
          className={cn(INPUT_CLASS, "pl-10 h-10")}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Search Results</h3>
          {isSearching ? (
             <div className="flex h-20 items-center justify-center">
               <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
             </div>
          ) : searchResults.length > 0 ? (
            <div className="grid gap-4">
              {searchResults.map((plugin) => (
                <PluginCard key={plugin.name} plugin={plugin} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No plugins found matching "{searchQuery}".</p>
          )}
        </div>
      )}

      {/* Installed Plugins */}
      {!searchQuery && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Installed Plugins</h3>
          {isLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : installedPlugins.length > 0 ? (
            <div className="grid gap-4">
              {installedPlugins.map((plugin) => (
                <PluginCard key={plugin.name} plugin={plugin} isInstalledList={true} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No plugins installed. Search above to find some!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
