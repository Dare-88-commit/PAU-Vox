import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiRequest } from '../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { toast } from 'sonner'

interface SurveysPageProps {
  onNavigate: (page: string) => void
}

type Survey = {
  id: string
  title: string
  description?: string
  type: 'general' | 'hostel'
  target_hostel?: string
  created_by_id: string
  allow_anonymous_responses: boolean
  questions: Array<{ id: string; prompt: string; max_score: number }>
}

const MANAGER_ROLES = ['department_head', 'student_affairs', 'university_management']

export function SurveysPage({ onNavigate }: SurveysPageProps) {
  const { token, user } = useAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [anonymousChoice, setAnonymousChoice] = useState<Record<string, boolean>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [results, setResults] = useState<Record<string, { response_count: number; average_percent: number; star_rating: number }>>({})

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [surveyType, setSurveyType] = useState<'general' | 'hostel'>('general')
  const [targetHostel, setTargetHostel] = useState('')
  const [questionPrompts, setQuestionPrompts] = useState<string>('Overall satisfaction\nResponse speed\nWellbeing')
  const [allowAnonymousResponses, setAllowAnonymousResponses] = useState(false)

  const isManager = !!user && MANAGER_ROLES.includes(user.role)

  const loadSurveys = async () => {
    if (!token || !user) return
    try {
      const rows = await apiRequest<Survey[]>('/surveys', { token })
      setSurveys(rows)

      const visibleResultRows = rows.filter((s) => isManager || s.created_by_id === user.id)
      if (visibleResultRows.length > 0) {
        const pairs = await Promise.all(
          visibleResultRows.map(async (s) => {
            try {
              const r = await apiRequest<{ response_count: number; average_percent: number; star_rating: number }>(`/surveys/${s.id}/results`, { token })
              return [s.id, r] as const
            } catch {
              return [s.id, { response_count: 0, average_percent: 0, star_rating: 0 }] as const
            }
          }),
        )
        setResults(Object.fromEntries(pairs))
      } else {
        setResults({})
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load surveys')
    }
  }

  useEffect(() => {
    void loadSurveys()
  }, [token, user?.role])

  const submitSurvey = async (survey: Survey) => {
    if (!token) return
    try {
      setSubmittingId(survey.id)
      const payload = {
        anonymous: survey.allow_anonymous_responses ? !!anonymousChoice[survey.id] : false,
        answers: survey.questions.map((q) => ({
          question_id: q.id,
          score: Math.max(0, Math.min(Number(answers[q.id] ?? 0), q.max_score)),
        })),
      }
      await apiRequest<{ message: string }>(`/surveys/${survey.id}/submit`, {
        method: 'POST',
        token,
        body: payload,
      })
      toast.success('Survey submitted')
      setSurveys((prev) => prev.filter((item) => item.id !== survey.id))
    } catch (err: any) {
      toast.error(err.message || 'Submission failed')
    } finally {
      setSubmittingId(null)
    }
  }

  const createSurvey = async () => {
    if (!token) return
    const prompts = questionPrompts.split('\n').map((v) => v.trim()).filter(Boolean)
    if (prompts.length === 0) {
      toast.error('Add at least one question')
      return
    }
    if (surveyType === 'hostel' && !targetHostel.trim()) {
      toast.error('Target hostel is required for hostel surveys')
      return
    }

    try {
      setCreating(true)
      await apiRequest('/surveys', {
        method: 'POST',
        token,
        body: {
          title,
          description,
          type: surveyType,
          target_hostel: surveyType === 'hostel' ? targetHostel : null,
          allow_anonymous_responses: allowAnonymousResponses,
          questions: prompts.map((prompt, idx) => ({ prompt, max_score: 10, position: idx })),
        },
      })
      toast.success('Survey created')
      setTitle('')
      setDescription('')
      setTargetHostel('')
      setAllowAnonymousResponses(false)
      await loadSurveys()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create survey')
    } finally {
      setCreating(false)
    }
  }

  if (!user) return null

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Surveys</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Survey</CardTitle>
          <CardDescription>
            Any authenticated user can create a survey. Creator identity is always recorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={surveyType} onValueChange={(v) => setSurveyType(v as 'general' | 'hostel')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="hostel">Hostel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {surveyType === 'hostel' && (
            <div className="space-y-2">
              <Label>Target Hostel</Label>
              <Input value={targetHostel} onChange={(e) => setTargetHostel(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Questions (one per line)</Label>
            <Textarea value={questionPrompts} onChange={(e) => setQuestionPrompts(e.target.value)} rows={4} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="allow-anon"
              checked={allowAnonymousResponses}
              onCheckedChange={(checked) => setAllowAnonymousResponses(checked === true)}
            />
            <Label htmlFor="allow-anon">Allow responders to submit anonymously</Label>
          </div>
          <Button disabled={creating || !title.trim()} onClick={() => void createSurvey()}>
            {creating ? 'Creating...' : 'Create Survey'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {surveys.map((survey) => {
          const canViewResults = isManager || survey.created_by_id === user.id
          const isStudent = user.role === 'student'

          return (
            <Card key={survey.id}>
              <CardHeader>
                <CardTitle>{survey.title}</CardTitle>
                <CardDescription>{survey.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  Type: <strong>{survey.type}</strong>
                </p>
                {survey.target_hostel && (
                  <p>
                    Hostel: <strong>{survey.target_hostel}</strong>
                  </p>
                )}
                <p>
                  Creator ID: <strong>{survey.created_by_id}</strong>
                </p>
                <p>
                  Anonymous Responses: <strong>{survey.allow_anonymous_responses ? 'Allowed' : 'Disabled'}</strong>
                </p>

                {canViewResults && (
                  <>
                    <p>
                      Responses: <strong>{results[survey.id]?.response_count ?? 0}</strong>
                    </p>
                    <p>
                      Average: <strong>{results[survey.id]?.average_percent ?? 0}%</strong>
                    </p>
                    <p>
                      Rating: <strong>{results[survey.id]?.star_rating ?? 0}/5</strong>
                    </p>
                  </>
                )}

                {isStudent && (
                  <div className="space-y-3 pt-2">
                    {survey.questions.map((question) => (
                      <div key={question.id} className="space-y-2">
                        <Label>
                          {question.prompt} (0-{question.max_score})
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={question.max_score}
                          value={answers[question.id] ?? ''}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    ))}
                    {survey.allow_anonymous_responses && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`survey-anon-${survey.id}`}
                          checked={!!anonymousChoice[survey.id]}
                          onCheckedChange={(checked) =>
                            setAnonymousChoice((prev) => ({ ...prev, [survey.id]: checked === true }))
                          }
                        />
                        <Label htmlFor={`survey-anon-${survey.id}`}>Submit this response anonymously</Label>
                      </div>
                    )}
                    <Button disabled={submittingId === survey.id} onClick={() => void submitSurvey(survey)}>
                      {submittingId === survey.id ? 'Submitting...' : 'Submit Survey'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
