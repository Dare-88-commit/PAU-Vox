import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { toast } from 'sonner'
import { apiRequest, API_BASE_URL } from '../../lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Download, BarChart3, Calendar } from 'lucide-react'

interface AnalyticsPageProps {
  onNavigate: (page: string) => void
}

type AnalyticsPayload = {
  total_feedback: number
  by_type: Record<string, number>
  by_status: Record<string, number>
  by_priority: Record<string, number>
  top_categories: Record<string, number>
  resolution: { average_resolution_hours: number; resolved_count: number }
}

export function AnalyticsPage({ onNavigate }: AnalyticsPageProps) {
  const { user, token } = useAuth()
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days')
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)
  const [trendRows, setTrendRows] = useState<Array<{date: string; submitted: number; resolved: number; avg_resolution_hours: number}>>([])

  const trendDays = useMemo(() => {
    if (timeRange === '7days') return 7
    if (timeRange === '90days') return 90
    if (timeRange === 'all') return 365
    return 30
  }, [timeRange])

  const isDepartmentScoped = user?.role === 'department_head' || user?.role === 'course_coordinator'

  useEffect(() => {
    const load = async () => {
      if (!token) return
      try {
        const deptQuery = isDepartmentScoped && user?.department
          ? `?department=${encodeURIComponent(user.department)}`
          : ''
        const a = await apiRequest<AnalyticsPayload>(`/analytics${deptQuery}`, { token })
        setAnalytics(a)

        const trendDept = isDepartmentScoped && user?.department
          ? `&department=${encodeURIComponent(user.department)}`
          : ''
        const t = await apiRequest<{items: Array<{date: string; submitted: number; resolved: number; avg_resolution_hours: number}>}>(
          `/analytics/trends?days=${trendDays}${trendDept}`,
          { token },
        )
        setTrendRows(t.items)
      } catch (err: any) {
        toast.error(err.message || 'Failed to load analytics')
      }
    }
    void load()
  }, [token, user?.role, user?.department, trendDays, isDepartmentScoped])

  const handleExport = async () => {
    if (!token) return
    try {
      const dept = isDepartmentScoped && user?.department
        ? `&department=${encodeURIComponent(user.department)}`
        : ''
      const response = await fetch(`${API_BASE_URL}/analytics/export?format=${exportFormat}${dept}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pau-vox-analytics-${Date.now()}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Report downloaded successfully')
    } catch (err: any) {
      toast.error(err.message || 'Export failed')
    }
  }

  const statusChart = Object.entries(analytics?.by_status || {}).map(([k, v]) => ({ name: k, value: v }))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-7 h-7 text-[#001F54]" />
              <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            </div>
            <p className="text-sm text-muted-foreground">Trends, resolution speed, and performance monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={v => setTimeRange(v as any)}>
              <SelectTrigger className="w-[150px]"><Calendar className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="all">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Select value={exportFormat} onValueChange={v => setExportFormat(v as any)}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Total Feedback</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{analytics?.total_feedback ?? 0}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Resolved</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{analytics?.resolution.resolved_count ?? 0}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Avg Resolution (hrs)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{analytics?.resolution.average_resolution_hours ?? 0}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Academic / Non-Academic</CardTitle></CardHeader><CardContent><div className="text-lg font-semibold">{analytics?.by_type.academic ?? 0} / {analytics?.by_type.non_academic ?? 0}</div></CardContent></Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Status Distribution</CardTitle><CardDescription>Current workflow state</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#001F54" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Resolution Trends</CardTitle><CardDescription>Daily throughput and speed</CardDescription></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendRows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="submitted" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resolved" stroke="#16a34a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="avg_resolution_hours" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
