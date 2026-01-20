import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import {
  User,
  Mail,
  Shield,
  Bell,
  Download,
  Trash2,
  Save,
  CheckCircle2,
  Moon,
  Sun
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'

interface SettingsPageProps {
  onNavigate: (page: string) => void
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { user } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [highPriorityAlerts, setHighPriorityAlerts] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  const handleSavePreferences = async () => {
    setSaveLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaveLoading(false)
    toast.success('Preferences saved successfully')
  }

  const handleExportData = () => {
    // Mock data export
    const userData = {
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        role: user?.role
      },
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pau-vox-data-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Data exported successfully')
  }

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Account deletion requested. Please contact support to complete this action.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
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
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Verified Account
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Your email has been verified. Your account is secure.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you want to receive updates about your feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your feedback
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get instant notifications on status changes
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-priority">High Priority Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Immediate alerts for urgent feedback{' '}
                    {user?.role !== 'student' && '(Staff only)'}
                  </p>
                </div>
                <Switch
                  id="high-priority"
                  checked={highPriorityAlerts}
                  onCheckedChange={setHighPriorityAlerts}
                  disabled={user?.role === 'student'}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-digest">Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a summary of campus feedback every week
                  </p>
                </div>
                <Switch
                  id="weekly-digest"
                  checked={weeklyDigest}
                  onCheckedChange={setWeeklyDigest}
                />
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSavePreferences}
                  disabled={saveLoading}
                  className="bg-[#001F54] hover:bg-blue-900"
                >
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

          {/* Privacy & Data */}
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
                  <p className="text-sm text-muted-foreground">
                    Download a copy of your account data and feedback history
                  </p>
                </div>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
                <div>
                  <h4 className="font-medium text-red-900 dark:text-red-100">
                    Delete Account
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Your Privacy Matters
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• We never share your data with third parties</li>
                  <li>• Anonymous feedback is completely private</li>
                  <li>• Staff cannot see your identity on anonymous submissions</li>
                  <li>• All data is encrypted and securely stored</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Moon className="w-5 h-5 mr-2" />
                Theme
              </CardTitle>
              <CardDescription>Choose your preferred theme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Dark Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark themes
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={toggleDarkMode}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}