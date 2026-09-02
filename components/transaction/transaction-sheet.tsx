'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { TransactionForm } from '@/components/transaction/transaction-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

/** Kính đậm hơn thẻ thường — dùng cho cả dialog lẫn sheet. */
const modalGlass =
  'border-glass-border bg-glass backdrop-blur-[28px] supports-[backdrop-filter]:bg-glass'

const TITLE = 'Thêm giao dịch'
const SUBTITLE = 'Gõ nhanh: 300k, 1.5tr đều hiểu được.'

export function TransactionSheet({
  label = '+ Thêm giao dịch',
  triggerClassName,
}: {
  label?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  // Chỉ quyết định vỏ nào sau khi mount; vỏ chỉ hiện sau tương tác nên không
  // ảnh hưởng lần render đầu.
  const isWide = useMediaQuery('(min-width: 768px)')

  const close = () => setOpen(false)

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-[42px] shrink-0 items-center justify-center rounded-[13px] bg-accent px-[18px]',
          'text-[14.5px] font-extrabold text-accent-foreground',
          'transition-[filter,background-color] duration-[120ms] hover:brightness-[1.06] active:brightness-90',
          triggerClassName,
        )}
      >
        {label}
      </motion.button>

      {isWide ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className={cn(modalGlass, 'w-[480px] gap-[18px] rounded-[26px] p-[22px] sm:max-w-[480px]')}
            showCloseButton={false}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-[21px] font-extrabold tracking-[-.015em]">
                  {TITLE}
                </DialogTitle>
                <DialogDescription className="text-[12.5px] font-medium text-muted">
                  {SUBTITLE}
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Đóng"
                className="flex size-[34px] shrink-0 items-center justify-center rounded-[11px] border border-glass-border text-[13px] transition-colors duration-[120ms] hover:bg-foreground/5"
              >
                ✕
              </button>
            </div>

            <TransactionForm variant="dialog" onDone={close} onCancel={close} />
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className={cn(
              modalGlass,
              'max-h-[94dvh] gap-4 overflow-y-auto rounded-t-[32px] px-[18px] pt-3 pb-[22px]',
              'no-scrollbar',
            )}
          >
            <div
              className="mx-auto h-1 w-10 shrink-0 rounded-full bg-foreground/25"
              aria-hidden
            />
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-[21px] font-extrabold tracking-[-.015em]">
                {TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] font-medium text-muted">
                {SUBTITLE}
              </SheetDescription>
            </div>

            <TransactionForm variant="sheet" onDone={close} onCancel={close} />
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
