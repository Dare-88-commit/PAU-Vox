import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

export function Layout({ children, title }: LayoutProps) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 pb-20 md:pb-0">
      {/* REMOVED: The <header> block was deleted from here.
          Your global Navbar.tsx already provides the institutional header.
      */}

      {/* Main Content Area - Aligned with Section 4.1 UI Requirements */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        
        {/* Page Title Section */}
        {title && (
          <div className="mb-10 mt-4">
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h1>
            <div className="h-1.5 w-20 bg-[#001F54] dark:bg-blue-600 rounded-full mt-3"></div>
          </div>
        )}

        {/* Page Content */}
        <div className="relative">
          {children}
        </div>
      </main>

      {/* Footer Branding placeholder */}
      <footer className="py-10 text-center text-gray-400 text-sm">
        <p>Pan-Atlantic University Feedback System</p>
      </footer>

      {/* Animation Styles */}
      <style jsx global>{`
        .animate-in { animation: fadeIn 0.6s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}