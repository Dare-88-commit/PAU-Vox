import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFeedback } from '../../contexts/FeedbackContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from 'recharts'
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  BarChart3,
  Calendar,
  Users,
  Target
} from 'lucide-react'

interface AnalyticsPageProps {
  onNavigate: (page: string) => void
}

const COLORS = ['#001F54', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export function AnalyticsPage({ onNavigate }: AnalyticsPageProps) {
  const { user } = useAuth()
  const { getAllFeedbacks } = useFeedback()
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days')

  const allFeedbacks = getAllFeedbacks()

  // Overall statistics
  const academicCount = allFeedbacks.filter(f => f.type === 'academic').length
  const nonAcademicCount = allFeedbacks.filter(f => f.type === 'non_academic').length
  const resolvedCount = allFeedbacks.filter(f => f.status === 'resolved').length
  const pendingCount = allFeedbacks.filter(f => f.status === 'pending').length
  const resolutionRate =
    allFeedbacks.length > 0 ? ((resolvedCount / allFeedbacks.length) * 100).toFixed(1) : '0'
  const avgResponseTime = '1.8' // Mock data

  // Department breakdown (Academic)
  const departmentData = allFeedbacks
    .filter(f => f.type === 'academic' && f.department)
    .reduce((acc, f) => {
      const dept = f.department!
      if (!acc[dept]) acc[dept] = { name: dept, total: 0, resolved: 0, pending: 0 }
      acc[dept].total += 1
      if (f.status === 'resolved') acc[dept].resolved += 1
      if (f.status === 'pending') acc[dept].pending += 1
      return acc
    }, {} as Record<string, { name: string; total: number; resolved: number; pending: number }>)

  const departmentChartData = Object.values(departmentData).sort((a, b) => b.total - a.total)

  // Category breakdown (Non-Academic)
  const categoryData = allFeedbacks
    .filter(f => f.type === 'non_academic')
    .reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const categoryChartData = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Status distribution
  const statusData = allFeedbacks.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statusChartData = Object.entries(statusData).map(([name, value]) => ({
    name: name.replace('_', ' ').charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    value
  }))

  // Priority distribution
  const priorityData = allFeedbacks.reduce((acc, f) => {
    acc[f.priority] = (acc[f.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const priorityChartData = Object.entries(priorityData).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color:
      name === 'urgent'
        ? '#DC2626'
        : name === 'high'
        ? '#F59E0B'
        : name === 'medium'
        ? '#3B82F6'
        : '#6B7280'
  }))

  // Trend data (mock - in real app would use actual dates)
  const trendData = [
    { date: 'Week 1', academic: 12, nonAcademic: 8, resolved: 15, pending: 5 },
    { date: 'Week 2', academic: 15, nonAcademic: 10, resolved: 18, pending: 7 },
    { date: 'Week 3', academic: 10, nonAcademic: 12, resolved: 16, pending: 6 },
    { date: 'Week 4', academic: 18, nonAcademic: 9, resolved: 20, pending: 7 }
  ]

  // Response time data (mock)
  const responseTimeData = [
    { category: 'Academic', avgDays: 1.5 },
    { category: 'Non-Academic', avgDays: 2.1 },
    { category: 'Facilities', avgDays: 1.8 },
    { category: 'Student Affairs', avgDays: 1.2 }
  ]

  const handleExport = () => {
    // Mock export functionality
    const reportData = {
      generatedAt: new Date().toISOString(),
      timeRange,
      summary: {
        total: allFeedbacks.length,
        academic: academicCount,
        nonAcademic: nonAcademicCount,
        resolved: resolvedCount,
        pending: pendingCount,
        resolutionRate: `${resolutionRate}%`
      },
      departmentBreakdown: departmentChartData,
      categoryBreakdown: categoryChartData,
      statusDistribution: statusChartData,
      priorityDistribution: priorityChartData
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pau-vox-analytics-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center mb-2">
                <BarChart3 className="w-8 h-8 text-[#001F54] mr-3" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Analytics Dashboard
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Comprehensive insights and performance metrics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={v => setTimeRange(v as any)}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport} className="bg-[#001F54] hover:bg-blue-900">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
              <TrendingUp className="h-5 w-5 text-[#001F54]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#001F54]">{allFeedbacks.length}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {academicCount} academic • {nonAcademicCount} non-academic
              </p>
              <div className="mt-3 flex items-center text-xs text-green-600 dark:text-green-400">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>+12% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{resolutionRate}%</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                {resolvedCount} of {allFeedbacks.length} resolved
              </p>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${resolutionRate}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Awaiting action</p>
              {pendingCount > 10 && (
                <div className="mt-3 flex items-center text-xs text-orange-600 dark:text-orange-400">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  <span>High backlog</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Target className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{avgResponseTime} days</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Time to first response
              </p>
              <div className="mt-3 flex items-center text-xs text-purple-600 dark:text-purple-400">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                <span>Meeting target</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="status">Status & Priority</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Type Distribution</CardTitle>
                  <CardDescription>Academic vs Non-Academic</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Academic', value: academicCount },
                          { name: 'Non-Academic', value: nonAcademicCount }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#001F54" />
                        <Cell fill="#00C49F" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Overview</CardTitle>
                  <CardDescription>Current status distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#001F54" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Response Time by Category</CardTitle>
                <CardDescription>Average days to first response</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTimeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="avgDays" fill="#0088FE" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Academic Feedback by Department</CardTitle>
                <CardDescription>Total, resolved, and pending feedback per department</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={departmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={120} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#001F54" name="Total" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="resolved" fill="#00C49F" name="Resolved" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="pending" fill="#FFBB28" name="Pending" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              {departmentChartData.slice(0, 3).map((dept, index) => (
                <Card key={dept.name}>
                  <CardHeader>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                    <CardDescription>Department Performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total:</span>
                        <span className="font-bold">{dept.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Resolved:</span>
                        <span className="font-bold text-green-600">{dept.resolved}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Resolution Rate:</span>
                        <span className="font-bold">
                          {((dept.resolved / dept.total) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Non-Academic Issues</CardTitle>
                  <CardDescription>Distribution by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>Top non-academic issues</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={categoryChartData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0088FE" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Status Distribution</CardTitle>
                  <CardDescription>Current status of all feedback</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>Feedback by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={priorityChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {priorityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Submission Trends</CardTitle>
                <CardDescription>Academic vs non-academic feedback over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="academic"
                      stackId="1"
                      stroke="#001F54"
                      fill="#001F54"
                      name="Academic"
                    />
                    <Area
                      type="monotone"
                      dataKey="nonAcademic"
                      stackId="1"
                      stroke="#0088FE"
                      fill="#0088FE"
                      name="Non-Academic"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resolution Trends</CardTitle>
                <CardDescription>Resolved vs pending feedback over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      stroke="#00C49F"
                      strokeWidth={3}
                      name="Resolved"
                      dot={{ fill: '#00C49F', r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pending"
                      stroke="#FFBB28"
                      strokeWidth={3}
                      name="Pending"
                      dot={{ fill: '#FFBB28', r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
