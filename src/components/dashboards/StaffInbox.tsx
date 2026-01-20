import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFeedback, Feedback, FeedbackStatus } from '../../contexts/FeedbackContext'
import { FeedbackCard } from '../feedback/FeedbackCard'
import { FeedbackDetailModal } from '../feedback/FeedbackDetailModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Inbox,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  RefreshCw
} from 'lucide-react'

interface StaffInboxProps {
  onNavigate: (page: string) => void
}

export function StaffInbox({ onNavigate }: StaffInboxProps) {
  const { user } = useAuth()
  const { getAllFeedbacks, getDepartmentFeedbacks } = useFeedback()
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'academic' | 'non_academic'>('all')
  const [filterPriority, setFilterPriority] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'priority' | 'status'>('recent')

  // Get relevant feedbacks based on user role
  const getRelevantFeedbacks = () => {
    if (!user) return []

    let feedbacks: Feedback[] = []

    switch (user.role) {
      case 'university_management':
      case 'ict_admin':
        feedbacks = getAllFeedbacks()
        break
      case 'academic_staff':
      case 'department_head':
        if (user.department) {
          feedbacks = getDepartmentFeedbacks(user.department, 'academic')
        }
        break
      case 'student_affairs':
        feedbacks = getAllFeedbacks().filter(f => f.type === 'non_academic')
        break
      case 'facilities_management':
        feedbacks = getAllFeedbacks().filter(
          f => f.type === 'non_academic' && ['Hostel/Accommodation', 'Air Conditioning', 'Electricity/Power', 'Water Supply', 'Sanitation/Cleanliness'].includes(f.category)
        )
        break
      default:
        feedbacks = []
    }

    return feedbacks
  }

  // Apply filters
  const filteredFeedbacks = getRelevantFeedbacks()
    .filter(f => {
      if (filterType !== 'all' && f.type !== filterType) return false
      if (filterPriority !== 'all' && f.priority !== filterPriority) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          f.subject.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query) ||
          f.category.toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return b.createdAt.getTime() - a.createdAt.getTime()
      }
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      if (sortBy === 'status') {
        const statusOrder: Record<FeedbackStatus, number> = {
          pending: 0,
          in_review: 1,
          assigned: 2,
          working: 3,
          resolved: 4,
          rejected: 5
        }
        return statusOrder[a.status] - statusOrder[b.status]
      }
      return 0
    })

  const pendingCount = filteredFeedbacks.filter(f => f.status === 'pending').length
  const inProgressCount = filteredFeedbacks.filter(f =>
    ['in_review', 'assigned', 'working'].includes(f.status)
  ).length
  const resolvedCount = filteredFeedbacks.filter(f => f.status === 'resolved').length
  const urgentCount = filteredFeedbacks.filter(f => f.priority === 'urgent').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Inbox className="w-8 h-8 text-[#001F54] mr-3" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Inbox</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and respond to feedback submissions
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredFeedbacks.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Being addressed
              </p>
            </CardContent>
          </Card>

          <Card className={urgentCount > 0 ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{urgentCount}</div>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1 font-medium">
                Needs immediate attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search feedback..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="non_academic">Non-Academic</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setFilterType('all')
                  setFilterPriority('all')
                  setSortBy('recent')
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feedback List */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback Items</CardTitle>
            <CardDescription>
              {filteredFeedbacks.length} feedback item{filteredFeedbacks.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredFeedbacks.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No feedback found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery
                    ? 'Try adjusting your search or filters'
                    : 'No feedback submissions match your current filters'}
                </p>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">
                    All
                    <Badge variant="secondary" className="ml-2">
                      {filteredFeedbacks.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending
                    <Badge variant="secondary" className="ml-2">
                      {pendingCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="in_progress">
                    In Progress
                    <Badge variant="secondary" className="ml-2">
                      {inProgressCount}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="resolved">
                    Resolved
                    <Badge variant="secondary" className="ml-2">
                      {resolvedCount}
                    </Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4 mt-6">
                  {filteredFeedbacks.map((feedback) => (
                    <FeedbackCard
                      key={feedback.id}
                      feedback={feedback}
                      onClick={() => setSelectedFeedback(feedback)}
                      showStudent={!feedback.isAnonymous}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="pending" className="space-y-4 mt-6">
                  {filteredFeedbacks
                    .filter(f => f.status === 'pending')
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={!feedback.isAnonymous}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="in_progress" className="space-y-4 mt-6">
                  {filteredFeedbacks
                    .filter(f => ['in_review', 'assigned', 'working'].includes(f.status))
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={!feedback.isAnonymous}
                      />
                    ))}
                </TabsContent>

                <TabsContent value="resolved" className="space-y-4 mt-6">
                  {filteredFeedbacks
                    .filter(f => f.status === 'resolved')
                    .map((feedback) => (
                      <FeedbackCard
                        key={feedback.id}
                        feedback={feedback}
                        onClick={() => setSelectedFeedback(feedback)}
                        showStudent={!feedback.isAnonymous}
                      />
                    ))}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feedback Detail Modal */}
      <FeedbackDetailModal
        feedback={selectedFeedback}
        open={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
      />
    </div>
  )
}
