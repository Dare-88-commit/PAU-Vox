import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { User, Shield, Bell, Download, Trash2, Save, CheckCircle2, Moon, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { apiRequest } from '../lib/api'

interface SettingsPageProps {
  onNavigate: (page: string) => void
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { user, token } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [highPriorityAlerts, setHighPriorityAlerts] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [prefsLoading, setPrefsLoading] = useState(true)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deletionRequestStatus, setDeletionRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
  const [deletionRequestLoading, setDeletionRequestLoading] = useState(false)

  useEffect(() => {
    const loadDeletionStatus = async () => {
      if (!token) return
      try {
        const row = await apiRequest<{ status: 'pending' | 'approved' | 'rejected' } | null>('/auth/account-deletion-request', { token })
        setDeletionRequestStatus(row?.status || 'none')
      } catch {
        setDeletionRequestStatus('none')
      }
    }
    void loadDeletionStatus()
  }, [token])

  useEffect(() => {
    const loadPreferences = async () => {
      if (!token) return
      try {
        setPrefsLoading(true)
        const prefs = await apiRequest<{
          email_notifications_enabled: boolean
          push_notifications_enabled: boolean
          high_priority_alerts_enabled: boolean
          weekly_digest_enabled: boolean
        }>('/notifications/preferences', { token })
        setEmailNotifications(prefs.email_notifications_enabled)
        setPushNotifications(prefs.push_notifications_enabled)
        setHighPriorityAlerts(prefs.high_priority_alerts_enabled)
        setWeeklyDigest(prefs.weekly_digest_enabled)
      } catch (err: any) {
        toast.error(err.message || 'Failed to load notification preferences')
      } finally {
        setPrefsLoading(false)
      }
    }
    void loadPreferences()
  }, [token])

  const handleSavePreferences = async () => {
    if (!token) {
      toast.error('You must be signed in')
      return
    }
    try {
      setSaveLoading(true)
      await apiRequest('/notifications/preferences', {
        method: 'PATCH',
        token,
        body: {
          email_notifications_enabled: emailNotifications,
          push_notifications_enabled: pushNotifications,
          high_priority_alerts_enabled: highPriorityAlerts,
          weekly_digest_enabled: weeklyDigest,
        },
      })
      toast.success('Preferences saved successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save preferences')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!token) {
      toast.error('You must be signed in')
      return
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match')
      return
    }

    try {
      setPasswordLoading(true)
      await apiRequest<{ message: string }>('/auth/change-password', {
        method: 'POST',
        token,
        body: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      toast.success('Password changed successfully')
    } catch (err: any) {
      toast.error(err.message || 'Unable to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleExportData = () => {
    if (!token) {
      toast.error('You must be signed in')
      return
    }
    const run = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:8000/api/v1"
        const response = await fetch(`${baseUrl}/auth/export-data`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error('Export failed')
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pau-vox-data-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Data exported successfully')
      } catch (err: any) {
        toast.error(err.message || 'Failed to export data')
      }
    }
    void run()
  }

  const handleDeleteAccount = () => {
    if (!token) {
      toast.error('You must be signed in')
      return
    }
    if (!confirm('Submit account deletion request for ICT Admin approval?')) return

    const reason = window.prompt('Optional: provide a reason for deletion request') || ''
    const run = async () => {
      try {
        setDeletionRequestLoading(true)
        await apiRequest('/auth/request-account-deletion', {
          method: 'POST',
          token,
          body: { reason: reason.trim() || null },
        })
        setDeletionRequestStatus('pending')
        toast.success('Deletion request submitted for ICT Admin approval')
      } catch (err: any) {
        toast.error(err.message || 'Failed to submit deletion request')
      } finally {
        setDeletionRequestLoading(false)
      }
    }
    void run()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Account Information
              </CardTitle>
              <CardDescription>Your PAU Vox account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={user?.name} disabled className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={user?.email} disabled className="mt-2" />
                </div>
              </div>
              <div>
                <Label>Role</Label>
                <div className="mt-2">
                  <Badge variant="outline" className="capitalize text-base py-2 px-4">
                    {user?.role.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Verified Account</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Your email has been verified. Your account is secure.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Change Password
              </CardTitle>
              <CardDescription>Update your login password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <Button onClick={() => void handleChangePassword()} disabled={passwordLoading}>
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose how you want to receive updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email updates about your feedback</p>
                </div>
                <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} disabled={prefsLoading || saveLoading} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get instant notifications on status changes</p>
                </div>
                <Switch id="push-notifications" checked={pushNotifications} onCheckedChange={setPushNotifications} disabled={prefsLoading || saveLoading} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-priority">High Priority Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Immediate alerts for urgent feedback {user?.role !== 'student' && '(Staff only)'}
                  </p>
                </div>
                <Switch
                  id="high-priority"
                  checked={highPriorityAlerts}
                  onCheckedChange={setHighPriorityAlerts}
                  disabled={prefsLoading || saveLoading || user?.role === 'student'}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-digest">Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">Receive a summary of campus feedback every week</p>
                </div>
                <Switch id="weekly-digest" checked={weeklyDigest} onCheckedChange={setWeeklyDigest} disabled={prefsLoading || saveLoading} />
              </div>

              <div className="pt-4">
                <Button onClick={handleSavePreferences} disabled={prefsLoading || saveLoading} className="bg-[#001F54] hover:bg-blue-900">
                  {saveLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Privacy & Data
              </CardTitle>
              <CardDescription>Manage your data and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Export Your Data</h4>
                  <p className="text-sm text-muted-foreground">Download a copy of your account data and feedback history</p>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div>
                  <h4 className="font-medium text-red-900 dark:text-red-100">Delete Account</h4>
                  <p className="text-sm text-red-700 dark:text-red-300">Request deletion. ICT Admin must approve before account is deleted.</p>
                  {deletionRequestStatus === 'pending' && <p className="text-xs mt-2 text-amber-700 dark:text-amber-300">Deletion request is pending review.</p>}
                  {deletionRequestStatus === 'rejected' && <p className="text-xs mt-2 text-red-700 dark:text-red-300">Your last deletion request was rejected.</p>}
                </div>
                <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletionRequestLoading || deletionRequestStatus === 'pending'}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deletionRequestLoading ? 'Submitting...' : 'Request Delete'}
                </Button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Your Privacy Matters
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>- We never share your data with third parties</li>
                  <li>- Anonymous feedback is private to policy limits</li>
                  <li>- Staff cannot see your identity on anonymous submissions</li>
                  <li>- All data is encrypted in transit and at rest where configured</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Moon className="w-5 h-5 mr-2" />
                Theme
              </CardTitle>
              <CardDescription>Choose your preferred theme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Dark Mode</h4>
                  <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <Switch id="dark-mode" checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
