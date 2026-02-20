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
  email: string
  role: string
  department?: string | null
}

export function AssignmentModal({ feedback, open, onClose }: AssignmentModalProps) {
  const { user, token } = useAuth()
  const { assignFeedback, addInternalNote } = useFeedback()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [assignmentNote, setAssignmentNote] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [staffLoading, setStaffLoading] = useState(false)

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

  if (!feedback) return null

  const filteredStaff = staffMembers.filter((staff) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      staff.full_name.toLowerCase().includes(q) ||
      staff.email.toLowerCase().includes(q) ||
      staff.role.toLowerCase().includes(q)
    )
  })

  const actionVerb = user?.role === 'dean' ? 'Relegate' : 'Assign'

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
        ? `${actionVerb}d to ${staffMember?.full_name}. Note: ${assignmentNote}`
        : `${actionVerb}d to ${staffMember?.full_name}`

      await addInternalNote(feedback.id, note, user?.name || 'System')

      toast.success(`Task ${actionVerb.toLowerCase()}d to ${staffMember?.full_name}`)

      setSelectedStaff('')
      setSearchQuery('')
      setAssignmentNote('')
      setDueAt('')
      onClose()
    } catch (err: any) {
      toast.error(err.message || `Failed to ${actionVerb.toLowerCase()} task`)
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
            {actionVerb} Task
          </DialogTitle>
          <DialogDescription>
            Select the person responsible for this task
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
            <Label htmlFor="staff-search" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Find Assignee
            </Label>
            <Input
              id="staff-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={staffLoading ? 'Loading people...' : 'Search by name, email, role'}
            />
            <div className="max-h-56 overflow-y-auto border rounded-md">
              {filteredStaff.map((staff) => (
                <button
                  type="button"
                  key={staff.id}
                  onClick={() => setSelectedStaff(staff.id)}
                  className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-muted/50 ${
                    selectedStaff === staff.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <p className="font-medium text-sm">{staff.full_name}</p>
                  <p className="text-xs text-muted-foreground">{staff.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {staff.role.replace('_', ' ')}{staff.department ? ` - ${staff.department}` : ''}
                  </p>
                </button>
              ))}
              {!staffLoading && filteredStaff.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No matching users.</p>
              )}
            </div>
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
              placeholder="Add instructions or context for the assignee..."
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
            {loading ? `${actionVerb}ing...` : `${actionVerb} Task`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
