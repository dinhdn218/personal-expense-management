# Personal Expense Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A client-only personal expense dashboard — a dark glassmorphism bento grid showing balance, monthly income vs. expense, recent transactions, and spending by category, with transactions added through a dialog and persisted to localStorage.

**Architecture:** Zustand holds the raw transaction array as the single source of truth and persists it to localStorage with `skipHydration`, rehydrating from a client effect so the server render and first client render agree. All derived values (totals, balance, monthly summary, category breakdown) are pure functions in `lib/selectors.ts` that take `Transaction[]` and are consumed through `useMemo` in components. Glassmorphism lives in exactly one component, `GlassCard`.

**Tech Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zustand · framer-motion · react-hook-form + zod · Vitest

**Spec:** `docs/superpowers/specs/2026-09-02-expense-app-design.md`

## Global Constraints

- Next.js 14 or newer, App Router, no `src/` directory, import alias `@/*`.
- TypeScript strict mode. No `any` in committed code.
- `components/ui/` holds only unmodified shadcn CLI output. Project components live in `components/shared/`, `components/dashboard/`, `components/transactions/`.
- Only `components/shared/glass-card.tsx` may define the glass surface (`backdrop-blur`, translucent background, translucent border). Every other component composes `GlassCard`.
- `amount` is always a positive number. Direction comes from `type`. Never store a signed amount.
- Dates are ISO `YYYY-MM-DD` strings. Never store `Date` objects in the store.
- All `Intl` formatters pin locale `'en-US'` and currency `'USD'` explicitly, so server and client produce identical strings.
- Derived state is never a field in the store.
- Dark theme is forced via `className="dark"` on `<html>`. No theme toggle in this iteration.
- Every task ends with a commit.

---

### Task 1: Project scaffold

**Files:**
- Create: whole Next.js app (`package.json`, `app/`, `tsconfig.json`, …) via CLI
- Create: `vitest.config.ts`
- Create: `lib/example.test.ts` (temporary, deleted in Step 7)
- Modify: `package.json` (test scripts)

**Interfaces:**
- Consumes: nothing
- Produces: a working Next.js app with `npm run build`, `npm run lint`, and `npm test` all passing; the `@/*` import alias; shadcn CLI configured via `components.json`

- [ ] **Step 1: Scaffold the Next.js app**

Run from the project root (the directory already contains `docs/` and `.git/`; `create-next-app` explicitly allows both):

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
```

If `--yes` is rejected as an unknown flag, rerun without it and accept the defaults at each prompt.

- [ ] **Step 2: Verify the scaffold builds**

Run: `npm run build`
Expected: build completes, no errors.

- [ ] **Step 3: Install runtime dependencies**

```bash
npm install zustand framer-motion
```

- [ ] **Step 4: Initialize shadcn/ui and add the components used by this plan**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button dialog input label select form skeleton
```

`-d` accepts defaults (slate base color, CSS variables). The `form` component pulls in `react-hook-form`, `@hookform/resolvers`, and `zod` at mutually compatible versions — do not install those three by hand.

- [ ] **Step 5: Install test dependencies**

```bash
npm install -D vitest jsdom
```

- [ ] **Step 6: Create the Vitest config**

Create `vitest.config.ts`. `import.meta.url` is used instead of `__dirname` because Vite loads this config as an ES module.

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
})
```

Add scripts to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Prove the test runner works, then remove the probe**

Create `lib/example.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('test runner', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test`
Expected: 1 passed.

Then delete `lib/example.test.ts` — it has done its job and a permanent tautological test is noise.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold next.js app with tailwind, shadcn, zustand, vitest"
```

---

### Task 2: Domain types, categories, formatters, and seed data

**Files:**
- Create: `types/transaction.ts`
- Create: `lib/format.ts`
- Create: `lib/format.test.ts`
- Create: `lib/seed-data.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `Transaction`, `NewTransaction`, `TransactionType`, `Category` types
  - `CATEGORIES: Category[]`, `getCategory(id: string): Category`
  - `formatCurrency(value: number): string`
  - `formatSignedAmount(type: TransactionType, amount: number): string`
  - `formatDate(isoDate: string): string`
  - `formatRelativeDay(isoDate: string): string`
  - `currentMonthKey(): string`
  - `SEED_TRANSACTIONS: Transaction[]`

- [ ] **Step 1: Write the failing formatter tests**

Create `lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  currentMonthKey,
  formatCurrency,
  formatDate,
  formatRelativeDay,
  formatSignedAmount,
} from '@/lib/format'

describe('formatCurrency', () => {
  it('formats with a dollar sign, thousands separators, and two decimals', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats negative values with the sign before the symbol', () => {
    expect(formatCurrency(-320)).toBe('-$320.00')
  })
})

describe('formatSignedAmount', () => {
  it('prefixes income with a plus', () => {
    expect(formatSignedAmount('income', 4200)).toBe('+$4,200.00')
  })

  it('prefixes expense with a minus', () => {
    expect(formatSignedAmount('expense', 32.1)).toBe('-$32.10')
  })
})

describe('formatDate', () => {
  it('formats an ISO date as a short month and day', () => {
    expect(formatDate('2026-03-12')).toBe('Mar 12')
  })

  it('does not shift the day across timezones', () => {
    // Parsed as a local date, not UTC midnight, so a negative UTC offset
    // cannot roll this back to Dec 31.
    expect(formatDate('2026-01-01')).toBe('Jan 1')
  })
})

describe('formatRelativeDay', () => {
  it('labels today', () => {
    const today = new Date()
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(formatRelativeDay(iso)).toBe('Today')
  })

  it('falls back to a short date for older days', () => {
    expect(formatRelativeDay('2020-05-04')).toBe('May 4')
  })
})

