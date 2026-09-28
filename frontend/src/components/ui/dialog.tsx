import * as React from "react"
import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

const DialogTitleContext = React.createContext<string | undefined>(undefined)

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const titleId = React.useId()

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement as HTMLElement | null
    containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange?.(false)
        return
      }

      if (e.key !== "Tab" || !containerRef.current) return

      const focusable = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [open, onOpenChange])

  if (!open) return null
  return (
    <DialogTitleContext.Provider value={titleId}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      >
        {children}
      </div>
    </DialogTitleContext.Provider>
  )
}

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "border-border bg-card relative w-full max-w-lg rounded-xl border p-6 shadow-xl",
        className
      )}
    >
      {children}
    </div>
  )
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("mb-4 flex flex-col space-y-1.5", className)}>{children}</div>
}

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const titleId = React.useContext(DialogTitleContext)
  return (
    <h2 id={titleId} className={cn("text-foreground text-lg font-bold tracking-tight", className)}>
      {children}
    </h2>
  )
}

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={cn("text-muted-foreground text-sm", className)}>{children}</p>
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
    >
      {children}
    </div>
  )
}
