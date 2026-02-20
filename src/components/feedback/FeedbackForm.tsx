import { useState } from 'react'
import { useFeedback, FeedbackType, FeedbackPriority, Feedback } from '../../contexts/FeedbackContext'
import { useAuth } from '../../contexts/AuthContext'
import { DEPARTMENTS } from '../../lib/catalog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2, Upload, X, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { SimilarityDetector } from './SimilarityDetector'
import { FeedbackDetailModal } from './FeedbackDetailModal'

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
  const [detectedPriority, setDetectedPriority] = useState<FeedbackPriority>('medium')
  const [priorityLocked, setPriorityLocked] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [viewingSimilar, setViewingSimilar] = useState<Feedback | null>(null)

  const validateContent = (text: string): { containsProfanity: boolean; isEmergency: boolean } => {
    const containsProfanity = checkProfanity(text)

    const emergencyKeywords = ['fire', 'danger', 'emergency', 'urgent', 'flood', 'threat', 'assault', 'injury']
    const lowerText = text.toLowerCase()
    const isEmergency = emergencyKeywords.some(keyword => lowerText.includes(keyword))

    return { containsProfanity, isEmergency }
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    setProfanityWarning(false)
    setError('')

    const validation = validateContent(value)

    if (validation.isEmergency && !priorityLocked) {
      setDetectedPriority('urgent')
      setPriorityLocked(true)
      toast.warning('Emergency keywords detected. Priority set to URGENT and locked.', {
        duration: 5000,
      })
    }

    if (validation.containsProfanity) {
      setProfanityWarning(true)
    }
  }

  const handleSubjectChange = (value: string) => {
    setSubject(value)
    setProfanityWarning(false)
    setError('')

    if (checkProfanity(value)) {
      setProfanityWarning(true)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...newFiles])
      toast.success(`${newFiles.length} file(s) selected`)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setProfanityWarning(false)
    setLoading(true)

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
      toast.success('Feedback submitted successfully!')

      setTimeout(() => {
        setCategory('')
        setSubject('')
        setDescription('')
        setIsAnonymous(false)
        setDepartment('')
        setSuccess(false)
        setDetectedPriority('medium')
        setPriorityLocked(false)
        setSelectedFiles([])

        if (isAuthenticated) {
          onNavigate('dashboard')
        }
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback')
      toast.error(err.message || 'Failed to submit feedback')
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

              {type === 'academic' && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Input
                    id="department"
                    list="departments-list"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Search and select department"
                    required
                  />
                  <datalist id="departments-list">
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your feedback"
                  value={subject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  required
                />
              </div>

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

              {(description.length > 20 || subject.length > 10) && category && (
                <SimilarityDetector
                  description={description}
                  subject={subject}
                  category={category}
                  type={type}
                  onViewSimilar={(feedback) => setViewingSimilar(feedback)}
                />
              )}

              {priorityLocked && (
                <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <Lock className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900 dark:text-red-100">
                    <strong>Emergency detected:</strong> Priority automatically set to URGENT and locked. This cannot be changed due to the nature of your feedback.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Attachments (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:border-[#001F54] dark:hover:border-blue-500 transition-colors">
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <label htmlFor="file-upload" className="text-[#001F54] hover:underline cursor-pointer font-medium">
                          Click to upload
                        </label>
                        {' '}or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        PNG, JPG, PDF up to 10MB
                      </p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*,.pdf"
                    />
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="ml-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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

              {profanityWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Profanity detected. Please rewrite your feedback to comply with PAU standards.
                  </AlertDescription>
                </Alert>
              )}

              {error && !profanityWarning && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Feedback submitted successfully! Thank you for your contribution.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-[#001F54] hover:bg-blue-900"
                disabled={loading || success || profanityWarning}
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

      <FeedbackDetailModal
        feedback={viewingSimilar}
        open={!!viewingSimilar}
        onClose={() => setViewingSimilar(null)}
      />
    </div>
  )
}
