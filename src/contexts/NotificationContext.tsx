import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: Date
  feedbackId?: string
  actionUrl?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    // Load notifications from localStorage
    const stored = localStorage.getItem('pau_vox_notifications')
    if (stored) {
      const parsed = JSON.parse(stored)
      const withDates = parsed.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt)
      }))
      setNotifications(withDates)
    }
  }, [])

  useEffect(() => {
    // Save to localStorage whenever notifications change
    if (notifications.length > 0) {
      localStorage.setItem('pau_vox_notifications', JSON.stringify(notifications))
    }
  }, [notifications])

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      read: false,
      createdAt: new Date()
    }

    setNotifications(prev => [newNotification, ...prev])

    // Show toast notification
    switch (notification.type) {
      case 'success':
        toast.success(notification.title, { description: notification.message })
        break
      case 'error':
        toast.error(notification.title, { description: notification.message })
        break
      case 'warning':
        toast.warning(notification.title, { description: notification.message })
        break
      default:
        toast.info(notification.title, { description: notification.message })
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearNotifications = () => {
    setNotifications([])
    localStorage.removeItem('pau_vox_notifications')
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
