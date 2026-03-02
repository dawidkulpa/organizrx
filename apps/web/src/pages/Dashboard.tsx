import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { discoverWidgets, PluginWidgetRegistration } from '../plugins/widget-registry';
import { WidgetGrid } from '../components/WidgetGrid';
import type { LayoutItem } from 'react-grid-layout';
import { RefreshCw, LayoutGrid, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Dashboard() {
  const [widgets, setWidgets] = useState<PluginWidgetRegistration[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [discovered, settingsRes] = await Promise.all([
        discoverWidgets(),
        api.settings.getAll('dashboard_layout').catch(() => ({ data: [] })) 
      ]);

      setWidgets(discovered);

      // Parse layout
      // API typically returns an array of settings. Find the specific key.
      const layoutSetting = Array.isArray(settingsRes.data) 
        ? settingsRes.data.find((s: { key: string; value: string }) => s.key === 'dashboard_layout')
        : settingsRes.data; // fallback if api returns object

      if (layoutSetting?.value) {
        try {
          const parsed = JSON.parse(layoutSetting.value);
          if (Array.isArray(parsed)) {
            setLayout(parsed);
          }
        } catch {
          // Layout parse failed — use defaults
        }
      }
    } catch {
      toast.error("Failed to load dashboard widgets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLayoutChange = (newLayout: LayoutItem[]) => {
    setLayout(newLayout);
    
    // We only save if not loading to avoid overwriting with empty
    if (!isLoading && widgets.length > 0) {
        api.settings.update({ 
            key: 'dashboard_layout', 
            value: JSON.stringify(newLayout) 
        }).catch(() => {
            // Silent failure — non-critical save
        });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-8">
        <div className="flex justify-between items-center mb-8">
            <div className="h-8 w-32 bg-muted rounded"></div>
            <div className="h-8 w-8 bg-muted rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-muted rounded-lg border border-border"></div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <LayoutGrid className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        </div>
        <button 
            onClick={loadData}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
            title="Refresh Widgets"
        >
            <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4 border-2 border-dashed border-border rounded-xl bg-muted/10">
            <div className="p-4 bg-background rounded-full border border-border shadow-sm">
                <LayoutGrid className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-semibold text-foreground">No widgets installed</h3>
                <p className="text-sm text-muted-foreground">
                    Install plugins to add widgets to your dashboard and customize your experience.
                </p>
            </div>
            <Link 
                to="/settings/plugins" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
                <Plus className="w-4 h-4" />
                Browse Plugins
            </Link>
          </div>
        ) : (
          <WidgetGrid 
            widgets={widgets} 
            layout={layout} 
            onLayoutChange={handleLayoutChange} 
          />
        )}
      </div>
    </div>
  );
}
