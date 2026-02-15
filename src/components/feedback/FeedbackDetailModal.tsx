import { useState } from 'react'
import { Feedback, FeedbackStatus, useFeedback } from '../../contexts/FeedbackContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Separator } from '../ui/separator'
import { Label } from '../ui/label'
import { Clock, User, FileText, MessageSquare, Upload } from 'lucide-react'
import { toast } from 'sonner'

function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return options?.addSuffix ? `${seconds} seconds ago` : `${seconds} seconds`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return options?.addSuffix ? `${minutes} minutes ago` : `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return options?.addSuffix ? `${hours} hours ago` : `${hours} hours`
  const days = Math.floor(hours / 24)
  if (days < 30) return options?.addSuffix ? `${days} days ago` : `${days} days`
  const months = Math.floor(days / 30)
  if (months < 12) return options?.addSuffix ? `${months} months ago` : `${months} months`
  const years = Math.floor(months / 12)
  return options?.addSuffix ? `${years} years ago` : `${years} years`
}

function format(date: Date, formatStr: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  
  return `${month} ${day}, ${year} at ${displayHours}:${minutes} ${ampm}`
}

interface FeedbackDetailModalProps {
  feedback: Feedback | null
  open: boolean
  onClose: () => void
}

export function FeedbackDetailModal({ feedback, open, onClose }: FeedbackDetailModalProps) {
  const { user } = useAuth()
  const { updateFeedbackStatus, addInternalNote } = useFeedback()
  const [newNote, setNewNote] = useState('')
  const [newStatus, setNewStatus] = useState<FeedbackStatus | ''>('')
  const [resolutionSummary, setResolutionSummary] = useState('')

  if (!feedback) return null

  const canUpdateStatus = user && ['academic_staff', 'student_affairs', 'facilities_management', 'department_head'].includes(user.role)
  const canAddNotes = user && user.role !== 'student'
  const canViewNotes = user && user.role !== 'student'
  const isStudent = user?.role === 'student'
  const isResolvingStatus = newStatus === 'resolved'

  const handleStatusUpdate = async () => {
    if (newStatus) {
      if (newStatus === 'resolved' && !resolutionSummary.trim()) {
        toast.error('Please provide a resolution summary before marking as resolved.')
        return
      }
      try {
        await updateFeedbackStatus(feedback.id, newStatus, resolutionSummary)
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`)
        setNewStatus('')
        setResolutionSummary('')
      } catch (err: any) {
        toast.error(err.message || 'Failed to update status')
      }
    }
  }

  const handleAddNote = async () => {
    if (newNote.trim() && user) {
      try {
        await addInternalNote(feedback.id, newNote, user.name)
        toast.success('Internal note added')
        setNewNote('')
      } catch (err: any) {
        toast.error(err.message || 'Failed to add internal note')
      }
    }
  }

  const getStatusColor = (status: FeedbackStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_review': return 'bg-blue-100 text-blue-800'
      case 'assigned': return 'bg-purple-100 text-purple-800'
      case 'working': return 'bg-indigo-100 text-indigo-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{feedback.subject}</DialogTitle>
              <DialogDescription className="flex flex-wrap gap-2">
                <Badge variant="outline" className="capitalize">
                  {feedback.type.replace('_', ' ')}
                </Badge>
                <Badge className={getStatusColor(feedback.status)}>
                  {feedback.status.replace('_', ' ')}
                </Badge>
                <Badge className={getPriorityColor(feedback.priority)}>
                  {feedback.priority} priority
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Feedback Details */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Category
              </h4>
              <p className="text-sm text-muted-foreground">{feedback.category}</p>
            </div>

            {feedback.department && (
              <div>
                <h4 className="font-medium mb-2">Department</h4>
                <p className="text-sm text-muted-foreground">{feedback.department}</p>
              </div>
            )}

            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-sm whitespace-pre-wrap">{feedback.description}</p>
            </div>

            <Separator />

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>
                  Submitted by:{' '}
                  <span className="font-medium text-foreground">
                    {feedback.isAnonymous ? 'Anonymous' : feedback.studentName}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
                </span>
              </div>
              <div className="col-span-2 text-muted-foreground">
                Last updated: {format(feedback.updatedAt, 'PPpp')}
              </div>
            </div>
          </div>

          {/* Status Update (Staff only) */}
          {canUpdateStatus && !isStudent && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Update Status</h4>
                <div className="flex gap-2">
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as FeedbackStatus)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="working">Working</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleStatusUpdate} disabled={!newStatus} className="bg-[#001F54] hover:bg-blue-900">
                    Update
                  </Button>
                </div>
                
                {/* Resolution Summary - Only shows when resolving */}
                {isResolvingStatus && (
                  <div className="space-y-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <Label htmlFor="resolution-summary" className="text-green-900 dark:text-green-100 font-medium">
                      Resolution Summary *
                    </Label>
                    <Textarea
                      id="resolution-summary"
                      placeholder="Describe how this issue was resolved..."
                      value={resolutionSummary}
                      onChange={(e) => setResolutionSummary(e.target.value)}
                      rows={4}
                      className="bg-white dark:bg-gray-800"
                    />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Upload className="w-4 h-4" />
                      <span>Optional: Upload resolution photo (placeholder)</span>
                      <Button variant="outline" size="sm" className="ml-auto">
                        Choose File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Internal Notes (Staff only) */}
          {canViewNotes && !isStudent && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Internal Notes
                </h4>
                
                {feedback.internalNotes && feedback.internalNotes.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {feedback.internalNotes.map((note) => (
                      <div key={note.id} className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{note.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(note.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm">{note.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No internal notes yet</p>
                )}

                {canAddNotes && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add an internal note (not visible to students)..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                    />
                    <Button onClick={handleAddNote} disabled={!newNote.trim()} className="bg-[#001F54] hover:bg-blue-900">
                      Add Note
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
