import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { APP_TOAST_EVENT, AppToastDetail, AppToastVariant } from '../lib/toast'

const VARIANT_STYLES: Record<AppToastVariant, { wrapper: string; icon: JSX.Element }> = {
  info: {
    wrapper: 'bg-white border-slate-200 text-slate-800',
    icon: <Info className="h-5 w-5 text-[#012c54] shrink-0" />,
  },
  success: {
    wrapper: 'bg-white border-green-200 text-slate-800',
    icon: <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />,
  },
  error: {
    wrapper: 'bg-white border-red-200 text-slate-800',
    icon: <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />,
  },
}

/** Single app-wide toast host. Mount once at the app root. */
const GlobalToast = () => {
  const [toast, setToast] = useState<AppToastDetail | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<AppToastDetail>).detail
      if (!detail?.message) return

      setToast(detail)

      if (timerRef.current) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setToast(null), detail.duration ?? 5000)
    }

    window.addEventListener(APP_TOAST_EVENT, handleToast)
    return () => {
      window.removeEventListener(APP_TOAST_EVENT, handleToast)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  if (!toast) return null

  const styles = VARIANT_STYLES[toast.variant] ?? VARIANT_STYLES.info

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4">
      <div
        role="status"
        aria-live="polite"
        className={`flex items-start gap-3 rounded-2xl border shadow-lg px-4 py-3 ${styles.wrapper}`}
      >
        {styles.icon}
        <p className="text-sm leading-snug flex-1">{toast.message}</p>
        <button
          type="button"
          onClick={() => setToast(null)}
          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default GlobalToast
