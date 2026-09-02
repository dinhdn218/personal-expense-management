import { cn } from '@/lib/utils'

type GlassCardProps = React.HTMLAttributes<HTMLDivElement>

/**
 * The single definition of the glass surface. No other component should write
 * `backdrop-blur` or a translucent background directly — compose this instead,
 * so the material can be tuned in one place.
 */
export function GlassCard({ className, children, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 p-5',
        'bg-white/[0.06] backdrop-blur-xl',
        'shadow-[0_8px_32px_rgba(0,0,0,0.35)]',
        // Top highlight — the detail that reads as a glass edge.
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
