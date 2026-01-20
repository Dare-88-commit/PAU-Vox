import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Shield, Users, TrendingUp, Lock, Bell, BarChart3, MessageSquare, ArrowLeft } from 'lucide-react'

interface AboutPageProps {
  onNavigate: (page: string) => void
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button
          variant="ghost"
          onClick={() => onNavigate('home')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-16 h-16 bg-[#001F54] rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">PV</span>
            </div>
          </div>
          <h1 className="text-5xl font-extrabold mb-4 text-gray-900">
            About PAU Vox
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A comprehensive digital feedback management system designed specifically for
            Pan-Atlantic University to improve communication between students, staff, and administration.
          </p>
        </div>

        {/* Mission */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Our Mission</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600">
            <p className="mb-4">
              PAU Vox aims to replace fragmented feedback methods (WhatsApp, emails, oral reports) with a
              centralized, transparent, and efficient platform that ensures every voice is heard and every
              concern is addressed systematically.
            </p>
            <p>
              We believe in creating a culture of continuous improvement where students feel empowered to
              contribute to campus development while maintaining their privacy and security.
            </p>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Shield className="w-10 h-10 text-[#001F54] mb-2" />
                <CardTitle>Anonymous & Secure</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600">
                Submit feedback anonymously or with your identity. Your data is protected with
                industry-standard encryption and strict access controls.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-10 h-10 text-[#001F54] mb-2" />
                <CardTitle>Role-Based Access</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600">
                Staff members only see feedback relevant to their department. Students track their
                submissions while staff manage resolutions efficiently.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-[#001F54] mb-2" />
                <CardTitle>AI-Powered Prioritization</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600">
                Intelligent algorithms detect urgent issues, group similar feedback, and ensure
                critical concerns receive immediate attention.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Lock className="w-10 h-10 text-[#001F54] mb-2" />
                <CardTitle>Profanity Filter</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600">
                Maintains respectful communication by preventing submissions with inappropriate
                language, fostering constructive dialogue.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Bell className="w-10 h-10 text-[#001F54] mb-2" />
                <CardTitle>Real-Time Updates</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600">
                Stay informed about the status of your feedback with automatic notifications when
                updates occur or resolutions are made.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="w-10 h-10 text-[#001F54] mb-2" />
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="text-gray-600">
                Management gains insights through comprehensive analytics, identifying trends and
                measuring resolution performance across departments.
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feedback Types */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                Academic Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Share concerns about courses, lecturers, assessments, curriculum, and departmental
                administration.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Course content and teaching methodology</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Lecturer performance and availability</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Examination and assessment issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Timetable conflicts and scheduling</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-purple-600" />
                Non-Academic Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Report welfare and campus life issues including accommodation, utilities, and facilities.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Hostel conditions and accommodation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Electricity, water, and air conditioning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Campus cleanliness and sanitation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Cafeteria, library, and sports facilities</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-[#001F54] to-blue-700 text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-6 text-blue-100">
              Join the PAU Vox community and help shape the future of our campus
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => onNavigate('signup')}
                size="lg"
                className="bg-white text-[#001F54] hover:bg-blue-50"
              >
                Create Account
              </Button>
              <Button
                onClick={() => onNavigate('feedback')}
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
              >
                Submit Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
