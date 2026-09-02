'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const DIGIT = 'digit'
const UNIT = 'unit'

interface Key {
  label: string
  kind: typeof DIGIT | typeof UNIT
  value: string
}

/**
 * Bàn phím số riêng cho mobile. Lý do nó tồn tại là hai phím `k` và `tr`
 * (300k = 4 chạm, 1.5tr = 5 chạm), nên chúng nổi hơn phím số.
 */
const KEYS: Key[] = [
  { label: '1', kind: DIGIT, value: '1' },
  { label: '2', kind: DIGIT, value: '2' },
  { label: '3', kind: DIGIT, value: '3' },
  { label: 'k', kind: UNIT, value: 'k' },
  { label: '4', kind: DIGIT, value: '4' },
  { label: '5', kind: DIGIT, value: '5' },
  { label: '6', kind: DIGIT, value: '6' },
  { label: 'tr', kind: UNIT, value: 'tr' },
  { label: '7', kind: DIGIT, value: '7' },
  { label: '8', kind: DIGIT, value: '8' },
  { label: '9', kind: DIGIT, value: '9' },
  { label: ',', kind: DIGIT, value: ',' },
]

interface NumpadProps {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  canSubmit: boolean
}

export function Numpad({ value, onChange, onSubmit, canSubmit }: NumpadProps) {
  const append = (key: Key) => {
    // Đã có hậu tố thì không cho gõ tiếp hậu tố nữa.
    if (key.kind === UNIT && /[a-z]/i.test(value)) return
    onChange(value + key.value)
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {KEYS.map((key) => (
        <motion.button
          key={key.label}
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => append(key)}
          className={cn(
            'h-[56px] rounded-[14px] border transition-colors duration-[120ms]',
            key.kind === UNIT
              ? 'border-accent/50 bg-accent/16 text-[19px] font-extrabold text-accent'
              : 'border-glass-border bg-well text-[22px] font-bold',
          )}
        >
          {key.label}
        </motion.button>
      ))}

      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => onChange(value + '0')}
        className="h-[52px] rounded-[14px] border border-glass-border bg-well text-[22px] font-bold transition-colors duration-[120ms]"
      >
        0
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => onChange(value + '000')}
        className="h-[52px] rounded-[14px] border border-glass-border bg-well text-[22px] font-bold transition-colors duration-[120ms]"
      >
        000
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => onChange(value.slice(0, -1))}
        className="h-[52px] rounded-[14px] border border-glass-border bg-well text-[15px] font-bold transition-colors duration-[120ms]"
      >
        Xoá
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={onSubmit}
        disabled={!canSubmit}
        className={cn(
          'h-[52px] rounded-[14px] bg-accent text-[15px] font-extrabold text-accent-foreground',
          'transition-colors duration-[120ms] hover:brightness-[1.06] active:brightness-90',
          !canSubmit && 'opacity-40',
        )}
      >
        Lưu
      </motion.button>
    </div>
  )
}
