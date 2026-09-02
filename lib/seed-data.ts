import { toIsoDate } from '@/lib/format'
import type { NewTransaction, Transaction } from '@/types/transaction'

function daysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return toIsoDate(date)
}

/** `date` is computed from `daysAgo` below, so it is omitted here. */
type SeedInput = Omit<NewTransaction, 'date'> & { daysAgo: number }

const SEED_INPUTS: SeedInput[] = [
  { daysAgo: 26, type: 'income', amount: 4200, category: 'salary', note: 'Monthly salary' },
  { daysAgo: 18, type: 'income', amount: 850, category: 'freelance', note: 'Landing page build' },
  { daysAgo: 12, type: 'expense', amount: 1450, category: 'bills', note: 'Rent' },
  { daysAgo: 9, type: 'expense', amount: 264.32, category: 'food', note: 'Weekly groceries' },
  { daysAgo: 7, type: 'expense', amount: 89.99, category: 'entertainment', note: 'Concert ticket' },
  { daysAgo: 5, type: 'expense', amount: 132.4, category: 'shopping', note: 'Running shoes' },
  { daysAgo: 3, type: 'expense', amount: 48.2, category: 'transport', note: 'Fuel' },
  { daysAgo: 2, type: 'expense', amount: 62, category: 'health', note: 'Pharmacy' },
  { daysAgo: 1, type: 'expense', amount: 18.75, category: 'food', note: 'Lunch with Mai' },
]

export const SEED_TRANSACTIONS: Transaction[] = SEED_INPUTS.map(
  ({ daysAgo: offset, ...input }, index) => {
    const date = daysAgo(offset)
    return {
      ...input,
      date,
      id: `seed-${index + 1}`,
      createdAt: `${date}T09:00:00.000Z`,
    }
  },
)
