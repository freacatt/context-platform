import React, {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
} from "react"
import { GlobalAlert } from "@/components/ui/global-alert"

type AlertType = "success" | "warning" | "error" | "info"

type AlertOptions = {
  type: AlertType
  title?: string
  message: string
  durationMs?: number
}

type AlertState = {
  type: AlertType
  title?: string
  message: string
}

type AlertContextValue = {
  showAlert: (options: AlertOptions) => void
  hideAlert: () => void
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined)

export const useAlert = () => {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider")
  }
  return context
}

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alert, setAlert] = useState<AlertState | null>(null)
  const timeoutRef = useRef<number | undefined>(undefined)

  const clearTimer = () => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
  }

  const hideAlert = () => {
    clearTimer()
    setAlert(null)
  }

  const showAlert = ({
    type,
    title,
    message,
    durationMs = 5000,
  }: AlertOptions) => {
    clearTimer()
    setAlert({ type, title, message })
    timeoutRef.current = window.setTimeout(() => {
      hideAlert()
    }, durationMs)
  }

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alert && (
        <GlobalAlert
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={hideAlert}
        />
      )}
    </AlertContext.Provider>
  )
}

