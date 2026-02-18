import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useSearch } from '../contexts/SearchContext'
import { useNotifications } from '../contexts/NotificationContext'
import { Badge } from './ui/badge'
import {
  MessageSquare,
  Search,
  Bell,
  User,
  Settings,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  X,
  Home,
  FileText,
  BarChart3,
  Shield
} from 'lucide-react'

interface NavbarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

function formatAge(date: Date): string {
  const diff = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000))
  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, logout } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const { searchQuery, setSearchQuery } = useSearch()
  const { notifications, unreadCount, markAsRead } = useNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setSearchQuery('')
    }
  }

  const handleLogout = () => {
    logout()
    setIsUserMenuOpen(false)
    onNavigate('home')
  }

  const isStaffOrAdmin = user && ['academic_staff', 'student_affairs', 'facilities_management', 'department_head', 'university_management', 'ict_admin'].includes(user.role)

  const mainNavLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" />, requireAuth: true },
    { id: 'feedback', label: 'Submit Feedback', icon: <MessageSquare className="w-4 h-4" />, requireAuth: true },
    { id: 'my-feedback', label: 'My Feedback', icon: <FileText className="w-4 h-4" />, requireAuth: true, studentOnly: true },
    { id: 'staff-inbox', label: 'Inbox', icon: <FileText className="w-4 h-4" />, requireAuth: true, staffOnly: true },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" />, requireAuth: true, staffOnly: true },
    { id: 'admin-users', label: 'Users', icon: <Shield className="w-4 h-4" />, requireAuth: true, ictAdminOnly: true },
    { id: 'surveys', label: 'Surveys', icon: <FileText className="w-4 h-4" />, requireAuth: true },
    { id: 'hostel-ratings', label: 'Hostel Ratings', icon: <BarChart3 className="w-4 h-4" />, requireAuth: true },
    { id: 'about', label: 'About', icon: <Shield className="w-4 h-4" /> },
  ]

  const filteredNavLinks = mainNavLinks.filter(link => {
    if (link.requireAuth && !user) return false
    if (link.studentOnly && user?.role !== 'student') return false
    if (link.staffOnly && !isStaffOrAdmin) return false
    if (link.ictAdminOnly && user?.role !== 'ict_admin') return false
    return true
  })

  const topNotifications = notifications.slice(0, 6)

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg shadow-lg border-b border-gray-200 dark:border-gray-800'
            : 'bg-gradient-to-r from-[#001F54] via-blue-900 to-blue-800'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => onNavigate(user ? 'dashboard' : 'home')}
              className="flex items-center space-x-3 group"
            >
              <div className="relative w-10 h-10 bg-white dark:bg-blue-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <MessageSquare className="w-6 h-6 text-[#001F54] dark:text-blue-300" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-xl font-bold ${
                    scrolled ? 'text-[#001F54] dark:text-white' : 'text-white'
                  }`}
                >
                  PAU Vox
                </span>
                <span
                  className={`text-xs ${
                    scrolled ? 'text-gray-500' : 'text-blue-200'
                  }`}
                >
                  Student Voice Platform
                </span>
              </div>
            </button>

            <div className="hidden md:flex items-center space-x-1 overflow-x-auto max-w-[45%]">
              {filteredNavLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => {
                    onNavigate(link.id)
                    setIsOpen(false)
                  }}
                  className={`flex items-center shrink-0 px-2 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentPage === link.id
                      ? scrolled
                        ? 'bg-blue-100 dark:bg-blue-900 text-[#001F54] dark:text-blue-300'
                        : 'bg-white/20 text-white'
                      : scrolled
                      ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <span className="mr-1">{link.icon}</span>
                  {link.label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center space-x-3">
              {user && (
                <form onSubmit={handleSearch} className="relative hidden xl:block">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search feedback..."
                    className={`w-44 pl-10 pr-4 py-2 rounded-xl text-sm transition-all ${
                      scrolled
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                        : 'bg-white/20 text-white placeholder-blue-200 border border-white/30'
                    } focus:outline-none focus:ring-2 focus:ring-[#001F54]`}
                  />
                  <Search
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                      scrolled ? 'text-gray-400' : 'text-blue-200'
                    }`}
                  />
                </form>
              )}

              {user && (
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className={`relative p-2 rounded-xl transition-colors ${
                      scrolled
                        ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        : 'hover:bg-white/10 text-white'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                          <Badge variant="secondary">{unreadCount} new</Badge>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {topNotifications.length === 0 && (
                          <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No notifications yet.</div>
                        )}
                        {topNotifications.map((notification) => (
                          <button
                            key={notification.id}
                            className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                              !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => {
                              void markAsRead(notification.id)
                              setIsNotificationsOpen(false)
                              onNavigate('notifications')
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 mt-2 rounded-full ${notification.read ? 'bg-gray-400' : 'bg-blue-500'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{notification.title}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300">{notification.message}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatAge(notification.createdAt)}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setIsNotificationsOpen(false)
                          onNavigate('notifications')
                        }}
                        className="block w-full p-4 text-center text-sm text-[#001F54] dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
                      >
                        View all notifications
                      </button>
                    </div>
                  )}
                </div>
              )}

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-xl transition-all ${
                      scrolled
                        ? 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#001F54] to-cyan-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                    </div>
                    <div className="hidden lg:block text-left">
                      <p
                        className={`text-sm font-medium ${
                          scrolled ? 'text-gray-900 dark:text-white' : 'text-white'
                        }`}
                      >
                        {user.name}
                      </p>
                      <p
                        className={`text-xs capitalize ${
                          scrolled ? 'text-gray-500 dark:text-gray-400' : 'text-blue-200'
                        }`}
                      >
                        {user.role.replace('_', ' ')}
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isUserMenuOpen ? 'rotate-180' : ''
                      } ${scrolled ? 'text-gray-500' : 'text-blue-200'}`}
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#001F54] to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">
                            {user.email?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        <button onClick={() => { onNavigate('profile'); setIsUserMenuOpen(false) }} className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"><User className="w-4 h-4 mr-3" />Profile</button>
                        <button onClick={() => { onNavigate('settings'); setIsUserMenuOpen(false) }} className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"><Settings className="w-4 h-4 mr-3" />Settings</button>
                        <button onClick={() => { onNavigate('help'); setIsUserMenuOpen(false) }} className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"><HelpCircle className="w-4 h-4 mr-3" />Help & Support</button>
                        <div className="border-t border-gray-100 dark:border-gray-800 my-2"></div>
                        <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><LogOut className="w-4 h-4 mr-3" />Logout</button>
                      </div>
                      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Theme</span>
                          <button onClick={toggleDarkMode} className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            {darkMode ? (<Sun className="w-4 h-4 text-yellow-500" />) : (<Moon className="w-4 h-4 text-gray-600" />)}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onNavigate('login')}
                    className={`px-4 py-2 rounded-xl font-medium transition-all ${
                      scrolled
                        ? 'text-[#001F54] hover:text-blue-700 hover:bg-blue-50'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => onNavigate('signup')}
                    className="px-6 py-2 bg-gradient-to-r from-[#001F54] to-blue-600 text-white rounded-xl font-medium hover:from-blue-800 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Join Now
                  </button>
                </div>
              )}
            </div>

            <button
              className={`md:hidden p-2 rounded-xl transition-colors ${
                scrolled
                  ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  : 'text-white hover:bg-white/10'
              }`}
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 py-6">
              {user && (
                <form onSubmit={handleSearch} className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search feedback..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#001F54]"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {filteredNavLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      onNavigate(link.id)
                      setIsOpen(false)
                    }}
                    className={`flex items-center w-full px-4 py-3 rounded-xl transition-colors ${
                      currentPage === link.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-[#001F54] dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="mr-3">{link.icon}</span>
                    {link.label}
                  </button>
                ))}
              </div>

              {user ? (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#001F54] to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">
                      {user.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button onClick={() => { onNavigate('profile'); setIsOpen(false) }} className="flex items-center w-full px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"><User className="w-4 h-4 mr-3" />Profile</button>
                    <button onClick={() => { onNavigate('settings'); setIsOpen(false) }} className="flex items-center w-full px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"><Settings className="w-4 h-4 mr-3" />Settings</button>
                    <button onClick={() => { onNavigate('help'); setIsOpen(false) }} className="flex items-center w-full px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"><HelpCircle className="w-4 h-4 mr-3" />Help & Support</button>
                    <button onClick={() => { handleLogout(); setIsOpen(false) }} className="flex items-center w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-left"><LogOut className="w-4 h-4 mr-3" />Logout</button>
                  </div>
                </div>
              ) : (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 space-y-3">
                  <button onClick={() => { onNavigate('login'); setIsOpen(false) }} className="block w-full text-center px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Sign In</button>
                  <button onClick={() => { onNavigate('signup'); setIsOpen(false) }} className="block w-full text-center px-6 py-3 bg-gradient-to-r from-[#001F54] to-blue-600 text-white rounded-xl font-medium hover:from-blue-800 hover:to-blue-700 transition-all shadow-lg">Create Account</button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="h-16"></div>
      <div className="fixed top-16 left-0 right-0 h-1 bg-gradient-to-r from-[#001F54] via-cyan-500 to-purple-500 z-40"></div>
    </>
  )
}
