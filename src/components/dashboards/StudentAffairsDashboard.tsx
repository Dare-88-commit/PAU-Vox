import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFeedback } from '../../contexts/FeedbackContext'
import { Layout } from '../Layout'
import { FeedbackCard } from '../feedback/FeedbackCard'
import { FeedbackDetailModal } from '../feedback/FeedbackDetailModal'
import { AssignmentModal } from '../feedback/AssignmentModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { MessageSquare, Clock, CheckCircle2, AlertCircle, Users, UserPlus } from 'lucide-react'
import type { Feedback } from '../../contexts/FeedbackContext'

interface StudentAffairsDashboardProps {
  onNavigate: (page: string) => void
}

export function StudentAffairsDashboard({ onNavigate }: StudentAffairsDashboardProps) {
  const { user } = useAuth()
  const { getAllFeedbacks } = useFeedback()
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [assigningFeedback, setAssigningFeedback] = useState<Feedback | null>(null)

  // Filter non-academic feedbacks only
  const nonAcademicFeedbacks = getAllFeedbacks().filter(f => f.type === 'non_academic')

  const pendingCount = nonAcademicFeedbacks.filter(f => f.status === 'pending').length
  const assignedCount = nonAcademicFeedbacks.filter(f => f.status === 'assigned' || f.status === 'working').length
  const resolvedCount = nonAcademicFeedbacks.filter(f => f.status === 'resolved').length
  const urgentCount = nonAcademicFeedbacks.filter(f => f.priority === 'urgent' || f.priority === 'high').length

  // Category breakdown
  const categoryStats = nonAcademicFeedbacks.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const topCategories = Object.entries(categoryStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const handleAssignClick = (e: React.MouseEvent, feedback: Feedback) => {
    e.stopPropagation()
    setAssigningFeedback(feedback)
  }

  return (
    <Layout title={`Student Affairs Dashboard - ${user?.name}`}>
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nonAcademicFeedbacks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned/Working</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent/High</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{urgentCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Top Issue Categories</CardTitle>
            <CardDescription>Most common non-academic concerns</CardDescription>
          </CardHeader>
          <CardContent>
            {topCategories.length > 0 ? (
              <div className="space-y-2">
                {topCategories.map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm">{category}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-secondary rounded-full h-2">
                        <div
                          className="bg-[#001F54] h-2 rounded-full"
                          style={{
                            width: `${(count / nonAcademicFeedbacks.length) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Feedback List */}
        <Card>
          <CardHeader>
            <CardTitle>Non-Academic Issues</CardTitle>
            <CardDescription>
              Manage welfare and student life concerns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nonAcademicFeedbacks.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No issues found</h3>
                <p className="text-muted-foreground">
                  No non-academic feedback at this time
                </p>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All ({nonAcademicFeedbacks.length})</TabsTrigger>
                  <TabsTrigger value="urgent">Urgent ({urgentCount})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                  <TabsTrigger value="assigned">Assigned ({assignedCount})</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {nonAcademicFeedbacks.map((feedback) => (
                    <FeedbackCard
                      key={feedback.id}
                      feedback={feedback}
                      onClick={() => setSelectedFeedback(feedback)}
                      showStudent={true}
                      onAssignClick={handleAssignClick}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="urgent" className="space-y-4">
                  {nonAcademicFeedbacks
                    .filter(f => f.priority === 'urgent' || f.priority === 'high')
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={true}
                        onAssignClick={handleAssignClick}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                  {nonAcademicFeedbacks
                    .filter(f => f.status === 'pending')
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={true}
                        onAssignClick={handleAssignClick}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="assigned" className="space-y-4">
                  {nonAcademicFeedbacks
                    .filter(f => f.status === 'assigned' || f.status === 'working')
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={true}
                        onAssignClick={handleAssignClick}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="resolved" className="space-y-4">
                  {nonAcademicFeedbacks
                    .filter(f => f.status === 'resolved')
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={true}
                        onAssignClick={handleAssignClick}
                      />
                    ))}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <FeedbackDetailModal
        feedback={selectedFeedback}
        open={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
      />

      <AssignmentModal
        feedback={assigningFeedback}
        open={!!assigningFeedback}
        onClose={() => setAssigningFeedback(null)}
      />
    </Layout>
  )
}