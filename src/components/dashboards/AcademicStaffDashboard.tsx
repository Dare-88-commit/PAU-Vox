import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFeedback } from '../../contexts/FeedbackContext'
import { DEPARTMENTS } from '../../lib/catalog'
import { Layout } from '../Layout'
import { FeedbackCard } from '../feedback/FeedbackCard'
import { FeedbackDetailModal } from '../feedback/FeedbackDetailModal'
import { AssignmentModal } from '../feedback/AssignmentModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { MessageSquare, Clock, AlertCircle } from 'lucide-react'
import type { Feedback } from '../../contexts/FeedbackContext'

interface AcademicStaffDashboardProps {
  onNavigate: (page: string) => void
}

export function AcademicStaffDashboard({ onNavigate }: AcademicStaffDashboardProps) {
  const { user } = useAuth()
  const { getAllFeedbacks } = useFeedback()
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [assigningFeedback, setAssigningFeedback] = useState<Feedback | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState(user?.department || DEPARTMENTS[0])

  const departmentFeedbacks = getAllFeedbacks().filter(
    f => f.type === 'academic' && f.department === selectedDepartment
  )

  const pendingCount = departmentFeedbacks.filter(f => f.status === 'pending').length
  const inReviewCount = departmentFeedbacks.filter(f => f.status === 'in_review').length
  const resolvedCount = departmentFeedbacks.filter(f => f.status === 'resolved').length
  const urgentCount = departmentFeedbacks.filter(f => f.priority === 'urgent' || f.priority === 'high').length

  const canAssign = !!user && ['department_head', 'course_coordinator', 'dean'].includes(user.role)
  const handleAssignClick = (e: React.MouseEvent, feedback: Feedback) => {
    e.stopPropagation()
    setAssigningFeedback(feedback)
  }

  const dashboardTitle = user?.role === 'dean' ? `Dean Dashboard - ${user?.name}` : `Academic Staff Dashboard - ${user?.name}`

  return (
    <Layout title={dashboardTitle}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Department</CardTitle>
            <CardDescription>View feedback for your department</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{departmentFeedbacks.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{pendingCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{inReviewCount}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent/High</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{urgentCount}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Academic Feedback</CardTitle>
            <CardDescription>Review and respond to academic feedback from students</CardDescription>
          </CardHeader>
          <CardContent>
            {departmentFeedbacks.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No feedback found</h3>
                <p className="text-muted-foreground">No academic feedback for {selectedDepartment} at this time</p>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All ({departmentFeedbacks.length})</TabsTrigger>
                  <TabsTrigger value="urgent">Urgent ({urgentCount})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
                  <TabsTrigger value="in_review">In Review ({inReviewCount})</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {departmentFeedbacks.map((feedback) => (
                    <FeedbackCard key={feedback.id} feedback={feedback} onClick={() => setSelectedFeedback(feedback)} showStudent={true} onAssignClick={canAssign ? handleAssignClick : undefined} />
                  ))}
                </TabsContent>

                <TabsContent value="urgent" className="space-y-4">
                  {departmentFeedbacks.filter(f => f.priority === 'urgent' || f.priority === 'high').map((feedback) => (
                    <FeedbackCard key={feedback.id} feedback={feedback} onClick={() => setSelectedFeedback(feedback)} showStudent={true} onAssignClick={canAssign ? handleAssignClick : undefined} />
                  ))}
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                  {departmentFeedbacks.filter(f => f.status === 'pending').map((feedback) => (
                    <FeedbackCard key={feedback.id} feedback={feedback} onClick={() => setSelectedFeedback(feedback)} showStudent={true} onAssignClick={canAssign ? handleAssignClick : undefined} />
                  ))}
                </TabsContent>

                <TabsContent value="in_review" className="space-y-4">
                  {departmentFeedbacks.filter(f => f.status === 'in_review').map((feedback) => (
                    <FeedbackCard key={feedback.id} feedback={feedback} onClick={() => setSelectedFeedback(feedback)} showStudent={true} onAssignClick={canAssign ? handleAssignClick : undefined} />
                  ))}
                </TabsContent>

                <TabsContent value="resolved" className="space-y-4">
                  {departmentFeedbacks.filter(f => f.status === 'resolved').map((feedback) => (
                    <FeedbackCard key={feedback.id} feedback={feedback} onClick={() => setSelectedFeedback(feedback)} showStudent={true} onAssignClick={canAssign ? handleAssignClick : undefined} />
                  ))}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <FeedbackDetailModal feedback={selectedFeedback} open={!!selectedFeedback} onClose={() => setSelectedFeedback(null)} />
      <AssignmentModal feedback={assigningFeedback} open={!!assigningFeedback} onClose={() => setAssigningFeedback(null)} />
    </Layout>
  )
}
