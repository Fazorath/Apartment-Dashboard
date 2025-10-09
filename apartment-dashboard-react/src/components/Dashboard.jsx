export default function Dashboard() {
  return (
    <div className="min-h-screen w-full bg-[#0b0c10] text-zinc-200">
      {/* App Shell */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-[#0b0c10]/70 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-400" fill="currentColor"><path d="M12 2a1 1 0 0 1 .894.553l2.382 4.764 5.258.764a1 1 0 0 1 .554 1.705l-3.8 3.705.897 5.225a1 1 0 0 1-1.451 1.054L12 17.77l-4.684 2.2a1 1 0 0 1-1.451-1.055l.897-5.224-3.8-3.705a1 1 0 0 1 .554-1.705l5.258-.764L11.106 2.553A1 1 0 0 1 12 2z"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">412 Dashboard</h1>
              <p className="text-sm text-zinc-400">
                Recurring chores with last‑done dates & due status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden md:flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-sm border border-white/10 hover:bg-white/[0.08] transition">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M11 2a1 1 0 0 1 1 1v8h8a1 1 0 1 1 0 2h-8v8a1 1 0 1 1-2 0v-8H2a1 1 0 1 1 0-2h8V3a1 1 0 0 1 1-1z"/></svg>
              New List
            </button>
            <button className="rounded-xl bg-white/[0.06] px-3 py-2 text-sm border border-white/10 hover:bg-white/[0.08] transition">Settings</button>
            <button className="rounded-xl bg-rose-500/15 text-rose-300 px-3 py-2 text-sm border border-rose-500/30 hover:bg-rose-500/20 transition">Logout</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Stats Row */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {label: 'Overdue', value: 3},
            {label: 'Due in 2 days', value: 5},
            {label: 'Total Active', value: 18},
            {label: 'Completed (30d)', value: 54},
          ].map((s, i) => (
            <div key={i} className="group rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 hover:from-white/[0.08] transition">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">{s.label}</p>
                <div className="h-8 w-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-300" fill="currentColor"><path d="M5 3a2 2 0 0 0-2 2v1h18V5a2 2 0 0 0-2-2H5zm16 5H3v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"/></svg>
                </div>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-3xl font-semibold tracking-tight">{s.value}</span>
                <span className="text-xs text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg">+2 this week</span>
              </div>
            </div>
          ))}
        </section>

        {/* Toolbar */}
        <section className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex overflow-x-auto gap-2">
            {['All','Overdue','Soon','OK','Completed'].map((t, i)=> (
              <button key={i} className={`px-3 py-2 rounded-xl text-sm border transition whitespace-nowrap ${i===0 ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' : 'bg-white/[0.06] border-white/10 text-zinc-300 hover:bg-white/[0.08]'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="md:ml-auto flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <input className="w-full md:w-80 rounded-xl bg-white/[0.06] border border-white/10 pl-9 pr-3 py-2 outline-none text-sm placeholder:text-zinc-500 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                placeholder="Search tasks..." />
              <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10.5 15A4.5 4.5 0 1 1 10.5 6a4.5 4.5 0 0 1 0 9z"/></svg>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-2 text-sm hover:bg-indigo-500/25">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M11 11V5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6z"/></svg>
              Add Task
            </button>
          </div>
        </section>

        {/* Content Grid */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Today & Upcoming */}
          <div className="xl:col-span-2 space-y-6">
            {/* Today */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Today</h2>
                <span className="text-xs text-zinc-400">3 due · 1 overdue</span>
              </div>
              <ul className="divide-y divide-white/10">
                {[
                  {title: 'Kitchen — take out trash', tag: 'Apartment', due: 'Today 7:00 PM', priority: 'High'},
                  {title: 'Bathroom — scrub sink & mirror', tag: 'Cleaning', due: 'Today 8:30 PM', priority: 'Med'},
                  {title: 'Laundry — darks', tag: 'Weekly', due: 'Today 9:00 PM', priority: 'Low'},
                ].map((t, i)=> (
                  <li key={i} className="px-5 py-4 flex items-start gap-4 hover:bg-white/[0.04]">
                    <input type="checkbox" className="mt-1.5 h-5 w-5 rounded-md border-white/20 bg-white/5" />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-zinc-100">{t.title}</p>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-400/15 border border-indigo-400/30 text-indigo-200">{t.tag}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-400/10 border border-emerald-400/30 text-emerald-200">{t.due}</span>
                        <span className="ml-auto text-[11px] px-2 py-0.5 rounded-md bg-rose-400/10 border border-rose-400/30 text-rose-200">{t.priority}</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">Last done 4d ago · repeats weekly</p>
                    </div>
                    <button className="self-center text-xs rounded-lg px-2 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.08]">Details</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Upcoming */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Upcoming (Next 7 days)</h2>
                <button className="text-xs rounded-lg px-2 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.08]">View calendar</button>
              </div>
              <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {d:'Fri', t:'9:00 AM', name:'Water plants', list:'Home'},
                  {d:'Sat', t:'10:30 AM', name:'Vacuum living room', list:'Cleaning'},
                  {d:'Sun', t:'7:00 PM', name:'Meal prep', list:'Kitchen'},
                  {d:'Mon', t:'All day', name:'Pay utilities', list:'Finance'},
                  {d:'Wed', t:'6:30 PM', name:'Mop floors', list:'Cleaning'},
                  {d:'Thu', t:'8:00 PM', name:'Laundry — whites', list:'Weekly'},
                ].map((c, i)=> (
                  <div key={i} className="rounded-xl border border-white/10 bg-[#111217] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-zinc-400">{c.d} · {c.t}</div>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10">{c.list}</span>
                    </div>
                    <p className="mt-2 font-medium">{c.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Insights */}
          <aside className="space-y-6">
            {/* Progress */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">This Week</h3>
                <span className="text-xs text-zinc-400">Goal: 20 tasks</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                {[{k:'Done',v:12},{k:'Active',v:8},{k:'Overdue',v:3}].map((m,i)=>(
                  <div key={i} className="rounded-xl border border-white/10 bg-[#111217] p-4">
                    <p className="text-xs text-zinc-400">{m.k}</p>
                    <p className="mt-1 text-2xl font-semibold">{m.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-zinc-400">Completion</span>
                  <span className="text-zinc-300">60%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                  <div className="h-full w-[60%] bg-emerald-500/60" />
                </div>
              </div>
            </div>

            {/* Streaks */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="font-semibold">Streaks</h3>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[{k:'Daily',v:'5 days'},{k:'Weekly',v:'8 weeks'}].map((s,i)=>(
                  <div key={i} className="rounded-xl border border-white/10 bg-[#111217] p-4">
                    <p className="text-xs text-zinc-400">{s.k}</p>
                    <p className="mt-1 text-lg font-semibold">{s.v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-zinc-400">Tip: ⌘/Ctrl + D marks the first task done.</p>
            </div>

            {/* Lists */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Lists</h3>
                <button className="text-xs rounded-lg px-2 py-1 bg-white/[0.06] border border-white/10 hover:bg-white/[0.08]">Manage</button>
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  {name:'Cleaning', count:7},
                  {name:'Kitchen', count:5},
                  {name:'Finance', count:3},
                  {name:'Groceries', count:2},
                ].map((l,i)=> (
                  <li key={i} className="flex items-center justify-between rounded-xl bg-[#111217] px-3 py-2 border border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70"/>
                      <p className="text-sm">{l.name}</p>
                    </div>
                    <span className="text-xs text-zinc-400">{l.count} active</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-6 py-10 text-center text-xs text-zinc-500">
        Local‑first. Data lives in your browser.
      </footer>
    </div>
  )
}

 
