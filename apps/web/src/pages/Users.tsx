import { Trash, Edit } from 'lucide-react';

export default function Users() {
  const users = [
    { id: 1, name: 'Alice Cooper', email: 'alice@example.com', role: 'Admin' },
    { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'Editor' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Users</h2>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm shadow hover:bg-primary/90 transition-colors">
          Add User
        </button>
      </div>

      <div className="rounded-md border border-border bg-card animate-reveal">
        <table className="w-full text-sm text-left">
          <thead className="text-muted-foreground bg-muted/50 border-b border-border">
            <tr>
              <th className="h-12 px-4 font-medium align-middle">Name</th>
              <th className="h-12 px-4 font-medium align-middle">Email</th>
              <th className="h-12 px-4 font-medium align-middle">Role</th>
              <th className="h-12 px-4 font-medium align-middle text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border transition-colors hover:bg-muted/50">
                <td className="p-4 align-middle font-medium">{user.name}</td>
                <td className="p-4 align-middle">{user.email}</td>
                <td className="p-4 align-middle">
                  <span className="inline-flex items-center rounded-full border border-transparent bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    {user.role}
                  </span>
                </td>
                <td className="p-4 align-middle text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                      <Edit size={16} />
                    </button>
                    <button className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors">
                      <Trash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
