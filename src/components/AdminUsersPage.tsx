import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiRequest } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { toast } from 'sonner'

type UserRole =
  | 'student'
  | 'academic_staff'
  | 'student_affairs'
  | 'facilities_management'
  | 'department_head'
  | 'university_management'
  | 'ict_admin'

type AdminUser = {
  id: string
  email: string
  full_name: string
  role: UserRole
  department?: string | null
  is_verified: boolean
  is_active: boolean
  is_major_admin: boolean
  role_assignment_locked: boolean
  created_at: string
}

const ROLE_OPTIONS: Array<{ value: UserRole; label: string; needsDepartment?: boolean }> = [
  { value: 'student', label: 'Student' },
  { value: 'academic_staff', label: 'Academic Staff', needsDepartment: true },
  { value: 'student_affairs', label: 'Student Affairs' },
  { value: 'facilities_management', label: 'Facilities Management' },
  { value: 'department_head', label: 'Department Head', needsDepartment: true },
  { value: 'university_management', label: 'University Management' },
  { value: 'ict_admin', label: 'ICT Admin' },
]

interface AdminUsersPageProps {
  onNavigate: (page: string) => void
}

export function AdminUsersPage({ onNavigate }: AdminUsersPageProps) {
  const { token, user } = useAuth()
  const [rows, setRows] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [draftRole, setDraftRole] = useState<Record<string, UserRole>>({})
  const [draftDept, setDraftDept] = useState<Record<string, string>>({})

  const canDelete = !!user?.isMajorAdmin

  const filteredRows = useMemo(() => rows, [rows])

  const loadUsers = async () => {
    if (!token) return
    try {
      setLoading(true)
      const data = await apiRequest<AdminUser[]>('/admin/users', { token })
      setRows(data)
      const roleDrafts: Record<string, UserRole> = {}
      const deptDrafts: Record<string, string> = {}
      for (const item of data) {
        roleDrafts[item.id] = item.role
        deptDrafts[item.id] = item.department || ''
      }
      setDraftRole(roleDrafts)
      setDraftDept(deptDrafts)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [token])

  const handleAssignRole = async (target: AdminUser) => {
    if (!token) return
    const selectedRole = draftRole[target.id] || target.role
    const selectedOption = ROLE_OPTIONS.find((v) => v.value === selectedRole)
    const department = (draftDept[target.id] || '').trim()

    if (selectedOption?.needsDepartment && !department) {
      toast.error('Department is required for this role')
      return
    }

    try {
      setSavingId(target.id)
      await apiRequest<{ message: string }>(`/admin/users/${target.id}/assign-role`, {
        method: 'PATCH',
        token,
        body: {
          role: selectedRole,
          department: selectedOption?.needsDepartment ? department : null,
        },
      })
      toast.success('Role updated')
      await loadUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role')
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleActive = async (target: AdminUser) => {
    if (!token) return
    const route = target.is_active ? 'deactivate' : 'activate'
    try {
      setSavingId(target.id)
      await apiRequest<{ message: string }>(`/admin/users/${target.id}/${route}`, {
        method: 'PATCH',
        token,
      })
      toast.success(target.is_active ? 'User deactivated' : 'User activated')
      await loadUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update account status')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (target: AdminUser) => {
    if (!token) return
    const ok = window.confirm(`Delete account for ${target.full_name} (${target.email})? This cannot be undone.`)
    if (!ok) return

    try {
      setDeletingId(target.id)
      await apiRequest<{ message: string }>(`/admin/users/${target.id}`, {
        method: 'DELETE',
        token,
      })
      toast.success('User deleted')
      await loadUsers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user')
    } finally {
      setDeletingId(null)
    }
  }

  if (user?.role !== 'ict_admin') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only ICT Admin accounts can access user administration.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => onNavigate('dashboard')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <Button variant="outline" onClick={() => void loadUsers()} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
          <CardDescription>
            ICT Admin can assign account types and manage account status. Only major admin can delete accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading users...</p>}
          {!loading && filteredRows.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}

          {!loading && filteredRows.length > 0 && (
            <div className="space-y-3">
              {filteredRows.map((row) => {
                const roleChoice = draftRole[row.id] || row.role
                const roleMeta = ROLE_OPTIONS.find((r) => r.value === roleChoice)
                const busy = savingId === row.id || deletingId === row.id

                return (
                  <div key={row.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{row.full_name}</span>
                      <Badge variant="secondary">{row.role.replace('_', ' ')}</Badge>
                      {row.is_major_admin && <Badge>Major Admin</Badge>}
                      {!row.is_active && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{row.email}</p>

                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={roleChoice}
                          onValueChange={(v) => setDraftRole((prev) => ({ ...prev, [row.id]: v as UserRole }))}
                          disabled={row.is_major_admin || busy}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                disabled={opt.value === 'ict_admin' && !user?.isMajorAdmin}
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Input
                          value={draftDept[row.id] ?? ''}
                          onChange={(e) => setDraftDept((prev) => ({ ...prev, [row.id]: e.target.value }))}
                          placeholder="Required for Academic Staff/Dept Head"
                          disabled={!roleMeta?.needsDepartment || row.is_major_admin || busy}
                        />
                      </div>

                      <div className="flex items-end gap-2">
                        <Button onClick={() => void handleAssignRole(row)} disabled={row.is_major_admin || busy}>
                          Save Role
                        </Button>
                        <Button variant="outline" onClick={() => void handleToggleActive(row)} disabled={row.is_major_admin || busy}>
                          {row.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        {canDelete && (
                          <Button
                            variant="destructive"
                            onClick={() => void handleDelete(row)}
                            disabled={row.is_major_admin || busy}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