describe('currentMonthKey', () => {
  it('returns the current year and month as YYYY-MM', () => {
    expect(currentMonthKey()).toMatch(/^\d{4}-\d{2}$/)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/format`.

- [ ] **Step 3: Write the types and categories**

Create `types/transaction.ts`:

```ts
export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  /** Always positive. Direction comes from `type`. */
  amount: number
  /** Category id, see CATEGORIES. */
  category: string
  /** ISO date, 'YYYY-MM-DD'. */
  date: string
  note?: string
  /** ISO timestamp. */
  createdAt: string
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>

export interface Category {
  id: string
  label: string
  /** Hex color used for the category dot and bar. */
  color: string
  /** Which transaction types may use this category. */
  kind: TransactionType | 'both'
}

export const CATEGORIES: Category[] = [
  { id: 'salary', label: 'Salary', color: '#4ade80', kind: 'income' },
  { id: 'freelance', label: 'Freelance', color: '#facc15', kind: 'income' },
  { id: 'food', label: 'Food & Drink', color: '#fb923c', kind: 'expense' },
  { id: 'transport', label: 'Transport', color: '#38bdf8', kind: 'expense' },
  { id: 'shopping', label: 'Shopping', color: '#a78bfa', kind: 'expense' },
  { id: 'bills', label: 'Bills & Utilities', color: '#f43f5e', kind: 'expense' },
  { id: 'entertainment', label: 'Entertainment', color: '#22d3ee', kind: 'expense' },
  { id: 'health', label: 'Health', color: '#34d399', kind: 'expense' },
  { id: 'other', label: 'Other', color: '#94a3b8', kind: 'both' },
]

const FALLBACK_CATEGORY: Category = {
  id: 'other',
  label: 'Other',
  color: '#94a3b8',
  kind: 'both',
}

export function getCategory(id: string): Category {
  return CATEGORIES.find((category) => category.id === id) ?? FALLBACK_CATEGORY
}

export function categoriesForType(type: TransactionType): Category[] {
  return CATEGORIES.filter(
    (category) => category.kind === type || category.kind === 'both',
  )
}
```

- [ ] **Step 4: Write the formatters**

Create `lib/format.ts`:

```ts
import type { TransactionType } from '@/types/transaction'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatSignedAmount(
  type: TransactionType,
  amount: number,
): string {
  const sign = type === 'income' ? '+' : '-'
  return `${sign}${currencyFormatter.format(Math.abs(amount))}`
}

/**
 * Parses 'YYYY-MM-DD' as a local date. `new Date('2026-01-01')` would parse as
 * UTC midnight, which renders as the previous day in negative UTC offsets.
 */
function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDate(isoDate: string): string {
  return dayFormatter.format(parseIsoDate(isoDate))
}

export function formatRelativeDay(isoDate: string): string {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (isoDate === toIsoDate(today)) return 'Today'
  if (isoDate === toIsoDate(yesterday)) return 'Yesterday'
  return formatDate(isoDate)
}

export function currentMonthKey(): string {
  return toIsoDate(new Date()).slice(0, 7)
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all formatter tests green.

- [ ] **Step 6: Write the seed data**

Create `lib/seed-data.ts`. Dates are relative to today so the monthly summary card always has data:

```ts
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
```

- [ ] **Step 7: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add types lib
git commit -m "feat: add transaction types, categories, formatters, and seed data"
```

---

### Task 3: Zustand store

**Files:**
- Create: `store/use-expense-store.ts`
- Create: `store/use-expense-store.test.ts`

**Interfaces:**
- Consumes: `Transaction`, `NewTransaction` from `@/types/transaction`; `SEED_TRANSACTIONS` from `@/lib/seed-data`
- Produces: `useExpenseStore` and the `ExpenseState` interface with fields `transactions`, `hasHydrated` and actions `addTransaction(input: NewTransaction): void`, `updateTransaction(id: string, patch: Partial<NewTransaction>): void`, `deleteTransaction(id: string): void`, `resetToSeed(): void`, `setHasHydrated(value: boolean): void`

- [ ] **Step 1: Write the failing store tests**

Create `store/use-expense-store.test.ts`. Each test resets state first, because the store is a module-level singleton shared across tests:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useExpenseStore } from '@/store/use-expense-store'
import type { Transaction } from '@/types/transaction'

const existing: Transaction = {
  id: 'existing-1',
  type: 'expense',
  amount: 20,
  category: 'food',
  date: '2026-03-01',
  note: 'Coffee',
  createdAt: '2026-03-01T09:00:00.000Z',
}

beforeEach(() => {
  useExpenseStore.setState({ transactions: [existing] })
})

describe('addTransaction', () => {
  it('prepends the new transaction', () => {
    useExpenseStore.getState().addTransaction({
      type: 'income',
      amount: 100,
      category: 'salary',
      date: '2026-03-02',
    })

    const { transactions } = useExpenseStore.getState()
    expect(transactions).toHaveLength(2)
    expect(transactions[0].amount).toBe(100)
    expect(transactions[1]).toEqual(existing)
  })

  it('generates an id and a createdAt timestamp', () => {
    useExpenseStore.getState().addTransaction({
      type: 'income',
      amount: 100,
      category: 'salary',
      date: '2026-03-02',
    })

    const added = useExpenseStore.getState().transactions[0]
    expect(added.id).toBeTruthy()
    expect(added.id).not.toBe(existing.id)
    expect(Number.isNaN(Date.parse(added.createdAt))).toBe(false)
  })
})

describe('updateTransaction', () => {
  it('patches only the named fields of the matching transaction', () => {
    useExpenseStore.getState().updateTransaction('existing-1', { amount: 45 })

    const [updated] = useExpenseStore.getState().transactions
    expect(updated.amount).toBe(45)
    expect(updated.category).toBe('food')
    expect(updated.id).toBe('existing-1')
  })

  it('leaves state untouched when the id is unknown', () => {
    useExpenseStore.getState().updateTransaction('nope', { amount: 45 })
    expect(useExpenseStore.getState().transactions).toEqual([existing])
  })
})

describe('deleteTransaction', () => {
  it('removes the matching transaction', () => {
    useExpenseStore.getState().deleteTransaction('existing-1')
    expect(useExpenseStore.getState().transactions).toEqual([])
  })
})

describe('resetToSeed', () => {
  it('restores the seed transactions', () => {
    useExpenseStore.getState().resetToSeed()
    expect(useExpenseStore.getState().transactions.length).toBeGreaterThan(0)
    expect(useExpenseStore.getState().transactions[0].id).toMatch(/^seed-/)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/store/use-expense-store`.

- [ ] **Step 3: Write the store**

Create `store/use-expense-store.ts`.

`skipHydration: true` matters: without it, `persist` rehydrates synchronously when the module loads, so the first client render already holds localStorage data while the server rendered seed data — React reports a hydration mismatch. With it, rehydration is triggered from an effect in Task 5, after the first client render has matched the server.

```ts
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { SEED_TRANSACTIONS } from '@/lib/seed-data'
import type { NewTransaction, Transaction } from '@/types/transaction'

export interface ExpenseState {
  transactions: Transaction[]
  hasHydrated: boolean
  addTransaction: (input: NewTransaction) => void
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => void
  deleteTransaction: (id: string) => void
  resetToSeed: () => void
  setHasHydrated: (value: boolean) => void
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `txn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set) => ({
      transactions: SEED_TRANSACTIONS,
      hasHydrated: false,

      addTransaction: (input) =>
        set((state) => ({
          transactions: [
            { ...input, id: createId(), createdAt: new Date().toISOString() },
            ...state.transactions,
          ],
        })),

      updateTransaction: (id, patch) =>
        set((state) => ({
          transactions: state.transactions.map((transaction) =>
            transaction.id === id ? { ...transaction, ...patch } : transaction,
          ),
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter(
            (transaction) => transaction.id !== id,
          ),
        })),

      resetToSeed: () => set({ transactions: SEED_TRANSACTIONS }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'expense-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only persist data. Actions and the hydration flag are recreated.
      partialize: (state) => ({ transactions: state.transactions }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all store tests green.

- [ ] **Step 5: Commit**

```bash
git add store
git commit -m "feat: add zustand expense store with localStorage persistence"
```

---

### Task 4: Derived-state selectors

**Files:**
- Create: `lib/selectors.ts`
- Create: `lib/selectors.test.ts`

**Interfaces:**
- Consumes: `Transaction` from `@/types/transaction`; `getCategory` from `@/types/transaction`
- Produces, all pure functions taking `Transaction[]`:
  - `getTotalIncome(transactions): number`
  - `getTotalExpense(transactions): number`
  - `getBalance(transactions): number`
  - `getRecentTransactions(transactions, limit?: number): Transaction[]`
  - `getMonthlySummary(transactions, monthKey: string): { income: number; expense: number; net: number }`
  - `getExpenseByCategory(transactions): CategoryBreakdown[]` where `CategoryBreakdown = { id: string; label: string; color: string; total: number; percentage: number }`

These take `Transaction[]` rather than the store state so components can select the stable `transactions` array reference from the store and derive with `useMemo`. Zustand v5 uses `useSyncExternalStore`, which warns and re-renders in a loop when a selector returns a freshly built array or object on every call; deriving in `useMemo` sidesteps that entirely and makes the functions testable without constructing a store.

- [ ] **Step 1: Write the failing selector tests**

Create `lib/selectors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  getBalance,
  getExpenseByCategory,
  getMonthlySummary,
  getRecentTransactions,
  getTotalExpense,
  getTotalIncome,
} from '@/lib/selectors'
import type { Transaction } from '@/types/transaction'

function txn(overrides: Partial<Transaction> & Pick<Transaction, 'id'>): Transaction {
  return {
    type: 'expense',
    amount: 10,
    category: 'food',
    date: '2026-03-10',
    createdAt: '2026-03-10T09:00:00.000Z',
    ...overrides,
  }
}

const transactions: Transaction[] = [
  txn({ id: '1', type: 'income', amount: 1000, category: 'salary', date: '2026-03-01' }),
  txn({ id: '2', type: 'income', amount: 500, category: 'freelance', date: '2026-02-20' }),
  txn({ id: '3', type: 'expense', amount: 300, category: 'food', date: '2026-03-05' }),
  txn({ id: '4', type: 'expense', amount: 100, category: 'food', date: '2026-03-08' }),
  txn({ id: '5', type: 'expense', amount: 100, category: 'transport', date: '2026-02-11' }),
]

describe('totals', () => {
  it('sums income', () => {
    expect(getTotalIncome(transactions)).toBe(1500)
  })

  it('sums expenses', () => {
    expect(getTotalExpense(transactions)).toBe(500)
  })

  it('computes balance as income minus expense', () => {
    expect(getBalance(transactions)).toBe(1000)
  })

  it('returns zero for an empty list', () => {
    expect(getBalance([])).toBe(0)
    expect(getTotalIncome([])).toBe(0)
    expect(getTotalExpense([])).toBe(0)
  })
})

describe('getRecentTransactions', () => {
  it('returns the newest first, limited', () => {
    const recent = getRecentTransactions(transactions, 2)
    expect(recent.map((t) => t.id)).toEqual(['4', '3'])
  })

  it('does not mutate the input array', () => {
    const order = transactions.map((t) => t.id)
    getRecentTransactions(transactions, 3)
    expect(transactions.map((t) => t.id)).toEqual(order)
  })

  it('breaks date ties with createdAt, newest first', () => {
    const sameDay = [
      txn({ id: 'early', date: '2026-03-10', createdAt: '2026-03-10T08:00:00.000Z' }),
      txn({ id: 'late', date: '2026-03-10', createdAt: '2026-03-10T20:00:00.000Z' }),
    ]
    expect(getRecentTransactions(sameDay, 1).map((t) => t.id)).toEqual(['late'])
  })
})

describe('getMonthlySummary', () => {
  it('includes only transactions in the given month', () => {
    expect(getMonthlySummary(transactions, '2026-03')).toEqual({
      income: 1000,
      expense: 400,
      net: 600,
    })
  })

  it('returns zeroes for a month with no transactions', () => {
    expect(getMonthlySummary(transactions, '2025-01')).toEqual({
      income: 0,
      expense: 0,
      net: 0,
    })
  })
})

describe('getExpenseByCategory', () => {
  it('groups expenses by category, largest first, with percentages', () => {
    const breakdown = getExpenseByCategory(transactions)
    expect(breakdown.map((entry) => entry.id)).toEqual(['food', 'transport'])
    expect(breakdown[0].total).toBe(400)
    expect(breakdown[0].percentage).toBe(80)
    expect(breakdown[1].percentage).toBe(20)
  })

  it('ignores income', () => {
    const breakdown = getExpenseByCategory(transactions)
    expect(breakdown.some((entry) => entry.id === 'salary')).toBe(false)
  })

  it('returns an empty array rather than NaN percentages when there are no expenses', () => {
    const incomeOnly = [txn({ id: 'i', type: 'income', amount: 10, category: 'salary' })]
    expect(getExpenseByCategory(incomeOnly)).toEqual([])
  })

  it('carries the category label and color', () => {
    const [top] = getExpenseByCategory(transactions)
    expect(top.label).toBe('Food & Drink')
    expect(top.color).toBe('#fb923c')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `@/lib/selectors`.

- [ ] **Step 3: Write the selectors**

Create `lib/selectors.ts`:

```ts
import { getCategory } from '@/types/transaction'
import type { Transaction } from '@/types/transaction'

export interface CategoryBreakdown {
  id: string
  label: string
  color: string
  total: number
  percentage: number
}

export interface MonthlySummary {
  income: number
  expense: number
  net: number
}

function sumBy(transactions: Transaction[], type: Transaction['type']): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0)
}

export function getTotalIncome(transactions: Transaction[]): number {
  return sumBy(transactions, 'income')
}

export function getTotalExpense(transactions: Transaction[]): number {
  return sumBy(transactions, 'expense')
}

export function getBalance(transactions: Transaction[]): number {
  return getTotalIncome(transactions) - getTotalExpense(transactions)
}

export function getRecentTransactions(
  transactions: Transaction[],
  limit = 5,
): Transaction[] {
  return [...transactions]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, limit)
}

/** `monthKey` is 'YYYY-MM'. */
export function getMonthlySummary(
  transactions: Transaction[],
  monthKey: string,
): MonthlySummary {
  const inMonth = transactions.filter((transaction) =>
    transaction.date.startsWith(monthKey),
  )
  const income = getTotalIncome(inMonth)
  const expense = getTotalExpense(inMonth)
  return { income, expense, net: income - expense }
}

export function getExpenseByCategory(
  transactions: Transaction[],
): CategoryBreakdown[] {
  const expenses = transactions.filter(
    (transaction) => transaction.type === 'expense',
  )
  const total = expenses.reduce((sum, transaction) => sum + transaction.amount, 0)
  if (total === 0) return []

  const totalsById = new Map<string, number>()
  for (const transaction of expenses) {
    totalsById.set(
      transaction.category,
      (totalsById.get(transaction.category) ?? 0) + transaction.amount,
    )
  }

  return [...totalsById.entries()]
    .map(([id, categoryTotal]) => {
      const category = getCategory(id)
      return {
        id,
        label: category.label,
        color: category.color,
        total: categoryTotal,
        percentage: (categoryTotal / total) * 100,
      }
    })
    .sort((a, b) => b.total - a.total)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all selector tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/selectors.ts lib/selectors.test.ts
git commit -m "feat: add derived-state selectors for totals, recents, and categories"
```

---

### Task 5: Theme shell and the glass primitives

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `components/shared/glass-card.tsx`
- Create: `components/shared/stat-card.tsx`
- Create: `components/shared/store-hydration.tsx`

**Interfaces:**
- Consumes: `useExpenseStore` from `@/store/use-expense-store`; `cn` from `@/lib/utils` (created by the shadcn CLI in Task 1)
- Produces:
  - `<GlassCard className? as? children>` — the only definition of the glass surface
  - `<StatCard label value hint? accent? className? children?>` where `accent` is `'default' | 'income' | 'expense'`
  - `<StoreHydration />` — mounts in the layout, triggers persist rehydration in an effect
  - a dark gradient page background

- [ ] **Step 1: Add the gradient backdrop to globals.css**

Append to `app/globals.css`, after whatever the shadcn CLI wrote. Two blurred color blobs sit behind the page, which is what gives the glass surfaces something to refract:

```css
body {
  min-height: 100vh;
  background-color: #05070f;
  color: #e2e8f0;
}

/* Ambient gradient blobs behind the glass surfaces. */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(60rem 40rem at 12% -10%, rgba(56, 189, 248, 0.22), transparent 60%),
    radial-gradient(50rem 35rem at 88% 8%, rgba(167, 139, 250, 0.20), transparent 60%),
    radial-gradient(45rem 35rem at 60% 110%, rgba(52, 211, 153, 0.16), transparent 60%);
  pointer-events: none;
}
```

- [ ] **Step 2: Force dark mode and set metadata in the layout**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { StoreHydration } from '@/components/shared/store-hydration'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Expense Dashboard',
  description: 'Track income and spending at a glance.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <StoreHydration />
        {children}
      </body>
    </html>
  )
}
```

If the scaffold's `globals.css` maps a different font variable (older scaffolds use `--font-geist-sans`), keep the scaffold's variable name and font rather than fighting it — only the `className="dark"` on `<html>` and the `<StoreHydration />` mount are required here.

- [ ] **Step 3: Write the hydration trigger**

Create `components/shared/store-hydration.tsx`. This is the other half of `skipHydration` from Task 3:

```tsx
'use client'

import { useEffect } from 'react'
import { useExpenseStore } from '@/store/use-expense-store'

/**
 * Rehydrates the persisted store after the first client render, so the server
 * render and the first client render both start from seed state and match.
 */
export function StoreHydration() {
  useEffect(() => {
    void useExpenseStore.persist.rehydrate()
  }, [])

  return null
}
```

- [ ] **Step 4: Write GlassCard**

Create `components/shared/glass-card.tsx`. Every glass value in the app lives here:

```tsx
import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function GlassCard({ className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10',
        'bg-white/[0.06] backdrop-blur-xl',
        'shadow-[0_8px_32px_rgba(0,0,0,0.35)]',
        'p-5',
        // Top highlight, the detail that reads as a glass edge.
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Write StatCard**

Create `components/shared/stat-card.tsx`:

```tsx
import { GlassCard } from '@/components/shared/glass-card'
import { cn } from '@/lib/utils'

const ACCENT_CLASS = {
  default: 'text-slate-50',
  income: 'text-emerald-400',
  expense: 'text-rose-400',
} as const

interface StatCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  accent?: keyof typeof ACCENT_CLASS
  className?: string
  /** Overrides the value's type scale, e.g. for a hero figure. */
  valueClassName?: string
  children?: React.ReactNode
}

export function StatCard({
  label,
  value,
  hint,
  accent = 'default',
  className,
  valueClassName,
  children,
}: StatCardProps) {
  return (
    <GlassCard className={cn('flex flex-col justify-between', className)}>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <div className="mt-3">
        <p
          className={cn(
            'text-3xl font-semibold tracking-tight',
            ACCENT_CLASS[accent],
            valueClassName,
          )}
        >
          {value}
        </p>
        {hint ? <div className="mt-1 text-sm text-slate-400">{hint}</div> : null}
      </div>
      {children}
    </GlassCard>
  )
}
```

- [ ] **Step 6: Verify the build and commit**

Run: `npm run build`
Expected: build succeeds. (`app/page.tsx` is still the scaffold's default page; that is fine.)

```bash
git add app components
git commit -m "feat: add dark glass theme shell, GlassCard, StatCard, and hydration trigger"
```

---

### Task 6: Dashboard bento grid and the four cards

**Files:**
- Create: `components/dashboard/dashboard-header.tsx`
- Create: `components/dashboard/balance-card.tsx`
- Create: `components/dashboard/income-expense-card.tsx`
- Create: `components/dashboard/category-breakdown-card.tsx`
- Create: `components/dashboard/recent-transactions-card.tsx`
- Create: `components/transactions/transaction-item.tsx`
- Create: `components/shared/card-skeleton.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `GlassCard`, `StatCard`; `useExpenseStore`; every selector from `@/lib/selectors`; `formatCurrency`, `formatSignedAmount`, `formatRelativeDay`, `currentMonthKey` from `@/lib/format`; `getCategory` from `@/types/transaction`
- Produces: `<BalanceCard className? />`, `<IncomeExpenseCard className? />`, `<CategoryBreakdownCard className? />`, `<RecentTransactionsCard className? />`, `<TransactionItem transaction />`, `<CardSkeleton lines? />`, and the dashboard page

Every card is a client component and follows the same shape: select the stable `transactions` array from the store, derive with `useMemo`, and render `<CardSkeleton />` until `hasHydrated` is true.

- [ ] **Step 1: Write the skeleton placeholder**

Create `components/shared/card-skeleton.tsx`:

```tsx
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded-full bg-white/[0.07]"
          style={{ width: `${90 - index * 15}%` }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write the dashboard header**

Create `components/dashboard/dashboard-header.tsx`. The Add button is wired up in Task 7; for now it renders the dialog trigger placeholder as a plain button:

```tsx
export function DashboardHeader() {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
          Expense Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Your money at a glance.
        </p>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Write the balance card**

Create `components/dashboard/balance-card.tsx`:

This is the card that uses `StatCard`; the other three have bespoke bodies and compose `GlassCard` directly.

```tsx
'use client'

import { useMemo } from 'react'
import { CardSkeleton } from '@/components/shared/card-skeleton'
import { GlassCard } from '@/components/shared/glass-card'
import { StatCard } from '@/components/shared/stat-card'
import { formatCurrency } from '@/lib/format'
import { getBalance, getTotalExpense, getTotalIncome } from '@/lib/selectors'
import { useExpenseStore } from '@/store/use-expense-store'

export function BalanceCard({ className }: { className?: string }) {
  const transactions = useExpenseStore((state) => state.transactions)
  const hasHydrated = useExpenseStore((state) => state.hasHydrated)

  const { balance, income, expense } = useMemo(
    () => ({
      balance: getBalance(transactions),
      income: getTotalIncome(transactions),
      expense: getTotalExpense(transactions),
    }),
    [transactions],
  )

  if (!hasHydrated) {
    return (
      <GlassCard className={className}>
        <CardSkeleton lines={2} />
      </GlassCard>
    )
  }

  return (
    <StatCard
      className={className}
      label="Total Balance"
      value={formatCurrency(balance)}
      valueClassName="text-4xl md:text-5xl"
      hint={
        <span className="flex gap-6">
          <span>
            Income{' '}
            <span className="font-medium text-emerald-400">
              {formatCurrency(income)}
            </span>
          </span>
          <span>
            Spent{' '}
            <span className="font-medium text-rose-400">
              {formatCurrency(expense)}
            </span>
          </span>
        </span>
      }
    />
  )
}
```

- [ ] **Step 4: Write the monthly income vs. expense card**

Create `components/dashboard/income-expense-card.tsx`. The two bars are scaled against the larger of the two values, so the bigger one always fills the track:

```tsx
'use client'

import { useMemo } from 'react'
import { GlassCard } from '@/components/shared/glass-card'
import { CardSkeleton } from '@/components/shared/card-skeleton'
import { currentMonthKey, formatCurrency } from '@/lib/format'
import { getMonthlySummary } from '@/lib/selectors'
import { useExpenseStore } from '@/store/use-expense-store'

export function IncomeExpenseCard({ className }: { className?: string }) {
  const transactions = useExpenseStore((state) => state.transactions)
  const hasHydrated = useExpenseStore((state) => state.hasHydrated)

  const summary = useMemo(
    () => getMonthlySummary(transactions, currentMonthKey()),
    [transactions],
  )

  const scale = Math.max(summary.income, summary.expense, 1)

  return (
    <GlassCard className={className}>
      {!hasHydrated ? (
        <CardSkeleton lines={2} />
      ) : (
        <div className="flex h-full flex-col justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            This Month
          </p>
          <div className="mt-4 space-y-4">
            <Bar
              label="Income"
              value={summary.income}
              width={(summary.income / scale) * 100}
              barClass="bg-emerald-400"
              valueClass="text-emerald-400"
            />
            <Bar
              label="Expense"
              value={summary.expense}
              width={(summary.expense / scale) * 100}
              barClass="bg-rose-400"
              valueClass="text-rose-400"
            />
          </div>
          <p className="mt-4 text-sm text-slate-400">
            Net{' '}
            <span className="font-medium text-slate-100">
              {formatCurrency(summary.net)}
            </span>
          </p>
        </div>
      )}
    </GlassCard>
  )
}

function Bar({
  label,
  value,
  width,
  barClass,
  valueClass,
}: {
  label: string
  value: number
  width: number
  barClass: string
  valueClass: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className={`font-medium ${valueClass}`}>{formatCurrency(value)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write the category breakdown card**

Create `components/dashboard/category-breakdown-card.tsx`. The donut is a CSS `conic-gradient`, so no charting library is needed yet; `getExpenseByCategory` already returns chart-ready data when you swap one in:

```tsx
'use client'

import { useMemo } from 'react'
import { GlassCard } from '@/components/shared/glass-card'
import { CardSkeleton } from '@/components/shared/card-skeleton'
import { formatCurrency } from '@/lib/format'
import { getExpenseByCategory } from '@/lib/selectors'
import type { CategoryBreakdown } from '@/lib/selectors'
import { useExpenseStore } from '@/store/use-expense-store'

function buildConicGradient(breakdown: CategoryBreakdown[]): string {
  let cursor = 0
  const stops = breakdown.map((entry) => {
    const start = cursor
    cursor += entry.percentage
    return `${entry.color} ${start}% ${cursor}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export function CategoryBreakdownCard({ className }: { className?: string }) {
  const transactions = useExpenseStore((state) => state.transactions)
  const hasHydrated = useExpenseStore((state) => state.hasHydrated)

  const breakdown = useMemo(
    () => getExpenseByCategory(transactions),
    [transactions],
  )
  const top = breakdown.slice(0, 3)

  return (
    <GlassCard className={className}>
      {!hasHydrated ? (
        <CardSkeleton lines={3} />
      ) : (
        <div className="flex h-full flex-col">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            By Category
          </p>

          {breakdown.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">No spending yet.</p>
          ) : (
            <div className="mt-4 flex items-center gap-4">
              <div
                className="relative h-20 w-20 shrink-0 rounded-full"
                style={{ background: buildConicGradient(breakdown) }}
                role="img"
                aria-label={`Spending split across ${breakdown.length} categories`}
              >
                <div className="absolute inset-[22%] rounded-full bg-[#0b1020]" />
              </div>

              <ul className="min-w-0 flex-1 space-y-2">
                {top.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate text-slate-300">{entry.label}</span>
                    <span className="ml-auto shrink-0 text-slate-400">
                      {Math.round(entry.percentage)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {breakdown.length > 0 ? (
            <p className="mt-auto pt-4 text-sm text-slate-400">
              Top{' '}
              <span className="font-medium text-slate-100">
                {formatCurrency(breakdown[0].total)}
              </span>{' '}
              on {breakdown[0].label}
            </p>
          ) : null}
        </div>
      )}
    </GlassCard>
  )
}
```

- [ ] **Step 6: Write the transaction row**

Create `components/transactions/transaction-item.tsx`:

```tsx
import { formatRelativeDay, formatSignedAmount } from '@/lib/format'
import { getCategory } from '@/types/transaction'
import type { Transaction } from '@/types/transaction'

export function TransactionItem({ transaction }: { transaction: Transaction }) {
  const category = getCategory(transaction.category)
  const isIncome = transaction.type === 'income'

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.04]">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        style={{
          backgroundColor: `${category.color}22`,
          color: category.color,
        }}
        aria-hidden
      >
        {category.label.slice(0, 1)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">
          {transaction.note?.trim() || category.label}
        </p>
        <p className="text-xs text-slate-500">
          {category.label} · {formatRelativeDay(transaction.date)}
        </p>
      </div>

      <span
        className={`shrink-0 text-sm font-medium tabular-nums ${
          isIncome ? 'text-emerald-400' : 'text-slate-200'
        }`}
      >
        {formatSignedAmount(transaction.type, transaction.amount)}
      </span>
    </div>
  )
}
```

- [ ] **Step 7: Write the recent transactions card**

Create `components/dashboard/recent-transactions-card.tsx`:

```tsx
'use client'

import { useMemo } from 'react'
import { GlassCard } from '@/components/shared/glass-card'
import { CardSkeleton } from '@/components/shared/card-skeleton'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { getRecentTransactions } from '@/lib/selectors'
import { useExpenseStore } from '@/store/use-expense-store'

export function RecentTransactionsCard({ className }: { className?: string }) {
  const transactions = useExpenseStore((state) => state.transactions)
  const hasHydrated = useExpenseStore((state) => state.hasHydrated)

  const recent = useMemo(
    () => getRecentTransactions(transactions, 7),
    [transactions],
  )

  return (
    <GlassCard className={className}>
      {!hasHydrated ? (
        <CardSkeleton lines={5} />
      ) : (
        <div className="flex h-full flex-col">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Recent Transactions
          </p>

          {recent.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              Nothing yet. Add your first transaction.
            </p>
          ) : (
            <div className="mt-3 -mx-2 flex-1 space-y-0.5 overflow-y-auto">
              {recent.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}
```

- [ ] **Step 8: Assemble the bento grid**

Replace `app/page.tsx`. Recent Transactions is placed explicitly at column 3, rows 1–2; the other three auto-place around it. DOM order is chosen so the mobile single-column stack reads balance, month, categories, recents:

```tsx
import { BalanceCard } from '@/components/dashboard/balance-card'
import { CategoryBreakdownCard } from '@/components/dashboard/category-breakdown-card'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { IncomeExpenseCard } from '@/components/dashboard/income-expense-card'
import { RecentTransactionsCard } from '@/components/dashboard/recent-transactions-card'

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <DashboardHeader />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[minmax(190px,auto)]">
        <BalanceCard className="md:col-span-2" />
        <IncomeExpenseCard className="md:col-span-1" />
        <CategoryBreakdownCard className="md:col-span-1" />
        <RecentTransactionsCard className="md:col-span-2 md:col-start-3 md:row-start-1 md:row-span-2" />
      </div>
    </main>
  )
}
```

- [ ] **Step 9: Verify**

Run: `npm run build && npm run lint`
Expected: both succeed.

Run: `npm run dev`, open http://localhost:3000, and confirm: four glass cards in the bento arrangement, seeded numbers visible, no hydration warning in the browser console, and a sane single-column stack at a narrow width.

- [ ] **Step 10: Commit**

```bash
git add app components
git commit -m "feat: add bento dashboard with balance, monthly, category, and recent cards"
```

---

### Task 7: Add Transaction dialog and form

**Files:**
- Create: `components/transactions/transaction-form.tsx`
- Create: `components/transactions/add-transaction-dialog.tsx`
- Modify: `components/dashboard/dashboard-header.tsx`

**Interfaces:**
- Consumes: shadcn `Dialog`, `Button`, `Input`, `Label`, `Select`, `Form` from `@/components/ui/*`; `useExpenseStore`; `categoriesForType`, `TransactionType` from `@/types/transaction`; `toIsoDate` from `@/lib/format`
- Produces: `<AddTransactionDialog />` (self-contained trigger + dialog), `<TransactionForm onSubmitted />`

The date field is a native `<input type="date">` through the shadcn `Input`, deliberately: a calendar popover would pull in `react-day-picker` and its own version constraints for no gain on a single date field.

- [ ] **Step 1: Write the form**

Create `components/transactions/transaction-form.tsx`:

```tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toIsoDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useExpenseStore } from '@/store/use-expense-store'
import { categoriesForType } from '@/types/transaction'
import type { TransactionType } from '@/types/transaction'

// `amount` is validated as a string and converted on submit. Using
// `z.coerce.number()` would make the schema's input and output types differ,
// which trips up `zodResolver`'s generics, and the option-object spelling for
// its error message differs between zod v3 and v4. A string field sidesteps both.
const formSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z
    .string()
    .min(1, 'Enter an amount')
    .refine((value) => Number(value) > 0, 'Amount must be greater than zero'),
  category: z.string().min(1, 'Pick a category'),
  date: z.string().min(1, 'Pick a date'),
  note: z.string().max(120, 'Keep the note under 120 characters').optional(),
})

type FormValues = z.infer<typeof formSchema>

export function TransactionForm({ onSubmitted }: { onSubmitted: () => void }) {
  const addTransaction = useExpenseStore((state) => state.addTransaction)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'expense',
      amount: '',
      category: '',
      date: toIsoDate(new Date()),
      note: '',
    },
  })

  const type = form.watch('type')

  function setType(next: TransactionType) {
    form.setValue('type', next)
    // Categories are type-specific, so a stale selection must be cleared.
    form.setValue('category', '')
  }

  function onSubmit(values: FormValues) {
    addTransaction({
      type: values.type,
      amount: Number(values.amount),
      category: values.category,
      date: values.date,
      note: values.note?.trim() || undefined,
    })
    form.reset({
      type: values.type,
      amount: '',
      category: '',
      date: toIsoDate(new Date()),
      note: '',
    })
    onSubmitted()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-1">
          {(['expense', 'income'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors',
                type === option
                  ? option === 'income'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                  : 'text-slate-400 hover:text-slate-200',
              )}
              aria-pressed={type === option}
            >
              {option}
            </button>
          ))}
        </div>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoriesForType(type).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Input placeholder="Optional" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Add transaction
        </Button>
      </form>
    </Form>
  )
}
```

- [ ] **Step 2: Write the dialog**

Create `components/transactions/add-transaction-dialog.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TransactionForm } from '@/components/transactions/transaction-form'

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl">Add transaction</Button>
      </DialogTrigger>

      <DialogContent className="border-white/10 bg-slate-950/80 backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New transaction</DialogTitle>
          <DialogDescription>
            Record income or an expense. It saves to this browser.
          </DialogDescription>
        </DialogHeader>

        <TransactionForm onSubmitted={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
```

The translucent `DialogContent` background is the one place outside `GlassCard` that needs glass values, because shadcn owns the dialog surface; keep the classes identical to `GlassCard`'s so the two read as one material.

- [ ] **Step 3: Mount the dialog in the header**

Modify `components/dashboard/dashboard-header.tsx` — add the import and render the dialog in the header's right-hand slot:

```tsx
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'

export function DashboardHeader() {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
          Expense Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">Your money at a glance.</p>
      </div>
      <AddTransactionDialog />
    </header>
  )
}
```

- [ ] **Step 4: Verify end to end**

Run: `npm run build`
Expected: succeeds.

Run `npm run dev` and confirm by hand:
1. Clicking "Add transaction" opens the dialog.
2. Submitting empty shows validation messages, not a crash.
3. Switching the type toggle to Income changes the category list to Salary / Freelance / Other.
4. Adding an expense of 25 in Food closes the dialog, prepends the row to Recent Transactions, lowers the balance by 25, and grows the Food slice.
5. Reloading the page keeps the new transaction.

- [ ] **Step 5: Commit**

```bash
git add components
git commit -m "feat: add transaction dialog with validated form"
```

---

### Task 8: Framer Motion micro-interactions

**Files:**
- Create: `components/shared/animated-number.tsx`
- Create: `components/dashboard/bento-grid.tsx`
- Modify: `components/dashboard/balance-card.tsx`
- Modify: `components/dashboard/recent-transactions-card.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `motion`, `AnimatePresence`, `animate`, `useMotionValue`, `useReducedMotion` from `framer-motion`
- Produces: `<AnimatedNumber value className? />`, `<BentoGrid>{children}</BentoGrid>`, `<BentoItem className?>{children}</BentoItem>`

Every animation checks `useReducedMotion()` and degrades to a static render.

- [ ] **Step 1: Write the animated number**

Create `components/shared/animated-number.tsx`:

```tsx
'use client'

import { animate, useMotionValue, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/format'

export function AnimatedNumber({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  const motionValue = useMotionValue(value)
  const [display, setDisplay] = useState(() => formatCurrency(value))

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(formatCurrency(value))
      return
    }

    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(formatCurrency(latest)),
    })

    return () => controls.stop()
  }, [value, motionValue, reduceMotion])

  return <span className={className}>{display}</span>
}
```

- [ ] **Step 2: Use it for the balance**

In `components/dashboard/balance-card.tsx`, import `AnimatedNumber` and change the `StatCard`'s `value` prop from the static string to the animated component:

```tsx
<StatCard
  className={className}
  label="Total Balance"
  value={<AnimatedNumber value={balance} />}
  valueClassName="text-4xl md:text-5xl"
  hint={/* unchanged */}
/>
```

`formatCurrency` is still imported for the income and spent figures in `hint` — animating everything at once is noise, so only the headline balance counts up.

Leave the income and spent figures as plain `formatCurrency` — animating everything at once is noise.

- [ ] **Step 3: Write the staggered grid wrapper**

Create `components/dashboard/bento-grid.tsx`:

```tsx
'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function BentoGrid({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 md:grid-cols-4 md:auto-rows-[minmax(190px,auto)]"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: reduceMotion ? 0 : 0.07 },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

export function BentoItem({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={cn('min-w-0', className)}
      variants={{
        hidden: reduceMotion ? {} : { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      }}
      whileHover={reduceMotion ? undefined : { y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      {children}
    </motion.div>
  )
}
```

`BentoItem` carries the grid spans and the card fills it, so update the cards' usage accordingly in the next step — the card components keep taking `className` but now receive `h-full`.

- [ ] **Step 4: Rewire the page through the grid wrapper**

Replace the grid block in `app/page.tsx`:

```tsx
import { BentoGrid, BentoItem } from '@/components/dashboard/bento-grid'
// …other imports unchanged

<BentoGrid>
  <BentoItem className="md:col-span-2">
    <BalanceCard className="h-full" />
  </BentoItem>
  <BentoItem className="md:col-span-1">
    <IncomeExpenseCard className="h-full" />
  </BentoItem>
  <BentoItem className="md:col-span-1">
    <CategoryBreakdownCard className="h-full" />
  </BentoItem>
  <BentoItem className="md:col-span-2 md:col-start-3 md:row-start-1 md:row-span-2">
    <RecentTransactionsCard className="h-full" />
  </BentoItem>
</BentoGrid>
```

- [ ] **Step 5: Animate the transaction list**

In `components/dashboard/recent-transactions-card.tsx`, wrap the list so a newly added transaction slides in. Add the imports and replace the mapped list:

```tsx
'use client'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
// …existing imports

// inside the component:
const reduceMotion = useReducedMotion()

// replace the list markup:
<div className="mt-3 -mx-2 flex-1 space-y-0.5 overflow-y-auto">
  <AnimatePresence initial={false} mode="popLayout">
    {recent.map((transaction) => (
      <motion.div
        key={transaction.id}
        layout={!reduceMotion}
        initial={reduceMotion ? false : { opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, x: 12 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <TransactionItem transaction={transaction} />
      </motion.div>
    ))}
  </AnimatePresence>
</div>
```

- [ ] **Step 6: Verify**

Run: `npm run build && npm run lint && npm test`
Expected: all three succeed.

Run `npm run dev` and confirm: cards fade up in sequence on load, hovering a card lifts it slightly, the balance counts up, and adding a transaction slides a new row into the list while the balance re-counts. Then enable the OS "reduce motion" setting and confirm the dashboard renders fully with no movement.

- [ ] **Step 7: Commit**

```bash
git add app components
git commit -m "feat: add framer-motion entrance, hover, count-up, and list transitions"
```

---

## Verification Checklist

Run before declaring the feature complete:

- [ ] `npm test` — all format, store, and selector tests pass
- [ ] `npx tsc --noEmit` — no type errors
- [ ] `npm run lint` — clean
- [ ] `npm run build` — production build succeeds
- [ ] Browser console shows no hydration mismatch warning on first load
- [ ] Adding a transaction updates all four cards, and it survives a reload
- [ ] Narrow viewport stacks the grid to one column with no horizontal scroll
