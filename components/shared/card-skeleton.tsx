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
