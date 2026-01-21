import { useState } from 'react'
import { Feedback, useFeedback } from '../../contexts/FeedbackContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { UserCheck, Users } from 'lucide-react'
import { toast } from 'sonner'

interface AssignmentModalProps {
  feedback: Feedback | null
  open: boolean
  onClose: () => void
}

// Mock staff members - in real app this would come from a database
const staffMembers = [
  { id: 'staff_1', name: 'Dr. Johnson Okafor', role: 'academic_staff', department: 'Mathematics' },
  { id: 'staff_2', name: 'Prof. Amina Bello', role: 'academic_staff', department: 'Computer Science' },
  { id: 'staff_3', name: 'Mr. David Adeyemi', role: 'facilities_management', department: 'Facilities' },
  { id: 'staff_4', name: 'Mrs. Grace Eze', role: 'facilities_management', department: 'Facilities' },
  { id: 'staff_5', name: 'Dr. Emmanuel Nwosu', role: 'student_affairs', department: 'Student Affairs' },
  { id: 'staff_6', name: 'Ms. Chioma Okoro', role: 'student_affairs', department: 'Student Affairs' },
]

export function AssignmentModal({ feedback, open, onClose }: AssignmentModalProps) {
  const { user } = useAuth()
  const { assignFeedback, updateFeedbackStatus, addInternalNote } = useFeedback()
  const { addNotification } = useNotifications()
  const [selectedStaff, setSelectedStaff] = useState('')
  const [assignmentNote, setAssignmentNote] = useState('')
  const [loading, setLoading] = useState(false)

  if (!feedback) return null

  // Filter staff based on feedback type
  const relevantStaff = staffMembers.filter(staff => {
    if (feedback.type === 'academic') {
      return staff.role === 'academic_staff' || staff.role === 'department_head'
    } else {
      return staff.role === 'facilities_management' || staff.role === 'student_affairs'
    }
  })

  const handleAssign = async () => {
    if (!selectedStaff) {
      toast.error('Please select a staff member')
      return
    }

    setLoading(true)

    try {
      const staffMember = staffMembers.find(s => s.id === selectedStaff)
      
      // Assign the feedback
      assignFeedback(feedback.id, selectedStaff, user?.name || 'System')
      
      // Update status to 'assigned'
      updateFeedbackStatus(feedback.id, 'assigned')
      
      // Add internal note about assignment
      const note = assignmentNote.trim() 
        ? `Assigned to ${staffMember?.name}. Note: ${assignmentNote}`
        : `Assigned to ${staffMember?.name}`
      
      addInternalNote(feedback.id, note, user?.name || 'System')

      // Create notification for the assigned staff member
      addNotification({
        title: 'New Feedback Assigned',
        message: `You have been assigned to handle: "${feedback.subject}"`,
        type: 'info',
        feedbackId: feedback.id
      })

      toast.success(`Feedback assigned to ${staffMember?.name}`)
      
      // Reset and close
      setSelectedStaff('')
      setAssignmentNote('')
      onClose()
    } catch (error) {
      toast.error('Failed to assign feedback')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#001F54]" />
            Assign Feedback
          </DialogTitle>
          <DialogDescription>
            Assign this feedback to a staff member for resolution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feedback Summary */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">
              {feedback.subject}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Category: {feedback.category} • Type: {feedback.type.replace('_', ' ')}
            </p>
          </div>

          {/* Staff Selection */}
          <div className="space-y-2">
            <Label htmlFor="staff-select" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Select Staff Member
            </Label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger id="staff-select">
                <SelectValue placeholder="Choose a staff member..." />
              </SelectTrigger>
              <SelectContent>
                {relevantStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{staff.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {staff.department} - {staff.role.replace('_', ' ')}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Note */}
          <div className="space-y-2">
            <Label htmlFor="assignment-note">Assignment Note (Optional)</Label>
            <Textarea
              id="assignment-note"
              placeholder="Add any specific instructions or context for the assigned staff member..."
              value={assignmentNote}
              onChange={(e) => setAssignmentNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedStaff || loading}
            className="bg-[#001F54] hover:bg-blue-900"
          >
            {loading ? 'Assigning...' : 'Assign Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
