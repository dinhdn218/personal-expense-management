import { describe, expect, it } from 'vitest'
import {
  currentMonthKey,
  formatCurrency,
  formatDate,
  formatRelativeDay,
  formatSignedAmount,
  toIsoDate,
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

describe('toIsoDate', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
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
    expect(formatRelativeDay(toIsoDate(new Date()))).toBe('Today')
  })

  it('labels yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(formatRelativeDay(toIsoDate(yesterday))).toBe('Yesterday')
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
