import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ALL_HOSTELS } from '../lib/catalog'
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

type SurveyQuestion = {
  id: string
  prompt: string
  max_score: number
  requires_detail: boolean
  detail_label?: string
}

type Survey = {
  id: string
  title: string
  description?: string
  type: 'general' | 'hostel'
  target_hostel?: string
  allow_anonymous_responses: boolean
  is_creator: boolean
  questions: SurveyQuestion[]
}

type MyResponse = {
  survey_id: string
  submitted_at: string
  can_edit: boolean
  can_edit_until: string
  anonymous: boolean
  answers: Array<{ question_id: string; score: number; detail?: string }>
}

type SurveyResponseDetail = {
  response_id: string
  submitted_at: string
  anonymous: boolean
  respondent_name?: string | null
  answers: Array<{
    question_id: string
    question_prompt: string
    score: number
    detail?: string | null
  }>
}

type DraftQuestion = {
  prompt: string
  max_score: number
  requires_detail: boolean
  detail_label: string
}

export function SurveysPage({ onNavigate }: SurveysPageProps) {
  const { token, user } = useAuth()
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [details, setDetails] = useState<Record<string, string>>({})
  const [anonymousChoice, setAnonymousChoice] = useState<Record<string, boolean>>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [results, setResults] = useState<Record<string, { response_count: number; average_percent: number; star_rating: number }>>({})
  const [myResponses, setMyResponses] = useState<Record<string, MyResponse | null>>({})
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({})
  const [surveyResponses, setSurveyResponses] = useState<Record<string, SurveyResponseDetail[]>>({})
  const [loadingResponses, setLoadingResponses] = useState<Record<string, boolean>>({})

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [surveyType, setSurveyType] = useState<'general' | 'hostel'>('general')
  const [targetHostel, setTargetHostel] = useState('')
  const [questions, setQuestions] = useState<DraftQuestion[]>([
    { prompt: 'Overall satisfaction', max_score: 10, requires_detail: false, detail_label: '' },
    { prompt: 'Response speed', max_score: 10, requires_detail: false, detail_label: '' },
  ])
  const [allowAnonymousResponses, setAllowAnonymousResponses] = useState(false)

  const loadSurveys = async () => {
    if (!token || !user) return
    try {
      const rows = await apiRequest<Survey[]>('/surveys', { token })
      setSurveys(rows)

      if (user.role === 'student') {
        const responsePairs = await Promise.all(rows.map(async (s) => {
          try {
            const r = await apiRequest<MyResponse | null>(`/surveys/${s.id}/my-response`, { token })
            return [s.id, r] as const
          } catch {
            return [s.id, null] as const
          }
        }))
        const mapped = Object.fromEntries(responsePairs)
        setMyResponses(mapped)

        const initialAnswers: Record<string, number> = {}
        const initialDetails: Record<string, string> = {}
        const initialAnon: Record<string, boolean> = {}
        for (const survey of rows) {
          const mr = mapped[survey.id]
          if (!mr) continue
          initialAnon[survey.id] = !!mr.anonymous
          for (const a of mr.answers) {
            initialAnswers[a.question_id] = a.score
            if (a.detail) initialDetails[a.question_id] = a.detail
          }
        }
        setAnswers(initialAnswers)
        setDetails(initialDetails)
        setAnonymousChoice(initialAnon)
      }

      const pairs = await Promise.all(rows.map(async (s) => {
        try {
          const r = await apiRequest<{response_count: number; average_percent: number; star_rating: number}>(`/surveys/${s.id}/results`, { token })
          return [s.id, r] as const
        } catch {
          return [s.id, null] as const
        }
      }))
      const resultRows: Record<string, { response_count: number; average_percent: number; star_rating: number }> = {}
      for (const [surveyId, data] of pairs) {
        if (data) resultRows[surveyId] = data
      }
      setResults(resultRows)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load surveys')
    }
  }

  useEffect(() => {
    void loadSurveys()
  }, [token, user?.role])

  const toggleResponses = async (survey: Survey) => {
    if (!token) return
    const next = !expandedResponses[survey.id]
    setExpandedResponses((prev) => ({ ...prev, [survey.id]: next }))
    if (!next || surveyResponses[survey.id]) return
    try {
      setLoadingResponses((prev) => ({ ...prev, [survey.id]: true }))
      const rows = await apiRequest<SurveyResponseDetail[]>(`/surveys/${survey.id}/responses`, { token })
      setSurveyResponses((prev) => ({ ...prev, [survey.id]: rows }))
    } catch (err: any) {
      toast.error(err.message || 'Failed to load survey responses')
    } finally {
      setLoadingResponses((prev) => ({ ...prev, [survey.id]: false }))
    }
  }

  const submitSurvey = async (survey: Survey) => {
    if (!token) return
    try {
      setSubmittingId(survey.id)
      const payload = {
        anonymous: survey.allow_anonymous_responses ? !!anonymousChoice[survey.id] : false,
        answers: survey.questions.map((q) => ({
          question_id: q.id,
          score: Math.max(0, Math.min(Number(answers[q.id] ?? 0), q.max_score)),
          detail: (details[q.id] || '').trim() || null,
        })),
      }
      await apiRequest<{ message: string }>(`/surveys/${survey.id}/submit`, {
        method: 'POST',
        token,
        body: payload,
      })
      toast.success('Survey response submitted')
      await loadSurveys()
    } catch (err: any) {
      toast.error(err.message || 'Submission failed')
    } finally {
      setSubmittingId(null)
    }
  }

  const createSurvey = async () => {
    if (!token) return
    const validQuestions = questions.filter((q) => q.prompt.trim())
    if (validQuestions.length === 0) {
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
          questions: validQuestions.map((q, idx) => ({
            prompt: q.prompt.trim(),
            max_score: q.max_score,
            requires_detail: q.requires_detail,
            detail_label: q.requires_detail ? (q.detail_label.trim() || 'Add details') : null,
            position: idx,
          })),
        },
      })
      toast.success('Survey created')
      setTitle('')
      setDescription('')
      setTargetHostel('')
      setAllowAnonymousResponses(false)
      setQuestions([{ prompt: '', max_score: 10, requires_detail: false, detail_label: '' }])
      await loadSurveys()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create survey')
    } finally {
      setCreating(false)
    }
  }

  const addQuestion = () => setQuestions((prev) => [...prev, { prompt: '', max_score: 10, requires_detail: false, detail_label: '' }])
  const updateQuestion = (idx: number, patch: Partial<DraftQuestion>) => setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
  const removeQuestion = (idx: number) => setQuestions((prev) => prev.filter((_, i) => i !== idx))

  if (!user) return null

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Surveys</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Survey</CardTitle>
          <CardDescription>Anyone can create. Creator identity is tracked internally but not shown publicly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={surveyType} onValueChange={(v) => setSurveyType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input list="hostels-list" value={targetHostel} onChange={(e) => setTargetHostel(e.target.value)} placeholder="Search and select hostel" />
              <datalist id="hostels-list">{ALL_HOSTELS.map((h) => <option key={h} value={h} />)}</datalist>
            </div>
          )}
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>

          <div className="space-y-2">
            <Label>Questions</Label>
            {questions.map((q, idx) => (
              <div key={idx} className="border rounded-md p-3 space-y-2">
                <Input placeholder="Question prompt" value={q.prompt} onChange={(e) => updateQuestion(idx, { prompt: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" min={2} max={10} value={q.max_score} onChange={(e) => updateQuestion(idx, { max_score: Number(e.target.value) || 10 })} />
                  <div className="flex items-center gap-2"><Checkbox checked={q.requires_detail} onCheckedChange={(v) => updateQuestion(idx, { requires_detail: v === true })} /><Label>Detail required</Label></div>
                </div>
                {q.requires_detail && <Input placeholder="Detail prompt (optional)" value={q.detail_label} onChange={(e) => updateQuestion(idx, { detail_label: e.target.value })} />}
                {questions.length > 1 && <Button variant="outline" size="sm" onClick={() => removeQuestion(idx)}>Remove</Button>}
              </div>
            ))}
            <Button variant="outline" onClick={addQuestion}>Add Question</Button>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="allow-anon" checked={allowAnonymousResponses} onCheckedChange={(checked) => setAllowAnonymousResponses(checked === true)} />
            <Label htmlFor="allow-anon">Allow responders to submit anonymously</Label>
          </div>
          <Button disabled={creating || !title.trim()} onClick={() => void createSurvey()}>{creating ? 'Creating...' : 'Create Survey'}</Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {surveys.map((survey) => {
          const canViewResults = !!results[survey.id]
          const isStudent = user.role === 'student'
          const myResponse = myResponses[survey.id]

          return (
            <Card key={survey.id}>
              <CardHeader>
                <CardTitle>{survey.title}</CardTitle>
                <CardDescription>{survey.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>Type: <strong>{survey.type}</strong></p>
                {survey.target_hostel && <p>Hostel: <strong>{survey.target_hostel}</strong></p>}
                <p>Anonymous Responses: <strong>{survey.allow_anonymous_responses ? 'Allowed' : 'Disabled'}</strong></p>

                {canViewResults && (
                  <>
                    <p>Responses: <strong>{results[survey.id]?.response_count ?? 0}</strong></p>
                    <p>Average: <strong>{results[survey.id]?.average_percent ?? 0}%</strong></p>
                    <p>Rating: <strong>{results[survey.id]?.star_rating ?? 0}/5</strong></p>
                  </>
                )}

                {survey.is_creator && (
                  <div className="pt-1">
                    <Button size="sm" variant="outline" onClick={() => void toggleResponses(survey)}>
                      {expandedResponses[survey.id] ? 'Hide Responses' : 'View Responses'}
                    </Button>
                  </div>
                )}

                {survey.is_creator && expandedResponses[survey.id] && (
                  <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                    {loadingResponses[survey.id] && <p className="text-xs text-muted-foreground">Loading responses...</p>}
                    {!loadingResponses[survey.id] && (surveyResponses[survey.id]?.length || 0) === 0 && (
                      <p className="text-xs text-muted-foreground">No responses yet.</p>
                    )}
                    {!loadingResponses[survey.id] && (surveyResponses[survey.id] || []).map((row) => (
                      <details key={row.response_id} className="border rounded-md p-2 bg-background">
                        <summary className="cursor-pointer text-xs">
                          {row.anonymous ? 'Anonymous responder' : (row.respondent_name || 'Responder')} - {new Date(row.submitted_at).toLocaleString()}
                        </summary>
                        <div className="mt-2 space-y-2">
                          {row.answers.map((ans) => (
                            <div key={`${row.response_id}-${ans.question_id}`} className="text-xs border rounded p-2">
                              <p><strong>{ans.question_prompt}</strong></p>
                              <p>Score: {ans.score}</p>
                              {ans.detail && <p>Detail: {ans.detail}</p>}
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                )}

                {isStudent && myResponse && (
                  <p>
                    Status: <strong>Filled</strong>{' '}
                    {myResponse.can_edit ? `(editable until ${new Date(myResponse.can_edit_until).toLocaleString()})` : '(edit window closed)'}
                  </p>
                )}

                {isStudent && (
                  <div className="space-y-3 pt-2">
                    {survey.questions.map((question) => (
                      <div key={question.id} className="space-y-2">
                        <Label>{question.prompt} (0-{question.max_score})</Label>
                        <Input
                          type="number"
                          min={0}
                          max={question.max_score}
                          value={answers[question.id] ?? ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: Number(e.target.value) }))}
                        />
                        <Input
                          placeholder={question.detail_label || 'Add details (optional)'}
                          value={details[question.id] ?? ''}
                          onChange={(e) => setDetails(prev => ({ ...prev, [question.id]: e.target.value }))}
                          required={question.requires_detail}
                        />
                      </div>
                    ))}
                    {survey.allow_anonymous_responses && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`survey-anon-${survey.id}`}
                          checked={!!anonymousChoice[survey.id]}
                          onCheckedChange={(checked) => setAnonymousChoice(prev => ({ ...prev, [survey.id]: checked === true }))}
                        />
                        <Label htmlFor={`survey-anon-${survey.id}`}>Submit this response anonymously</Label>
                      </div>
                    )}
                    <Button disabled={submittingId === survey.id} onClick={() => void submitSurvey(survey)}>
                      {submittingId === survey.id ? 'Submitting...' : (myResponse ? 'Submit Another Response / Edit' : 'Submit Survey')}
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
