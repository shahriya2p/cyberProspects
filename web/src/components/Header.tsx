import { NavLink } from "react-router-dom";


function NavTab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${isActive
          ? "text-indigo-700 bg-indigo-50 shadow-sm ring-1 ring-indigo-100"
          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 w-full items-center justify-between px-6">
        <div className="flex items-center gap-8 flex-1">
          <NavLink
            to="/"
            className="flex items-center gap-3 group transition-opacity hover:opacity-90"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/20 border border-indigo-100">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                Cyber Prospect
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-indigo-500 uppercase leading-none mt-1">
                Attack-Surface
              </span>
            </div>
          </NavLink>

          <nav className="hidden ml-auto md:flex items-center gap-2 pl-6 ">
            <NavTab to="/">Dashboard</NavTab>
            <NavTab to="/explore">Explore</NavTab>
          </nav>
        </div>
      </div>
    </header>
  );
}
