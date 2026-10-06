import { AppCard3D } from './AppCard3D';
import { WORKSPACE_APPS } from './apps';
import { useWorkspace, useWorkspacePath } from './WorkspaceContext';

export default function DashboardPage() {
  const workspace = useWorkspace();
  const wp = useWorkspacePath();
  const categories = [...new Set(WORKSPACE_APPS.map((app) => app.category))];

  return (
    <div className="container mx-auto p-6 pt-10 max-w-7xl">
      <h1 className="text-2xl font-bold mb-8">{workspace.name}</h1>
      <div className="space-y-10">
        {categories.map((category) => (
          <section key={category}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-base font-semibold tracking-tight whitespace-nowrap">{category}</h2>
              <div className="border-t flex-1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {WORKSPACE_APPS.filter((app) => app.category === category).map((app) => (
                <AppCard3D
                  key={app.key}
                  title={app.title}
                  description={app.description}
                  to={wp(app.path)}
                  icon={app.icon}
                  colorClass={app.colorClass}
                  buttonColorClass={app.buttonColorClass}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
