import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useFeedback } from "../../contexts/FeedbackContext";
import { useSearch } from "../../contexts/SearchContext";
import { Layout } from "../Layout";
import { FeedbackCard } from "../feedback/FeedbackCard";
import { FeedbackDetailModal } from "../feedback/FeedbackDetailModal";
import { Button } from "../ui/button";
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
import { Badge } from "../ui/badge";
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  MapPin,
  TrendingUp,
} from "lucide-react";
import type { Feedback } from "../../contexts/FeedbackContext";

interface StudentDashboardProps {
  onNavigate: (page: string) => void;
}

export function StudentDashboard({
  onNavigate,
}: StudentDashboardProps) {
  const { user } = useAuth();
  const { getUserFeedbacks } = useFeedback();
  const { searchQuery } = useSearch();
  const [selectedFeedback, setSelectedFeedback] =
    useState<Feedback | null>(null);

  // Filter feedbacks for current user
  const allMyFeedbacks = getUserFeedbacks(user?.id || "");
  
  // Apply search filter
  const myFeedbacks = searchQuery
    ? allMyFeedbacks.filter(
        (f) =>
          f.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allMyFeedbacks;

  // Categorize for SRS Section 3.8 Reporting
  const pendingCount = myFeedbacks.filter(
    (f) => f.status === "pending",
  ).length;
  const inReviewCount = myFeedbacks.filter((f) =>
    ["in_review", "assigned", "working"].includes(f.status),
  ).length;
  const resolvedCount = myFeedbacks.filter(
    (f) => f.status === "resolved",
  ).length;

  return (
    <Layout title={`Welcome, ${user?.name || "Student"}`}>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* SRS Section 1.2: Sector-Aware Quick Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="border-none shadow-lg bg-white dark:bg-gray-800 rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Total Posts
              </CardTitle>
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">
                {myFeedbacks.length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white dark:bg-gray-800 rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Pending
              </CardTitle>
              <Clock className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-orange-500">
                {pendingCount}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white dark:bg-gray-800 rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">
                In Review
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-500">
                {inReviewCount}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white dark:bg-gray-800 rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Resolved
              </CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-green-500">
                {resolvedCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between bg-[#001F54] p-6 rounded-[2rem] text-white shadow-xl shadow-blue-900/20">
          <div className="hidden md:block">
            <h3 className="text-lg font-bold">
              Have something to share?
            </h3>
            <p className="text-blue-200 text-sm">
              Your feedback drives PAU's excellence.
            </p>
          </div>
          <Button
            onClick={() => onNavigate("feedback")}
            size="lg"
            className="bg-white text-[#001F54] hover:bg-blue-50 font-bold rounded-2xl w-full md:w-auto transition-transform hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Submission
          </Button>
        </div>

        {/* Feedback List Container */}
        <Card className="rounded-[2.5rem] shadow-xl border-gray-100 overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  Feedback Tracking
                </CardTitle>
                <CardDescription>
                  Monitor the resolution status of your academic
                  and welfare concerns
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="rounded-lg px-3 py-1"
              >
                Student Portal
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {myFeedbacks.length === 0 ? (
              <div className="text-center py-20 px-6">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-10 h-10 text-blue-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Your inbox is empty
                </h3>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                  Submit your first academic or facility
                  feedback to see it tracked here.
                </p>
                <Button
                  onClick={() => onNavigate("feedback")}
                  variant="outline"
                  className="rounded-xl border-2 px-8 font-bold"
                >
                  Get Started
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full justify-start rounded-none bg-transparent border-b border-gray-100 p-0 h-16">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:border-b-4 border-blue-600 rounded-none h-full px-8 font-bold"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="pending"
                    className="data-[state=active]:border-b-4 border-orange-500 rounded-none h-full px-8 font-bold"
                  >
                    Pending
                  </TabsTrigger>
                  <TabsTrigger
                    value="in_progress"
                    className="data-[state=active]:border-b-4 border-blue-500 rounded-none h-full px-8 font-bold"
                  >
                    In Review
                  </TabsTrigger>
                  <TabsTrigger
                    value="resolved"
                    className="data-[state=active]:border-b-4 border-green-600 rounded-none h-full px-8 font-bold"
                  >
                    Resolved
                  </TabsTrigger>
                </TabsList>

                <div className="p-6 md:p-8">
                  <TabsContent
                    value="all"
                    className="space-y-4 m-0"
                  >
                    {myFeedbacks.map((f) => (
                      <div key={f.id} className="relative">
                        {/* SRS Sector Indicator Badge */}
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                          <Badge
                            className={
                              f.sector === "academic"
                                ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                                : "bg-cyan-100 text-cyan-700 hover:bg-cyan-100"
                            }
                          >
                            {f.sector === "academic" ? (
                              <BookOpen
                                size={12}
                                className="mr-1"
                              />
                            ) : (
                              <MapPin
                                size={12}
                                className="mr-1"
                              />
                            )}
                            {f.sector?.replace("-", " ")}
                          </Badge>
                        </div>
                        <FeedbackCard
                          feedback={f}
                          onClick={() => setSelectedFeedback(f)}
                        />
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent
                    value="pending"
                    className="space-y-4 m-0"
                  >
                    {myFeedbacks
                      .filter((f) => f.status === "pending")
                      .map((f) => (
                        <FeedbackCard
                          key={f.id}
                          feedback={f}
                          onClick={() => setSelectedFeedback(f)}
                        />
                      ))}
                  </TabsContent>

                  <TabsContent
                    value="in_progress"
                    className="space-y-4 m-0"
                  >
                    {myFeedbacks
                      .filter((f) =>
                        [
                          "in_review",
                          "assigned",
                          "working",
                        ].includes(f.status),
                      )
                      .map((f) => (
                        <FeedbackCard
                          key={f.id}
                          feedback={f}
                          onClick={() => setSelectedFeedback(f)}
                        />
                      ))}
                  </TabsContent>

                  <TabsContent
                    value="resolved"
                    className="space-y-4 m-0"
                  >
                    {myFeedbacks
                      .filter((f) => f.status === "resolved")
                      .map((f) => (
                        <FeedbackCard
                          key={f.id}
                          feedback={f}
                          onClick={() => setSelectedFeedback(f)}
                        />
                      ))}
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SRS Section 2.4: Modal configuration for Students */}
      <FeedbackDetailModal
        feedback={selectedFeedback}
        open={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        showInternalNotes={false} // Prevents staff-only data leakage
      />
    </Layout>
  );
}