import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ThemeContextType {
  darkMode: boolean
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('pau-vox-theme')
    return saved === 'dark'
  })

  useEffect(() => {
    // Apply dark class to html element
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('pau-vox-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('pau-vox-theme', 'light')
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev)
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
