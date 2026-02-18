import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { FeedbackProvider } from './contexts/FeedbackContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SearchProvider } from './contexts/SearchContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { Navbar } from './components/Navbar'
import { MobileBottomNav } from './components/MobileBottomNav'
import { LandingPage } from './components/LandingPage'
import { LoginPage } from './components/auth/LoginPage'
import { SignupPage } from './components/auth/SignupPage'
import { VerifyEmailPage } from './components/auth/VerifyEmailPage'
import { FeedbackForm } from './components/feedback/FeedbackForm'
import { StudentDashboard } from './components/dashboards/StudentDashboard'
import { AcademicStaffDashboard } from './components/dashboards/AcademicStaffDashboard'
import { StudentAffairsDashboard } from './components/dashboards/StudentAffairsDashboard'
import { FacilitiesManagementDashboard } from './components/dashboards/FacilitiesManagementDashboard'
import { UniversityManagementDashboard } from './components/dashboards/UniversityManagementDashboard'
import { AnalyticsPage } from './components/dashboards/AnalyticsPage'
import { StaffInbox } from './components/dashboards/StaffInbox'
import { AboutPage } from './components/AboutPage'
import { SettingsPage } from './components/SettingsPage'
import { ProfilePage } from './components/ProfilePage'
import { HelpPage } from './components/HelpPage'
import { NotificationCenter } from './components/NotificationCenter'
import { SurveysPage } from './components/SurveysPage'
import { HostelRatingsPage } from './components/HostelRatingsPage'
import { AdminUsersPage } from './components/AdminUsersPage'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'
import { apiRequest } from './lib/api'

type Page =
  | 'home'
  | 'login'
  | 'signup'
  | 'verify-email'
  | 'feedback'
  | 'dashboard'
  | 'my-feedback'
  | 'staff-inbox'
  | 'analytics'
  | 'about'
  | 'settings'
  | 'profile'
  | 'help'
  | 'notifications'
  | 'surveys'
  | 'hostel-ratings'
  | 'admin-users'

function AppContent() {
  const { user, token, isAuthenticated } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('home')

  useEffect(() => {
    if (isAuthenticated && user?.verified && currentPage === 'home') {
      setCurrentPage('dashboard')
    }
  }, [isAuthenticated, user, currentPage])

  useEffect(() => {
    if (isAuthenticated && user && !user.verified && currentPage !== 'verify-email') {
      setCurrentPage('verify-email')
    }
  }, [isAuthenticated, user, currentPage])

  useEffect(() => {
    if (!user) return
    if (currentPage === 'analytics' && !['university_management', 'department_head'].includes(user.role)) {
      toast.error('Access denied. Analytics is restricted.')
      setCurrentPage('dashboard')
    }
    if (currentPage === 'staff-inbox' && user.role === 'student') {
      toast.error('Access denied.')
      setCurrentPage('dashboard')
    }
    if (currentPage === 'admin-users' && user.role !== 'ict_admin') {
      toast.error('Access denied. Admin Users is restricted to ICT Admin accounts.')
      setCurrentPage('dashboard')
    }
  }, [currentPage, user])

  useEffect(() => {
    if (!token || !user || !['department_head', 'student_affairs', 'ict_admin'].includes(user.role)) return
    const run = async () => {
      try {
        await apiRequest<{ message: string }>('/feedback/overdue/check', { method: 'POST', token })
      } catch {
        // no-op
      }
    }
    void run()
    const t = setInterval(() => {
      void run()
    }, 60000)
    return () => clearInterval(t)
  }, [token, user?.role])

  const handleNavigate = (page: Page) => {
    if (page === 'analytics' && user && !['university_management', 'department_head'].includes(user.role)) {
      toast.error('Access denied. Analytics is only available to management and department heads.')
      setCurrentPage('dashboard')
      return
    }
    if (page === 'admin-users' && user && user.role !== 'ict_admin') {
      toast.error('Access denied. Admin Users is restricted to ICT Admin accounts.')
      setCurrentPage('dashboard')
      return
    }
    setCurrentPage(page)
  }

  const renderDashboard = () => {
    if (!user) return null

    switch (user.role) {
      case 'student':
        return <StudentDashboard onNavigate={handleNavigate} />
      case 'academic_staff':
        return <AcademicStaffDashboard onNavigate={handleNavigate} />
      case 'student_affairs':
        return <StudentAffairsDashboard onNavigate={handleNavigate} />
      case 'facilities_management':
        return <FacilitiesManagementDashboard onNavigate={handleNavigate} />
      case 'department_head':
        return <AcademicStaffDashboard onNavigate={handleNavigate} />
      case 'university_management':
        return <AnalyticsPage onNavigate={handleNavigate} />
      case 'ict_admin':
        return <UniversityManagementDashboard onNavigate={handleNavigate} />
      default:
        return <StudentDashboard onNavigate={handleNavigate} />
    }
  }

  const renderPage = () => {
    const noNavbarPages = ['login', 'signup', 'verify-email']
    const showNavbar = !noNavbarPages.includes(currentPage) || isAuthenticated

    const pageContent = (() => {
      switch (currentPage) {
        case 'home':
          return <LandingPage onNavigate={handleNavigate} />
        case 'login':
          return <LoginPage onNavigate={handleNavigate} />
        case 'signup':
          return <SignupPage onNavigate={handleNavigate} />
        case 'verify-email':
          return <VerifyEmailPage onNavigate={handleNavigate} />
        case 'feedback':
          return <FeedbackForm onNavigate={handleNavigate} />
        case 'dashboard':
          return renderDashboard()
        case 'my-feedback':
          return renderDashboard()
        case 'staff-inbox':
          if (user?.role === 'student') return renderDashboard()
          return <StaffInbox onNavigate={handleNavigate} />
        case 'analytics':
          if (!user || !['university_management', 'department_head'].includes(user.role)) return renderDashboard()
          return <AnalyticsPage onNavigate={handleNavigate} />
        case 'admin-users':
          if (!user || user.role !== 'ict_admin') return renderDashboard()
          return <AdminUsersPage onNavigate={handleNavigate} />
        case 'about':
          return <AboutPage onNavigate={handleNavigate} />
        case 'settings':
          return <SettingsPage onNavigate={handleNavigate} />
        case 'profile':
          return <ProfilePage onNavigate={handleNavigate} />
        case 'help':
          return <HelpPage onNavigate={handleNavigate} />
        case 'notifications':
          return <NotificationCenter onNavigate={handleNavigate} />
        case 'surveys':
          return <SurveysPage onNavigate={handleNavigate} />
        case 'hostel-ratings':
          return <HostelRatingsPage onNavigate={handleNavigate} />
        default:
          return <LandingPage onNavigate={handleNavigate} />
      }
    })()

    return (
      <>
        {showNavbar && <Navbar currentPage={currentPage} onNavigate={handleNavigate} />}
        {pageContent}
        {showNavbar && <MobileBottomNav currentPage={currentPage} onNavigate={handleNavigate} />}
      </>
    )
  }

  return renderPage()
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeedbackProvider>
          <SearchProvider>
            <NotificationProvider>
              <div className="min-h-screen">
                <AppContent />
                <Toaster />
              </div>
            </NotificationProvider>
          </SearchProvider>
        </FeedbackProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
