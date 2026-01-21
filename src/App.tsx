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
import { StaffInbox } from './components/StaffInbox'
import { AnalyticsPage } from './components/dashboards/AnalyticsPage'
import { AboutPage } from './components/AboutPage'
import { SettingsPage } from './components/SettingsPage'
import { ProfilePage } from './components/ProfilePage'
import { HelpPage } from './components/HelpPage'
import { NotificationCenter } from './components/NotificationCenter'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'

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

function AppContent() {
  const { user, isAuthenticated } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>('home')

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && user?.verified && currentPage === 'home') {
      setCurrentPage('dashboard')
    }
  }, [isAuthenticated, user, currentPage])

  // Redirect to verify email if not verified
  useEffect(() => {
    if (isAuthenticated && user && !user.verified && currentPage !== 'verify-email') {
      setCurrentPage('verify-email')
    }
  }, [isAuthenticated, user, currentPage])

  // Enhanced route protection - check on URL access attempts
  useEffect(() => {
    const protectRoutes = () => {
      if (user?.role === 'student') {
        const staffOnlyPages: Page[] = ['staff-inbox', 'analytics']
        if (staffOnlyPages.includes(currentPage)) {
          toast.error('Access denied. Redirecting to your dashboard.')
          setCurrentPage('dashboard')
        }
      }

      // Protect admin routes
      const managementOnlyPages: Page[] = ['analytics']
      const isManagement = user && ['university_management', 'ict_admin', 'department_head'].includes(user.role)
      if (managementOnlyPages.includes(currentPage) && !isManagement && user?.role !== 'student_affairs' && user?.role !== 'facilities_management' && user?.role !== 'academic_staff') {
        toast.error('Access denied. Insufficient permissions.')
        setCurrentPage('dashboard')
      }
    }

    protectRoutes()
  }, [currentPage, user])

  const handleNavigate = (page: Page) => {
    // Role-based route guarding
    if (user?.role === 'student') {
      const staffOnlyPages: Page[] = ['staff-inbox', 'analytics']
      if (staffOnlyPages.includes(page)) {
        toast.error('Access denied. This page is only available to staff members.')
        setCurrentPage('dashboard')
        return
      }
    }
    
    setCurrentPage(page)
  }

  // Render role-specific dashboard
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
        return <UniversityManagementDashboard onNavigate={handleNavigate} />
      case 'ict_admin':
        return <UniversityManagementDashboard onNavigate={handleNavigate} />
      default:
        return <StudentDashboard onNavigate={handleNavigate} />
    }
  }

  // Render current page
  const renderPage = () => {
    // Pages that shouldn't have Navbar
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
          // Route guard: prevent students from accessing staff inbox
          if (user?.role === 'student') {
            toast.error('Access denied. Redirecting to dashboard.')
            setTimeout(() => setCurrentPage('dashboard'), 100)
            return renderDashboard()
          }
          return <StaffInbox onNavigate={handleNavigate} />
        case 'analytics':
          // Route guard: prevent students from accessing analytics
          if (user?.role === 'student') {
            toast.error('Access denied. Redirecting to dashboard.')
            setTimeout(() => setCurrentPage('dashboard'), 100)
            return renderDashboard()
          }
          return <AnalyticsPage onNavigate={handleNavigate} />
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