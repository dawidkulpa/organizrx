import { Activity, CreditCard, DollarSign, Users } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { name: 'Total Revenue', value: '$45,231.89', change: '+20.1% from last month', icon: DollarSign },
    { name: 'Subscriptions', value: '+2350', change: '+180.1% from last month', icon: Users },
    { name: 'Sales', value: '+12,234', change: '+19% from last month', icon: CreditCard },
    { name: 'Active Now', value: '+573', change: '+201 since last hour', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="p-6 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors animate-reveal">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium text-muted-foreground tracking-tight">{stat.name}</h3>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 bg-card rounded-lg border border-border p-6 animate-reveal delay-100">
          <h3 className="font-semibold text-lg mb-4">Overview</h3>
          <div className="h-[300px] w-full bg-muted/20 rounded flex items-center justify-center text-muted-foreground border border-dashed border-border">
            Chart Placeholder
          </div>
        </div>
        <div className="col-span-3 bg-card rounded-lg border border-border p-6 animate-reveal delay-200">
          <h3 className="font-semibold text-lg mb-4">Recent Sales</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  OM
                </div>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Olivia Martin</p>
                  <p className="text-sm text-muted-foreground">olivia.martin@email.com</p>
                </div>
                <div className="ml-auto font-medium">+$1,999.00</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
