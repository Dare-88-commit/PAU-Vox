import { Feedback, FeedbackStatus } from '../../contexts/FeedbackContext'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Clock, User, AlertCircle, UserPlus } from 'lucide-react'

function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return options?.addSuffix ? `${seconds} seconds ago` : `${seconds} seconds`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return options?.addSuffix ? `${minutes} minutes ago` : `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return options?.addSuffix ? `${hours} hours ago` : `${hours} hours`
  const days = Math.floor(hours / 24)
  if (days < 30) return options?.addSuffix ? `${days} days ago` : `${days} days`
  const months = Math.floor(days / 30)
  if (months < 12) return options?.addSuffix ? `${months} months ago` : `${months} months`
  const years = Math.floor(months / 12)
  return options?.addSuffix ? `${years} years ago` : `${years} years`
}

interface FeedbackCardProps {
  feedback: Feedback
  onClick?: () => void
  showStudent?: boolean
  onAssignClick?: (e: React.MouseEvent, feedback: Feedback) => void
}

export function FeedbackCard({ feedback, onClick, showStudent = false, onAssignClick }: FeedbackCardProps) {
  const getStatusColor = (status: FeedbackStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_review':
        return 'bg-blue-100 text-blue-800'
      case 'assigned':
        return 'bg-purple-100 text-purple-800'
      case 'working':
        return 'bg-indigo-100 text-indigo-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="capitalize">
                {feedback.type.replace('_', ' ')}
              </Badge>
              <Badge className={getStatusColor(feedback.status)}>
                {feedback.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(feedback.priority)}>
                {feedback.priority}
              </Badge>
            </div>
            <h3 className="font-semibold text-lg truncate">{feedback.subject}</h3>
            <p className="text-sm text-muted-foreground">{feedback.category}</p>
          </div>

          {/* Assignment/Relegation Button */}
          {onAssignClick && !['resolved', 'rejected'].includes(feedback.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => onAssignClick(e, feedback)}
              className="shrink-0"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Assign
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm line-clamp-2">{feedback.description}</p>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            {showStudent && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{feedback.isAnonymous ? 'Anonymous' : feedback.studentName}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDistanceToNow(feedback.createdAt, { addSuffix: true })}</span>
            </div>
          </div>
          
          {feedback.priority === 'urgent' && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Urgent</span>
            </div>
          )}
        </div>

        {feedback.department && (
          <div className="pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              Department: <span className="font-medium text-foreground">{feedback.department}</span>
            </span>
          </div>
        )}

        {/* Show assigned staff if exists */}
        {feedback.assignedTo && (
          <div className="pt-2 border-t">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              Assigned to: <span className="font-medium text-foreground">{feedback.assignedTo}</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
