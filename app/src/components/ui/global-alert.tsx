import React from "react"
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

type AlertType = "success" | "warning" | "error" | "info"

type GlobalAlertProps = {
  type: AlertType
  title?: string
  message: string
  onClose?: () => void
}

const typeStyles: Record<AlertType, string> = {
  success:
    "border-emerald-500/40 bg-emerald-900/70 text-emerald-50 shadow-emerald-500/30",
  warning:
    "border-amber-400/50 bg-amber-900/80 text-amber-50 shadow-amber-400/30",
  error:
    "border-rose-500/50 bg-rose-950/80 text-rose-50 shadow-rose-500/40",
  info:
    "border-sky-500/50 bg-sky-950/80 text-sky-50 shadow-sky-500/40",
}

const typeIcon: Record<AlertType, React.ComponentType<{ className?: string }>> =
  {
    success: CheckCircle2,
    warning: AlertTriangle,
    error: XCircle,
    info: Info,
  }

export const GlobalAlert = ({
  type,
  title,
  message,
  onClose,
}: GlobalAlertProps) => {
  const Icon = typeIcon[type]

  return (
    <div className="pointer-events-auto fixed top-4 right-4 z-40 flex max-w-sm flex-col gap-3">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl",
          "bg-background/80 dark:bg-slate-950/80",
          "transition-transform transition-opacity duration-200 ease-out",
          typeStyles[type]
        )}
        role="status"
        aria-live="polite"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-white/0 to-white/10" />
        <div className="pointer-events-none absolute -inset-x-24 -top-24 h-40 bg-gradient-to-br from-white/10 via-transparent to-white/0 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/20">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1">
            {title && (
              <div className="text-sm font-semibold leading-snug">
                {title}
              </div>
            )}
            <div className="text-sm leading-snug text-white/90 dark:text-slate-100">
              {message}
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white/80 transition hover:bg-black/40 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-slate-950"
              aria-label="Dismiss alert"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

