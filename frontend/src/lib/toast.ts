export type AppToastVariant = 'info' | 'success' | 'error'

export interface AppToastDetail {
  message: string
  variant: AppToastVariant
  duration: number
}

export const APP_TOAST_EVENT = 'app:toast'

/**
 * Fire-and-forget toast that any component can trigger without prop drilling.
 * Rendered by <GlobalToast /> which is mounted once at the app root.
 */
export const showAppToast = (
  message: string,
  variant: AppToastVariant = 'info',
  duration = 5000
) => {
  if (typeof window === 'undefined' || !message) return

  window.dispatchEvent(
    new CustomEvent<AppToastDetail>(APP_TOAST_EVENT, {
      detail: { message, variant, duration },
    })
  )
}
