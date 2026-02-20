import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFeedback } from '../../contexts/FeedbackContext'
import { Layout } from '../Layout'
import { FeedbackCard } from '../feedback/FeedbackCard'
import { FeedbackDetailModal } from '../feedback/FeedbackDetailModal'
import { AssignmentModal } from '../feedback/AssignmentModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Wrench, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Feedback } from '../../contexts/FeedbackContext'

interface FacilitiesManagementDashboardProps {
  onNavigate: (page: string) => void
}

export function FacilitiesManagementDashboard({ onNavigate }: FacilitiesManagementDashboardProps) {
  const { user } = useAuth()
  const { getAssignedFeedbacks } = useFeedback()
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [assigningFeedback, setAssigningFeedback] = useState<Feedback | null>(null)

  // Get feedbacks assigned to facilities management
  const assignedTasks = getAssignedFeedbacks(user?.id || '')

  const assignedCount = assignedTasks.filter(f => f.status === 'assigned').length
  const workingCount = assignedTasks.filter(f => f.status === 'working').length
  const completedCount = assignedTasks.filter(f => f.status === 'resolved').length
  const urgentCount = assignedTasks.filter(f => f.priority === 'urgent' || f.priority === 'high').length

  const canAssign = user?.role === 'facilities_management'
  const handleAssignClick = (e: React.MouseEvent, feedback: Feedback) => {
    e.stopPropagation()
    setAssigningFeedback(feedback)
  }

  return (
    <Layout title={`Facilities Management - ${user?.name}`}>
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedTasks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{workingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Tasks</CardTitle>
            <CardDescription>
              Infrastructure and facilities issues assigned to your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedTasks.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No tasks assigned</h3>
                <p className="text-muted-foreground">
                  You have no active tasks at this time
                </p>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All ({assignedTasks.length})</TabsTrigger>
                  <TabsTrigger value="urgent">Urgent ({urgentCount})</TabsTrigger>
                  <TabsTrigger value="assigned">Assigned ({assignedCount})</TabsTrigger>
                  <TabsTrigger value="working">In Progress ({workingCount})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedCount})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {assignedTasks.map((feedback) => (
                    <FeedbackCard
                      key={feedback.id}
                      feedback={feedback}
                      onClick={() => setSelectedFeedback(feedback)}
                      showStudent={true}
                      onAssignClick={canAssign ? handleAssignClick : undefined}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="urgent" className="space-y-4">
                  {assignedTasks
                    .filter(f => f.priority === 'urgent' || f.priority === 'high')
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={true}
                        onAssignClick={canAssign ? handleAssignClick : undefined}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="assigned" className="space-y-4">
                  {assignedTasks
                    .filter(f => f.status === 'assigned')
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={true}
                        onAssignClick={canAssign ? handleAssignClick : undefined}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="working" className="space-y-4">
                  {assignedTasks
                    .filter(f => f.status === 'working')
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={true}
                        onAssignClick={canAssign ? handleAssignClick : undefined}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="completed" className="space-y-4">
                  {assignedTasks
                    .filter(f => f.status === 'resolved')
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={true}
                        onAssignClick={canAssign ? handleAssignClick : undefined}
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
