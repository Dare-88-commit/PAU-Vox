import { Home, MessageSquare, User, Bell, BarChart3 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface MobileBottomNavProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export function MobileBottomNav({ currentPage, onNavigate }: MobileBottomNavProps) {
  const { user } = useAuth()
  
  if (!user) return null

  const isStaffOrAdmin = ['academic_staff', 'student_affairs', 'facilities_management', 'department_head', 'university_management', 'ict_admin'].includes(user.role)

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home, show: true },
    { id: 'feedback', label: 'Submit', icon: MessageSquare, show: true },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, show: isStaffOrAdmin },
    { id: 'notifications', label: 'Alerts', icon: Bell, show: true },
    { id: 'profile', label: 'Profile', icon: User, show: true },
  ].filter(item => item.show)

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl">
      <nav className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-[#001F54] text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'animate-bounce' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
