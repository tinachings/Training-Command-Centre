'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  ['Weekly Planner', '/'],
  ['Training Records', '/trainees'],
  ['Training Pipeline', '/training-pipeline'],
  ['Colleagues', '/colleagues'],
  ['Refresher Dashboard', '/refreshers'],
  ['Production Matrix', '/production-matrix'],
  ['Assessment Generator', '/assessment-generator'],
  ['Assessment Records', '/assessment-records'],
  ['Team Leader Update', '/team-leader-update'],
  ['Reports', '/reports'],
  ['Settings', '/settings'],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-slate-950 text-white lg:flex lg:flex-col">
        <div className="border-b border-slate-800 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Training Command Centre</p>
          <h2 className="mt-2 text-xl font-semibold">Manufacturing Training MVP</h2>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4 text-sm">
          {navItems.map(([label, href]) => {
            const active =
              href === '/' ? pathname === href : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`block rounded-xl border px-4 py-3 hover:border-sky-400 hover:bg-slate-800 ${
                  active
                    ? 'border-sky-400 bg-slate-800'
                    : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-4 text-xs text-slate-300">Version 1 • SQLite • No authentication</div>
      </aside>
      <main className="lg:ml-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Operational view</p>
              <h1 className="text-2xl font-semibold text-slate-900">Training Command Centre</h1>
            </div>
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm text-emerald-700">Live MVP prototype</div>
          </div>
        </header>
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</section>
      </main>
    </div>
  );
}
