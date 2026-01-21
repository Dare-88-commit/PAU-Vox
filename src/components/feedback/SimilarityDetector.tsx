import { useEffect, useState } from 'react'
import { useFeedback, Feedback } from '../../contexts/FeedbackContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { AlertCircle, Eye } from 'lucide-react'
import { Button } from '../ui/button'

interface SimilarityDetectorProps {
  description: string
  subject: string
  category: string
  type: 'academic' | 'non_academic'
  onViewSimilar?: (feedback: Feedback) => void
}

export function SimilarityDetector({ 
  description, 
  subject, 
  category, 
  type,
  onViewSimilar 
}: SimilarityDetectorProps) {
  const { getAllFeedbacks } = useFeedback()
  const [similarIssues, setSimilarIssues] = useState<Feedback[]>([])

  useEffect(() => {
    if (description.length < 20 && subject.length < 10) {
      setSimilarIssues([])
      return
    }

    // Simple similarity algorithm - checks for keyword matches
    const allFeedbacks = getAllFeedbacks()
    const keywords = [...description.toLowerCase().split(' '), ...subject.toLowerCase().split(' ')]
      .filter(word => word.length > 3) // Filter out short words
      .slice(0, 10) // Take top 10 keywords

    const similar = allFeedbacks
      .filter(f => f.type === type && f.category === category)
      .map(feedback => {
        const feedbackText = `${feedback.subject} ${feedback.description}`.toLowerCase()
        const matchCount = keywords.filter(keyword => feedbackText.includes(keyword)).length
        return { feedback, score: matchCount }
      })
      .filter(item => item.score >= 2) // At least 2 keyword matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Top 3 most similar
      .map(item => item.feedback)

    setSimilarIssues(similar)
  }, [description, subject, category, type])

  if (similarIssues.length === 0) {
    return null
  }

  return (
    <Card className="border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
          <div className="flex-1">
            <CardTitle className="text-base text-orange-900 dark:text-orange-100">
              Similar Issues Found
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              These existing feedback items are similar to yours. Please check if your issue has already been reported.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {similarIssues.map((issue) => (
          <div
            key={issue.id}
            className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">
                {issue.subject}
              </h4>
              <Badge
                variant="outline"
                className={
                  issue.status === 'resolved'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300'
                    : issue.status === 'working' || issue.status === 'in_review'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300'
                }
              >
                {issue.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {issue.description}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-500">
                Category: {issue.category}
              </span>
              {onViewSimilar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewSimilar(issue)}
                  className="h-7 text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              )}
            </div>
          </div>
        ))}
        <p className="text-xs text-orange-700 dark:text-orange-300 pt-2">
          💡 <strong>Tip:</strong> If your issue is already reported, you can track its progress instead of creating a duplicate.
        </p>
      </CardContent>
    </Card>
  )
}
