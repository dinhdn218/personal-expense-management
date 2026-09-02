import { cn } from '@/lib/utils'

const SIZES = {
  desktop: { mark: 'size-[26px] rounded-[9px]', text: 'text-[17px]' },
  tablet: { mark: 'size-6 rounded-lg', text: 'text-[15.5px]' },
  mobile: { mark: 'size-[22px] rounded-[7px]', text: 'text-[16px]' },
} as const

export function Brand({
  size = 'desktop',
  className,
}: {
  size?: keyof typeof SIZES
  className?: string
}) {
  const s = SIZES[size]

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className={cn('shrink-0 bg-accent', s.mark)} aria-hidden />
      <span className={cn('font-extrabold tracking-[-.01em]', s.text)}>
        Ví Riêng
      </span>
    </div>
  )
}
