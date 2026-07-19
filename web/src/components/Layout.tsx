import { NavLink, Outlet } from "react-router-dom";

function Tab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-sm font-medium transition ${isActive ? "bg-white/10 text-white" : "text-slate-300 hover:text-white"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col h-full">
      <header className="bg-ink-900 text-white sticky top-0 z-50">
        <div className="mx-auto flex  items-center gap-6 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">Cyber Prospect</span>
            <span className="hidden text-xs text-slate-400 sm:inline">
              attack-surface prospecting
            </span>
          </NavLink>
          <nav className="flex items-center gap-1">
            <Tab to="/">Dashboard</Tab>
            <Tab to="/explore">Explore</Tab>
          </nav>
        </div>
      </header>
      <main className="mx-auto px-4 py-4 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
