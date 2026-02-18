import { useEffect, useState } from 'react'
import { Feedback, useFeedback } from '../../contexts/FeedbackContext'
import { useAuth } from '../../contexts/AuthContext'
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
import { Input } from '../ui/input'
import { UserCheck, Users, Clock3 } from 'lucide-react'
import { toast } from 'sonner'
import { apiRequest } from '../../lib/api'

interface AssignmentModalProps {
  feedback: Feedback | null
  open: boolean
  onClose: () => void
}

interface StaffMember {
  id: string
  full_name: string
  role: string
  department?: string | null
}

export function AssignmentModal({ feedback, open, onClose }: AssignmentModalProps) {
  const { user, token } = useAuth()
  const { assignFeedback, addInternalNote } = useFeedback()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [assignmentNote, setAssignmentNote] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [staffLoading, setStaffLoading] = useState(false)

  if (!feedback) return null

  useEffect(() => {
    const loadStaff = async () => {
      if (!open || !token) return
      setStaffLoading(true)
      try {
        const rows = await apiRequest<StaffMember[]>('/auth/staff-directory', { token })
        setStaffMembers(rows)
      } catch (err: any) {
        toast.error(err.message || 'Failed to load staff directory')
        setStaffMembers([])
      } finally {
        setStaffLoading(false)
      }
    }
    void loadStaff()
  }, [open, token])

  const handleAssign = async () => {
    if (!selectedStaff) {
      toast.error('Please select a staff member')
      return
    }

    setLoading(true)

    try {
      const staffMember = staffMembers.find(s => s.id === selectedStaff)
      const dueAtIso = dueAt ? new Date(dueAt).toISOString() : undefined

      await assignFeedback(feedback.id, selectedStaff, user?.name || 'System', dueAtIso)

      const note = assignmentNote.trim()
        ? `Assigned to ${staffMember?.full_name}. Note: ${assignmentNote}`
        : `Assigned to ${staffMember?.full_name}`

      await addInternalNote(feedback.id, note, user?.name || 'System')

      toast.success(`Feedback assigned to ${staffMember?.full_name}`)

      setSelectedStaff('')
      setAssignmentNote('')
      setDueAt('')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign feedback')
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
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="font-medium text-sm text-gray-900 dark:text-white mb-1">
              {feedback.subject}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Category: {feedback.category} • Type: {feedback.type.replace('_', ' ')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-select" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Select Staff Member
            </Label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger id="staff-select">
                <SelectValue placeholder={staffLoading ? 'Loading staff...' : 'Choose a staff member...'} />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{staff.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(staff.department || 'N/A')} - {staff.role.replace('_', ' ')}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-at" className="flex items-center gap-2">
              <Clock3 className="w-4 h-4" />
              Due Date/Time (Optional)
            </Label>
            <Input id="due-at" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>

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
