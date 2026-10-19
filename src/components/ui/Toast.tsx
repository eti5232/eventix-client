import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import styles from './Toast.module.css'

type ToastKind = 'ok' | 'error'
interface ToastAction {
  label: string
  onClick: () => void
}
interface ToastItem {
  id: number
  kind: ToastKind
  text: string
  action?: ToastAction
}

interface ToastApi {
  show: (text: string, kind?: ToastKind, action?: ToastAction) => void
}

const ToastContext = createContext<ToastApi | null>(null)
let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const show = useCallback((text: string, kind: ToastKind = 'ok', action?: ToastAction) => {
    const id = nextId++
    setToasts((list) => [...list, { id, kind, text, action }])
    window.setTimeout(() => dismiss(id), action ? 7000 : 4500)
  }, [dismiss])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${t.kind === 'error' ? styles.error : ''}`}>
            <span>{t.text}</span>
            {t.action && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
