import { useState } from 'react'
import { useFeedback, FeedbackType } from '../../contexts/FeedbackContext'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

interface FeedbackFormProps {
  onNavigate: (page: string) => void
}

const academicCategories = [
  'Course Content',
  'Lecturer Performance',
  'Assessment/Examination',
  'Timetable/Scheduling',
  'Department Administration',
  'Curriculum Issues',
  'Other'
]

const nonAcademicCategories = [
  'Hostel/Accommodation',
  'Air Conditioning',
  'Electricity/Power',
  'Water Supply',
  'Sanitation/Cleanliness',
  'Campus Security',
  'Cafeteria/Dining',
  'Internet/Wi-Fi',
  'Sports Facilities',
  'Library',
  'Other'
]

export function FeedbackForm({ onNavigate }: FeedbackFormProps) {
  const { submitFeedback, checkProfanity } = useFeedback()
  const { user, isAuthenticated } = useAuth()
  const [type, setType] = useState<FeedbackType>('academic')
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [department, setDepartment] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profanityWarning, setProfanityWarning] = useState(false)

  const departments = [
    'Computer Science',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Economics',
    'Accounting',
    'Mass Communication',
    'Law',
    'Other'
  ]

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    setProfanityWarning(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setProfanityWarning(false)
    setLoading(true)

    // Check for profanity
    if (checkProfanity(subject) || checkProfanity(description)) {
      setProfanityWarning(true)
      setError('Your feedback contains inappropriate language. Please revise and resubmit.')
      setLoading(false)
      return
    }

    try {
      await submitFeedback({
        type,
        category,
        subject,
        description,
        isAnonymous,
        studentId: user?.id || 'anonymous',
        studentName: isAnonymous ? undefined : user?.name,
        department: type === 'academic' ? department : undefined
      })

      setSuccess(true)
      
      // Reset form
      setTimeout(() => {
        setCategory('')
        setSubject('')
        setDescription('')
        setIsAnonymous(false)
        setDepartment('')
        setSuccess(false)
        
        if (isAuthenticated) {
          onNavigate('dashboard')
        }
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  const categories = type === 'academic' ? academicCategories : nonAcademicCategories

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'home')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Share Your Feedback</CardTitle>
            <CardDescription>
              Help us improve PAU by sharing your concerns and suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Feedback Type */}
              <Tabs value={type} onValueChange={(v) => setType(v as FeedbackType)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="academic">Academic</TabsTrigger>
                  <TabsTrigger value="non_academic">Non-Academic</TabsTrigger>
                </TabsList>
                <TabsContent value="academic" className="space-y-4 mt-4">
                  <Alert>
                    <AlertDescription>
                      Academic feedback includes course content, lecturer performance, assessments, and departmental issues.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
                <TabsContent value="non_academic" className="space-y-4 mt-4">
                  <Alert>
                    <AlertDescription>
                      Non-academic feedback covers hostel conditions, facilities, utilities, and campus amenities.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department (Academic only) */}
              {type === 'academic' && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select value={department} onValueChange={setDepartment} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your feedback"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about your feedback..."
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  rows={6}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  {description.length} characters
                </p>
              </div>

              {/* Anonymous Toggle */}
              {isAuthenticated && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="anonymous">Submit Anonymously</Label>
                    <p className="text-sm text-muted-foreground">
                      Your identity will be hidden from staff members
                    </p>
                  </div>
                  <Switch
                    id="anonymous"
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                  />
                </div>
              )}

              {/* Profanity Warning */}
              {profanityWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your feedback contains inappropriate language and cannot be submitted. Please revise your message.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Message */}
              {error && !profanityWarning && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {success && (
                <Alert className="bg-green-50 text-green-900 border-green-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Feedback submitted successfully! Thank you for your contribution.
                  </AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#001F54] hover:bg-blue-900"
                disabled={loading || success}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}