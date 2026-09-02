export function DashboardHeader() {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
          Expense Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">Your money at a glance.</p>
      </div>
    </header>
  )
}
