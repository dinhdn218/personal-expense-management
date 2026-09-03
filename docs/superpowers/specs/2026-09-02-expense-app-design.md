> [!WARNING]
> **Tài liệu đã lỗi thời — giữ lại chỉ để tra lịch sử.**
> Bản này mô tả thiết kế đầu tiên (tiếng Anh, USD, bảng màu khác) và **không**
> khớp với app hiện tại: app đã được dựng lại theo bản handoff "Ví Riêng"
> (tiếng Việt, VND, giao diện kính tối). Xem `README.md` ở gốc repo.

# Personal Expense Management Web App — Design

**Date:** 2026-09-02
**Status:** Approved

## Purpose

A client-only personal finance dashboard for tracking income and expenses. A
single user records transactions and sees their balance, monthly income-versus-
expense summary, recent activity, and spending broken down by category. There is
no backend, no authentication, and no multi-user support; all data lives in the
browser.

## Success Criteria

1. The dashboard renders as a bento grid with four cards: total balance, monthly
   income vs. expense, recent transactions, and expense by category.
2. A user can add a transaction (amount, type, category, date, note) through a
   dialog, and every card updates immediately.
3. Transactions survive a page reload.
4. The app builds and type-checks with no errors and no React hydration warnings.

## Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 14+, App Router | |
| Language | TypeScript, strict mode | |
| Styling | Tailwind CSS | |
| Components | shadcn/ui | Radix primitives |
| State | Zustand + `persist` middleware | localStorage |
| Forms | react-hook-form + zod | shipped with shadcn Form |
| Animation | Framer Motion | chosen over GSAP for declarative React integration |
| Theme | Dark-first | gradient backdrop behind glass surfaces |

Decisions resolved during brainstorming: Framer Motion over GSAP; localStorage
persistence over in-memory-only; dark-first theme over light-first or a
day-one toggle.

## Architecture

### Folder structure

```
app/
  layout.tsx                    fonts, theme, gradient backdrop
  page.tsx                      dashboard (bento grid)
  globals.css                   tailwind, CSS variables, glass utilities
components/
  ui/                           shadcn primitives (generated, not hand-edited)
  dashboard/
    balance-card.tsx
    income-expense-card.tsx
    recent-transactions-card.tsx
    category-breakdown-card.tsx
  transactions/
    add-transaction-dialog.tsx
    transaction-form.tsx
    transaction-item.tsx
  shared/
    glass-card.tsx              the single glassmorphism primitive
    stat-card.tsx               label + value + delta, built on GlassCard
store/
  use-expense-store.ts
lib/
  utils.ts                      cn()
  format.ts                     currency and date formatting
  selectors.ts                  all derived state
  seed-data.ts                  dummy transactions
types/
  transaction.ts
```

Two structural rules:

- `components/ui/` stays pure shadcn output so it can be regenerated. Project
  styling lives in `components/shared/`, `components/dashboard/`, and
  `components/transactions/`.
- Glassmorphism is defined in exactly one place, `GlassCard`. No other component
  writes `backdrop-blur` or a translucent background directly. Tuning the glass
  recipe means editing one file.

### Data model

```ts
export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number        // always positive; direction comes from `type`
  category: string      // category id, e.g. 'food'
  date: string          // ISO date, 'YYYY-MM-DD'
  note?: string
  createdAt: string     // ISO timestamp
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>
```

`amount` is unsigned and `type` carries the direction. Storing signed amounts
invites the bug where an expense is entered as `-50` and negated again during
summation.

Categories are a static list in `types/transaction.ts` — an id, a label, and an
accent color used by the category card. User-defined categories are out of scope.

### Store

```ts
interface ExpenseStore {
  transactions: Transaction[]
  hasHydrated: boolean
  addTransaction: (input: NewTransaction) => void
  updateTransaction: (id: string, patch: Partial<NewTransaction>) => void
  deleteTransaction: (id: string) => void
  resetToSeed: () => void
}
```

`addTransaction` generates `id` and `createdAt` inside the store so callers pass
only user-supplied fields. The store is created once at module scope and
persisted under the key `expense-store` with a `version` for future migrations.
Seed data populates the initial state, so a first-time visitor sees a populated
dashboard.

### Derived state

Derived values are **pure functions in `lib/selectors.ts`, not fields in the
store**. The store holds raw transactions as the single source of truth.

```ts
getTotalIncome(transactions): number
getTotalExpense(transactions): number
getBalance(transactions): number
getRecentTransactions(transactions, limit?): Transaction[]
getMonthlySummary(transactions, monthKey): { income, expense, net }
getExpenseByCategory(transactions): CategoryBreakdown[]
```

They take `Transaction[]` rather than the store state. Components select the
`transactions` array from the store — a stable reference that changes only when
transactions change — and derive inside `useMemo`:

```ts
const transactions = useExpenseStore((state) => state.transactions)
const balance = useMemo(() => getBalance(transactions), [transactions])
```

The alternative, a selector passed to `useExpenseStore` that builds a fresh
array or object on each call, is not viable under Zustand v5: it reads through
`useSyncExternalStore`, which sees a new snapshot identity on every render and
loops. Deriving in `useMemo` avoids that, and functions over a plain array are
testable without constructing a store.

Rejected alternatives: storing `totalIncome`/`totalExpense` as state fields
recomputed inside each action (every new action can silently forget to
recompute), and scattering the derivation logic across components rather than
centralizing it in one tested module.

### SSR hydration

`persist` plus the App Router produces a hydration mismatch when persisted values
are rendered during SSR: the server renders seed data while the client renders
localStorage data. The store therefore uses `onRehydrateStorage` to flip a
`hasHydrated` flag, and cards render a skeleton until it is true. This is
foundational, not a later patch.

### Dashboard layout

A four-column, two-row grid on desktop collapsing to one column on mobile:

```
┌─────────────────────┬───────────────────────┐
│  Total Balance      │  Recent Transactions  │
│  (2 cols x 1 row)   │                       │
├──────────┬──────────┤  (2 cols x 2 rows)    │
│ Income   │ Expense  │                       │
│ vs Spend │ by Cat.  │                       │
└──────────┴──────────┘───────────────────────┘
```

Base classes: `grid grid-cols-1 md:grid-cols-4 auto-rows-[minmax(180px,auto)]
gap-4`. Each card declares its own span. Recent Transactions takes the tall right
column because a scrolling list needs the vertical room.

### Transaction entry

A shadcn `Dialog` on desktop, holding a react-hook-form form validated by a zod
schema: amount (positive number), type (income/expense), category (from the
static list), date (defaults to today), and an optional note. Submitting calls
`addTransaction` and closes the dialog. Validation errors render inline through
the shadcn `Form` components.

### Animation

Framer Motion, kept subtle: staggered card entrance on mount, hover lift on
cards, `AnimatePresence` for dialog and for transaction list enter/exit, and an
animated count-up on the balance figure. Motion respects
`prefers-reduced-motion`.

## Out of Scope

Backend or API, authentication, multi-user, multi-currency, budgets and goals,
recurring transactions, CSV import/export, user-defined categories, and a real
charting library. Card 4 renders a styled category breakdown that a chart can
later replace; its selector already returns chart-ready data.

## Testing

Vitest for the pure logic that carries the correctness risk: selector math
(totals, balance, monthly filtering, category percentages) and store actions
(add/update/delete). Component and end-to-end tests are out of scope for this
iteration; the cards are thin renderings of tested selectors.
