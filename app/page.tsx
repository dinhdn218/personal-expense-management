import { BalanceCard } from '@/components/dashboard/balance-card'
import { CategoryBreakdownCard } from '@/components/dashboard/category-breakdown-card'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { IncomeExpenseCard } from '@/components/dashboard/income-expense-card'
import { RecentTransactionsCard } from '@/components/dashboard/recent-transactions-card'

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <DashboardHeader />

      <div className="grid grid-cols-1 gap-4 md:auto-rows-[minmax(190px,auto)] md:grid-cols-4">
        <BalanceCard className="md:col-span-2" />
        <IncomeExpenseCard className="md:col-span-1" />
        <CategoryBreakdownCard className="md:col-span-1" />
        {/* Placed explicitly so the other three auto-place around it. */}
        <RecentTransactionsCard className="md:col-span-2 md:col-start-3 md:row-span-2 md:row-start-1" />
      </div>
    </main>
  )
}
