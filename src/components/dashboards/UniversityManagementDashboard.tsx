import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useFeedback } from "../../contexts/FeedbackContext";
import { Layout } from "../Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
} from "recharts";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
} from "lucide-react";
import { Button } from "../ui/button";

interface UniversityManagementDashboardProps {
  onNavigate: (page: string) => void;
}

const COLORS = [
  "#001F54",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
];

export function UniversityManagementDashboard({
  onNavigate,
}: UniversityManagementDashboardProps) {
  const { user } = useAuth();
  const { getAllFeedbacks } = useFeedback();
  const [timeRange, setTimeRange] = useState<
    "7days" | "30days" | "90days" | "all"
  >("30days");

  const allFeedbacks = getAllFeedbacks();

  // Overall statistics
  const academicCount = allFeedbacks.filter(
    (f) => f.type === "academic",
  ).length;
  const nonAcademicCount = allFeedbacks.filter(
    (f) => f.type === "non_academic",
  ).length;
  const resolvedCount = allFeedbacks.filter(
    (f) => f.status === "resolved",
  ).length;
  const pendingCount = allFeedbacks.filter(
    (f) => f.status === "pending",
  ).length;
  const resolutionRate =
    allFeedbacks.length > 0
      ? ((resolvedCount / allFeedbacks.length) * 100).toFixed(1)
      : 0;

  // Department breakdown (Academic)
  const departmentData = allFeedbacks
    .filter((f) => f.type === "academic" && f.department)
    .reduce(
      (acc, f) => {
        const dept = f.department!;
        if (!acc[dept])
          acc[dept] = { name: dept, count: 0, resolved: 0 };
        acc[dept].count += 1;
        if (f.status === "resolved") acc[dept].resolved += 1;
        return acc;
      },
      {} as Record<
        string,
        { name: string; count: number; resolved: number }
      >,
    );

  const departmentChartData = Object.values(
    departmentData,
  ).sort((a, b) => b.count - a.count);

  // Category breakdown (Non-Academic)
  const categoryData = allFeedbacks
    .filter((f) => f.type === "non_academic")
    .reduce(
      (acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

  const categoryChartData = Object.entries(categoryData).map(
    ([name, value]) => ({ name, value }),
  );

  // Status distribution
  const statusData = allFeedbacks.reduce(
    (acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const statusChartData = Object.entries(statusData).map(
    ([name, value]) => ({
      name: name.replace("_", " "),
      value,
    }),
  );

  // Priority distribution
  const priorityData = allFeedbacks.reduce(
    (acc, f) => {
      acc[f.priority] = (acc[f.priority] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const priorityChartData = Object.entries(priorityData).map(
    ([name, value]) => ({ name, value }),
  );

  // Trend data (mock - in real app would use actual dates)
  const trendData = [
    {
      date: "Week 1",
      academic: 12,
      nonAcademic: 8,
      resolved: 15,
    },
    {
      date: "Week 2",
      academic: 15,
      nonAcademic: 10,
      resolved: 18,
    },
    {
      date: "Week 3",
      academic: 10,
      nonAcademic: 12,
      resolved: 16,
    },
    {
      date: "Week 4",
      academic: 18,
      nonAcademic: 9,
      resolved: 20,
    },
  ];

  const handleExport = () => {
    alert("Analytics report exported! (This is a demo)");
  };

  return (
    <Layout title={`Management Dashboard - ${user?.name}`}>
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Feedback
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allFeedbacks.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {academicCount} academic, {nonAcademicCount}{" "}
                non-academic
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Resolution Rate
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {resolutionRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {resolvedCount} of {allFeedbacks.length}{" "}
                resolved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Review
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting action
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                High Priority
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  allFeedbacks.filter(
                    (f) =>
                      f.priority === "urgent" ||
                      f.priority === "high",
                  ).length
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="departments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="departments">
              Departments
            </TabsTrigger>
            <TabsTrigger value="categories">
              Categories
            </TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent
            value="departments"
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <CardTitle>Feedback by Department</CardTitle>
                <CardDescription>
                  Academic feedback distribution across
                  departments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={departmentChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="count"
                      fill="#001F54"
                      name="Total"
                    />
                    <Bar
                      dataKey="resolved"
                      fill="#00C49F"
                      name="Resolved"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Non-Academic Issues</CardTitle>
                  <CardDescription>
                    Distribution by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer
                    width="100%"
                    height={300}
                  >
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryChartData.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                COLORS[index % COLORS.length]
                              }
                            />
                          ),
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>
                    Feedback by priority level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer
                    width="100%"
                    height={300}
                  >
                    <PieChart>
                      <Pie
                        data={priorityChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {priorityChartData.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                COLORS[index % COLORS.length]
                              }
                            />
                          ),
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Status Overview</CardTitle>
                <CardDescription>
                  Current status of all feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={statusChartData}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#001F54" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Feedback Trends</CardTitle>
                <CardDescription>
                  Submission and resolution trends over time
                </CardDescription>
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
                      dataKey="academic"
                      stroke="#001F54"
                      name="Academic"
                    />
                    <Line
                      type="monotone"
                      dataKey="nonAcademic"
                      stroke="#0088FE"
                      name="Non-Academic"
                    />
                    <Line
                      type="monotone"
                      dataKey="resolved"
                      stroke="#00C49F"
                      name="Resolved"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}