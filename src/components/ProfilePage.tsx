import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useFeedback } from '../contexts/FeedbackContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Avatar } from './ui/avatar'
import { Separator } from './ui/separator'
import {
  User,
  Mail,
  Shield,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
  Award,
  TrendingUp,
  Edit,
  Settings
} from 'lucide-react'

interface ProfilePageProps {
  onNavigate: (page: string) => void
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user } = useAuth()
  const { getUserFeedbacks } = useFeedback()

  const myFeedbacks = getUserFeedbacks(user?.id || '')
  const totalFeedback = myFeedbacks.length
  const resolvedFeedback = myFeedbacks.filter(f => f.status === 'resolved').length
  const pendingFeedback = myFeedbacks.filter(f => f.status === 'pending').length
  const resolutionRate =
    totalFeedback > 0 ? ((resolvedFeedback / totalFeedback) * 100).toFixed(0) : '0'

  // Mock data for achievements
  const achievements = [
    {
      id: 1,
      title: 'First Feedback',
      description: 'Submitted your first feedback',
      icon: <MessageSquare className="w-6 h-6" />,
      earned: true,
      date: '2024-01-15'
    },
    {
      id: 2,
      title: 'Problem Solver',
      description: '5 feedback items resolved',
      icon: <CheckCircle2 className="w-6 h-6" />,
      earned: resolvedFeedback >= 5,
      date: resolvedFeedback >= 5 ? '2024-01-20' : undefined
    },
    {
      id: 3,
      title: 'Active Contributor',
      description: 'Submitted 10 feedback items',
      icon: <TrendingUp className="w-6 h-6" />,
      earned: totalFeedback >= 10,
      date: totalFeedback >= 10 ? '2024-01-25' : undefined
    },
    {
      id: 4,
      title: 'PAU Champion',
      description: 'Helping make PAU better',
      icon: <Award className="w-6 h-6" />,
      earned: totalFeedback >= 5 && resolvedFeedback >= 3,
      date:
        totalFeedback >= 5 && resolvedFeedback >= 3 ? '2024-02-01' : undefined
    }
  ]

  const earnedAchievements = achievements.filter(a => a.earned)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and manage your profile information
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  <div className="w-24 h-24 bg-gradient-to-br from-[#001F54] to-cyan-400 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>

                  {/* Name & Email */}
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {user?.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{user?.email}</p>

                  {/* Role Badge */}
                  <Badge variant="outline" className="mb-4 capitalize">
                    <Shield className="w-3 h-3 mr-1" />
                    {user?.role.replace('_', ' ')}
                  </Badge>

                  {/* Status */}
                  <div className="flex items-center justify-center text-sm text-green-600 dark:text-green-400 mb-6">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Account Verified
                  </div>

                  <Separator className="mb-6" />

                  {/* Actions */}
                  <div className="w-full space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => onNavigate('settings')}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Total Feedback
                  </span>
                  <span className="text-lg font-bold">{totalFeedback}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Resolved</span>
                  <span className="text-lg font-bold text-green-600">{resolvedFeedback}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                  <span className="text-lg font-bold text-yellow-600">{pendingFeedback}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Resolution Rate
                  </span>
                  <span className="text-lg font-bold text-blue-600">{resolutionRate}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Details */}
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Your PAU Vox account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Full Name
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Email Address
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Role</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                        {user?.role.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Member Since
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        January 2024
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Achievements
                </CardTitle>
                <CardDescription>
                  You've earned {earnedAchievements.length} of {achievements.length} achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {achievements.map(achievement => (
                    <div
                      key={achievement.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        achievement.earned
                          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-300 dark:border-yellow-700'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            achievement.earned
                              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                          }`}
                        >
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                            {achievement.title}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {achievement.description}
                          </p>
                          {achievement.earned && achievement.date && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                              Earned on {new Date(achievement.date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {achievement.earned && (
                          <CheckCircle2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {earnedAchievements.length < achievements.length && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      <strong>Keep going!</strong> Submit more feedback to earn additional
                      achievements and help improve PAU.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
                <CardDescription>Your feedback contribution to PAU</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Total Contributions
                      </p>
                      <p className="text-2xl font-bold text-[#001F54] dark:text-blue-400">
                        {totalFeedback}
                      </p>
                    </div>
                    <MessageSquare className="w-12 h-12 text-[#001F54] dark:text-blue-400" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Resolved
                        </p>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-green-600">{resolvedFeedback}</p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                        {resolutionRate}% resolution rate
                      </p>
                    </div>

                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Pending
                        </p>
                        <Clock className="w-5 h-5 text-yellow-600" />
                      </div>
                      <p className="text-2xl font-bold text-yellow-600">{pendingFeedback}</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                        Awaiting response
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
