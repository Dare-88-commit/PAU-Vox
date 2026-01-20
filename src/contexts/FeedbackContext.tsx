import React, { createContext, useContext, useState, useEffect } from 'react'

export type FeedbackType = 'academic' | 'non_academic'
export type FeedbackStatus = 'pending' | 'in_review' | 'assigned' | 'working' | 'resolved' | 'rejected'
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Feedback {
  id: string
  type: FeedbackType
  category: string
  subject: string
  description: string
  status: FeedbackStatus
  priority: FeedbackPriority
  isAnonymous: boolean
  studentId: string
  studentName?: string
  createdAt: Date
  updatedAt: Date
  assignedTo?: string
  department?: string
  resolutionSummary?: string
  attachments?: string[]
  internalNotes?: Array<{
    id: string
    text: string
    author: string
    createdAt: Date
  }>
  statusHistory?: Array<{
    id: string
    status: FeedbackStatus
    timestamp: Date
    updatedBy: string
    note?: string
  }>
  similarityGroup?: string
}

interface FeedbackContextType {
  feedbacks: Feedback[]
  submitFeedback: (feedback: Omit<Feedback, 'id' | 'status' | 'priority' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateFeedbackStatus: (id: string, status: FeedbackStatus) => void
  addInternalNote: (feedbackId: string, note: string, author: string) => void
  checkProfanity: (text: string) => boolean
  getUserFeedbacks: (userId: string) => Feedback[]
  getDepartmentFeedbacks: (department: string, type: FeedbackType) => Feedback[]
  getAssignedFeedbacks: (assignedTo: string) => Feedback[]
  getAllFeedbacks: () => Feedback[]
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined)

// Profanity word list (basic implementation)
const profanityList = ['damn', 'hell', 'stupid', 'idiot', 'fool', 'crap', 'suck']

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])

  useEffect(() => {
    // Load feedbacks from localStorage
    const stored = localStorage.getItem('pau_vox_feedbacks')
    if (stored) {
      const parsed = JSON.parse(stored)
      // Convert date strings back to Date objects
      const withDates = parsed.map((f: any) => ({
        ...f,
        createdAt: new Date(f.createdAt),
        updatedAt: new Date(f.updatedAt),
        internalNotes: f.internalNotes?.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        })),
        statusHistory: f.statusHistory?.map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }))
      }))
      setFeedbacks(withDates)
    } else {
      // Initialize with mock data
      const mockFeedbacks: Feedback[] = [
        {
          id: '1',
          type: 'academic',
          category: 'Course Content',
          subject: 'Calculus course too difficult',
          description: 'The pace of the calculus course is too fast. Many students are struggling to keep up with the material.',
          status: 'in_review',
          priority: 'medium',
          isAnonymous: false,
          studentId: '1',
          studentName: 'John Doe',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          department: 'Mathematics',
          internalNotes: []
        },
        {
          id: '2',
          type: 'non_academic',
          category: 'Hostel',
          subject: 'No AC in Block B',
          description: 'The air conditioning has not been working in Block B for 3 days. It is very hot and uncomfortable.',
          status: 'assigned',
          priority: 'high',
          isAnonymous: true,
          studentId: '2',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
          assignedTo: 'facilities_management',
          internalNotes: []
        }
      ]
      setFeedbacks(mockFeedbacks)
      localStorage.setItem('pau_vox_feedbacks', JSON.stringify(mockFeedbacks))
    }
  }, [])

  useEffect(() => {
    // Save to localStorage whenever feedbacks change
    if (feedbacks.length > 0) {
      localStorage.setItem('pau_vox_feedbacks', JSON.stringify(feedbacks))
    }
  }, [feedbacks])

  const checkProfanity = (text: string): boolean => {
    const lowerText = text.toLowerCase()
    return profanityList.some(word => lowerText.includes(word))
  }

  const detectPriority = (description: string): FeedbackPriority => {
    const urgentKeywords = ['urgent', 'emergency', 'danger', 'fire', 'flood', 'immediate']
    const highKeywords = ['broken', 'not working', 'severe', 'serious', 'critical']
    
    const lowerDesc = description.toLowerCase()
    
    if (urgentKeywords.some(keyword => lowerDesc.includes(keyword))) {
      return 'urgent'
    }
    if (highKeywords.some(keyword => lowerDesc.includes(keyword))) {
      return 'high'
    }
    return 'medium'
  }

  const submitFeedback = async (feedback: Omit<Feedback, 'id' | 'status' | 'priority' | 'createdAt' | 'updatedAt'>) => {
    // Check profanity
    if (checkProfanity(feedback.description) || checkProfanity(feedback.subject)) {
      throw new Error('Your feedback contains inappropriate language. Please revise and resubmit.')
    }

    // Detect priority
    const priority = detectPriority(feedback.description)

    const newFeedback: Feedback = {
      ...feedback,
      id: Date.now().toString(),
      status: 'pending',
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
      internalNotes: []
    }

    setFeedbacks(prev => [...prev, newFeedback])
  }

  const updateFeedbackStatus = (id: string, status: FeedbackStatus) => {
    setFeedbacks(prev =>
      prev.map(f =>
        f.id === id
          ? { ...f, status, updatedAt: new Date() }
          : f
      )
    )
  }

  const addInternalNote = (feedbackId: string, note: string, author: string) => {
    setFeedbacks(prev =>
      prev.map(f =>
        f.id === feedbackId
          ? {
              ...f,
              internalNotes: [
                ...(f.internalNotes || []),
                {
                  id: Date.now().toString(),
                  text: note,
                  author,
                  createdAt: new Date()
                }
              ],
              updatedAt: new Date()
            }
          : f
      )
    )
  }

  const getUserFeedbacks = (userId: string) => {
    return feedbacks.filter(f => f.studentId === userId)
  }

  const getDepartmentFeedbacks = (department: string, type: FeedbackType) => {
    return feedbacks.filter(f => f.department === department && f.type === type)
  }

  const getAssignedFeedbacks = (assignedTo: string) => {
    return feedbacks.filter(f => f.assignedTo === assignedTo)
  }

  const getAllFeedbacks = () => {
    return feedbacks
  }

  return (
    <FeedbackContext.Provider
      value={{
        feedbacks,
        submitFeedback,
        updateFeedbackStatus,
        addInternalNote,
        checkProfanity,
        getUserFeedbacks,
        getDepartmentFeedbacks,
        getAssignedFeedbacks,
        getAllFeedbacks
      }}
    >
      {children}
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (context === undefined) {
    throw new Error('useFeedback must be used within a FeedbackProvider')
  }
  return context
}