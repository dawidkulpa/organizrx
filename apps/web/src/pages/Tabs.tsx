import { useState } from 'react';
import { cn } from '../utils';

export default function Tabs() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { title: 'Overview', content: 'Overview content area' },
    { title: 'Analytics', content: 'Analytics dashboard placeholder' },
    { title: 'Reports', content: 'Reports list placeholder' },
    { title: 'Notifications', content: 'Notifications feed placeholder' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Tabs Example</h2>
      
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab, idx) => (
            <button
              key={tab.title}
              onClick={() => setActiveTab(idx)}
              className={cn(
                idx === activeTab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-gray-300 hover:text-gray-700",
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all"
              )}
            >
              {tab.title}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-8">
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm animate-reveal">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">{tabs[activeTab].title}</h3>
            <p className="text-muted-foreground mb-4">
              Here is the content for {tabs[activeTab].title.toLowerCase()}.
            </p>
            <div className="aspect-video w-full bg-muted rounded-md flex items-center justify-center border border-dashed border-border text-muted-foreground">
              {tabs[activeTab].content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
