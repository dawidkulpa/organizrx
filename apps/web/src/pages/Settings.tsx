import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../utils';

export default function Settings() {
  const settingsNav = [
    { name: 'Profile', path: '/settings/profile' },
    { name: 'Account', path: '/settings/account' },
    { name: 'Appearance', path: '/settings/appearance' },
    { name: 'Notifications', path: '/settings/notifications' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 shrink-0 space-y-2">
        <h2 className="text-lg font-semibold mb-4 px-2">Settings</h2>
        {settingsNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "block px-4 py-2 rounded-md transition-colors",
              isActive 
                ? "bg-muted text-foreground font-medium" 
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {item.name}
          </NavLink>
        ))}
      </aside>
      
      <div className="flex-1 bg-card rounded-lg border border-border p-6 min-h-[400px] animate-reveal">
        <Outlet />
      </div>
    </div>
  );
}

export function SettingsPlaceholder() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Section Title</h3>
      <p className="text-muted-foreground">This is a placeholder for the settings content.</p>
      <div className="h-40 bg-muted/20 rounded border border-dashed border-border flex items-center justify-center">
        Form Area
      </div>
    </div>
  );
}
