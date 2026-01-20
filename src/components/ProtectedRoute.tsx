import { ReactNode } from 'react'
import { useAuth, UserRole } from '../contexts/AuthContext'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles: UserRole[]
  onNavigate?: (page: string) => void
}

export function ProtectedRoute({ children, allowedRoles, onNavigate }: ProtectedRouteProps) {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to be logged in to access this page.
          </p>
          <Button
            onClick={() => onNavigate?.('login')}
            className="bg-[#001F54] hover:bg-blue-700 w-full"
          >
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Your role: <span className="font-semibold capitalize">{user.role.replace('_', ' ')}</span>
          </p>
          <Button
            onClick={() => onNavigate?.('dashboard')}
            variant="outline"
            className="w-full"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
