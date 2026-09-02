import { describe, expect, it } from 'vitest'
import {
  formatDayLabel,
  formatVnd,
  formatVndShort,
  parseAmountVnd,
} from '@/lib/format'

describe('parseAmountVnd — hậu tố nghìn', () => {
  it('nhận k, ngàn, nghìn', () => {
    expect(parseAmountVnd('300k')).toBe(300_000)
    expect(parseAmountVnd('300ngàn')).toBe(300_000)
    expect(parseAmountVnd('300nghìn')).toBe(300_000)
  })

  it('nhận chữ hoa', () => {
    expect(parseAmountVnd('300K')).toBe(300_000)
  })
})

describe('parseAmountVnd — hậu tố triệu', () => {
  it('nhận tr, triệu, m', () => {
    expect(parseAmountVnd('2tr')).toBe(2_000_000)
    expect(parseAmountVnd('2triệu')).toBe(2_000_000)
    expect(parseAmountVnd('2m')).toBe(2_000_000)
  })

  it('coi . và , là dấu thập phân khi có hậu tố', () => {
    expect(parseAmountVnd('1.5tr')).toBe(1_500_000)
    expect(parseAmountVnd('1,5tr')).toBe(1_500_000)
    expect(parseAmountVnd('1.5k')).toBe(1_500)
  })
})

describe('parseAmountVnd — không hậu tố', () => {
  it('coi . và , là dấu phân cách nghìn', () => {
    expect(parseAmountVnd('1.500.000')).toBe(1_500_000)
    expect(parseAmountVnd('1,500,000')).toBe(1_500_000)
  })

  it('nhận số trần', () => {
    expect(parseAmountVnd('250000')).toBe(250_000)
  })
})

describe('parseAmountVnd — dọn dẹp đầu vào', () => {
  it('bỏ qua khoảng trắng, đ và vnd', () => {
    expect(parseAmountVnd(' 412 k ')).toBe(412_000)
    expect(parseAmountVnd('412000đ')).toBe(412_000)
    expect(parseAmountVnd('412000 VND')).toBe(412_000)
  })

  it('luôn làm tròn về số nguyên đồng', () => {
    expect(parseAmountVnd('1,2345k')).toBe(1_235)
  })
})

describe('parseAmountVnd — không parse được thì null', () => {
  it.each(['', '   ', 'abc', '12abc', '300kk', '-500k', '0', '0k'])(
    'trả null cho %o',
    (input) => {
      expect(parseAmountVnd(input)).toBeNull()
    },
  )
})

describe('formatVnd', () => {
  it('dùng dấu chấm phân cách nghìn và hậu tố đ, không khoảng trắng', () => {
    expect(formatVnd(1_500_000)).toBe('1.500.000đ')
  })

  it('bỏ hậu tố khi unit: false', () => {
    expect(formatVnd(1_500_000, { unit: false })).toBe('1.500.000')
  })

  it('dùng dấu trừ thật U+2212 cho số âm khi bật sign', () => {
    expect(formatVnd(-65_000, { sign: true })).toBe('−65.000đ')
    expect(formatVnd(-65_000, { sign: true }).charCodeAt(0)).toBe(0x2212)
  })

  it('dùng dấu + cho số dương khi bật sign', () => {
    expect(formatVnd(22_000_000, { sign: true })).toBe('+22.000.000đ')
  })

  it('không gắn dấu cho số 0', () => {
    expect(formatVnd(0, { sign: true })).toBe('0đ')
  })
})

describe('formatVndShort', () => {
  it('rút gọn hàng triệu với dấu phẩy thập phân', () => {
    expect(formatVndShort(16_180_000)).toBe('16,18tr')
    expect(formatVndShort(1_500_000)).toBe('1,5tr')
  })

  it('rút gọn hàng nghìn', () => {
    expect(formatVndShort(65_000)).toBe('65k')
  })

  it('giữ nguyên số nhỏ', () => {
    expect(formatVndShort(900)).toBe('900')
  })
})

describe('formatDayLabel', () => {
  const now = new Date(2026, 8, 2, 21, 4) // 02/09/2026

  it('gọi hôm nay là "Hôm nay"', () => {
    expect(formatDayLabel(new Date(2026, 8, 2, 9, 0).toISOString(), now)).toBe(
      'Hôm nay',
    )
  })

  it('gọi hôm qua là "Hôm qua"', () => {
    expect(formatDayLabel(new Date(2026, 8, 1, 9, 0).toISOString(), now)).toBe(
      'Hôm qua',
    )
  })

  it('ngày cũ hơn thì ghi thứ và ngày/tháng, viết hoa chữ đầu', () => {
    expect(formatDayLabel(new Date(2026, 7, 29, 9, 0).toISOString(), now)).toBe(
      'Thứ Bảy · 29/8',
    )
  })
})
