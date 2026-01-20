import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'
import {
  HelpCircle,
  Search,
  MessageCircle,
  Mail,
  Phone,
  Book,
  Video,
  FileText,
  Users,
  Shield,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface HelpPageProps {
  onNavigate: (page: string) => void
}

export function HelpPage({ onNavigate }: HelpPageProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          q: 'How do I submit feedback?',
          a: 'Click on "Submit Feedback" in the navigation menu, choose between Academic or Non-Academic feedback, fill in the required information, and click submit. You can choose to submit anonymously for privacy.'
        },
        {
          q: 'What types of feedback can I submit?',
          a: 'You can submit two types of feedback: Academic (related to courses, lecturers, assessments) and Non-Academic (related to facilities, hostels, services). Each type has specific categories to help route your feedback properly.'
        },
        {
          q: 'Is my feedback anonymous?',
          a: 'Yes, you can choose to submit feedback anonymously. When you toggle the anonymous option, your identity will be completely hidden from staff members reviewing the feedback.'
        }
      ]
    },
    {
      category: 'Account & Privacy',
      questions: [
        {
          q: 'Who can see my feedback?',
          a: 'Only relevant staff members can see your feedback. Academic feedback goes to lecturers and department heads, while non-academic feedback goes to facilities management or student affairs. Anonymous feedback hides your identity completely.'
        },
        {
          q: 'Can I edit or delete my feedback?',
          a: 'Currently, you cannot edit submitted feedback, but you can track its status. For urgent changes, please contact support. Future updates will include edit functionality for pending feedback.'
        },
        {
          q: 'How is my data protected?',
          a: 'All data is encrypted and stored securely. We never share your information with third parties. Staff can only see feedback relevant to their department, and anonymous submissions are completely private.'
        }
      ]
    },
    {
      category: 'Feedback Process',
      questions: [
        {
          q: 'How long does it take to get a response?',
          a: 'The average response time is 1-3 business days. Urgent issues are prioritized and typically addressed within 24 hours. You\'ll receive notifications when your feedback status changes.'
        },
        {
          q: 'What are feedback statuses?',
          a: 'Feedback goes through several stages: Pending (awaiting review), In Review (being evaluated), Assigned (sent to relevant staff), Working (being addressed), Resolved (issue fixed), or Rejected (cannot be addressed with explanation).'
        },
        {
          q: 'How is priority determined?',
          a: 'Priority is automatically detected based on keywords in your description. Words like "urgent," "emergency," or "broken" trigger higher priority. You can also manually indicate urgency in your submission.'
        }
      ]
    },
    {
      category: 'Technical Support',
      questions: [
        {
          q: 'I\'m having trouble logging in',
          a: 'Ensure you\'re using your @pau.edu.ng email address. If you forgot your password, use the "Forgot Password" link. If issues persist, contact ICT support at ict@pau.edu.ng.'
        },
        {
          q: 'Why was my feedback blocked?',
          a: 'Our AI profanity filter blocks inappropriate language to maintain a respectful environment. Please revise your feedback using constructive language and resubmit.'
        },
        {
          q: 'Can I access PAU Vox on mobile?',
          a: 'Yes! PAU Vox is fully responsive and works on all devices. Simply access it through your mobile browser for the best experience.'
        }
      ]
    }
  ]

  const filteredFaqs = faqs
    .map(category => ({
      ...category,
      questions: category.questions.filter(
        item =>
          item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter(category => category.questions.length > 0)

  const contactMethods = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email Support',
      description: 'feedback@pau.edu.ng',
      subtitle: 'Response within 24 hours',
      color: 'blue'
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: 'Phone Support',
      description: '+234 (0) 1234 5678',
      subtitle: 'Mon-Fri, 9AM-5PM',
      color: 'green'
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: 'Live Chat',
      description: 'Chat with support',
      subtitle: 'Available 24/7',
      color: 'purple'
    }
  ]

  const resources = [
    {
      icon: <Book className="w-6 h-6" />,
      title: 'User Guide',
      description: 'Complete guide to using PAU Vox',
      link: '#'
    },
    {
      icon: <Video className="w-6 h-6" />,
      title: 'Video Tutorials',
      description: 'Learn with step-by-step videos',
      link: '#'
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Documentation',
      description: 'Technical documentation and API',
      link: '#'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Community Forum',
      description: 'Connect with other users',
      link: '#'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#001F54] to-cyan-400 rounded-2xl mb-4">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            How can we help you?
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Find answers to common questions or get in touch with our support team
          </p>
        </div>

        {/* Search */}
        <Card className="mb-12 border-2 shadow-lg">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <Shield className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Privacy & Security</CardTitle>
              <CardDescription>Learn how we protect your data</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <FileText className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">Submission Guidelines</CardTitle>
              <CardDescription>How to write effective feedback</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <AlertCircle className="w-8 h-8 text-purple-600 mb-2" />
              <CardTitle className="text-lg">Report an Issue</CardTitle>
              <CardDescription>Technical problems or bugs</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* FAQs */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
            <CardDescription>
              {searchQuery
                ? `Showing results for "${searchQuery}"`
                : 'Browse common questions by category'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No results found for "{searchQuery}". Try different keywords.
                </p>
              </div>
            ) : (
              filteredFaqs.map((category, idx) => (
                <div key={idx} className="mb-8 last:mb-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <div className="w-2 h-2 bg-[#001F54] rounded-full mr-3"></div>
                    {category.category}
                  </h3>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, qIdx) => (
                      <AccordionItem key={qIdx} value={`${idx}-${qIdx}`}>
                        <AccordionTrigger className="text-left hover:text-[#001F54]">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600 dark:text-gray-400">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Contact Support</CardTitle>
            <CardDescription>Choose your preferred way to reach us</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {contactMethods.map((method, idx) => (
                <div
                  key={idx}
                  className={`p-6 rounded-xl border-2 hover:shadow-md transition-shadow bg-${method.color}-50 dark:bg-${method.color}-900/20 border-${method.color}-200 dark:border-${method.color}-800`}
                >
                  <div
                    className={`w-12 h-12 bg-${method.color}-100 dark:bg-${method.color}-900/50 rounded-lg flex items-center justify-center mb-4 text-${method.color}-600`}
                  >
                    {method.icon}
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {method.title}
                  </h4>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {method.description}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{method.subtitle}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Helpful Resources</CardTitle>
            <CardDescription>Guides and documentation to help you get the most out of PAU Vox</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {resources.map((resource, idx) => (
                <a
                  key={idx}
                  href={resource.link}
                  className="flex items-start space-x-4 p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-400">
                    {resource.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {resource.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {resource.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Still Need Help */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-to-br from-[#001F54] to-blue-800 text-white border-0">
            <CardContent className="pt-8 pb-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Still need help?</h3>
              <p className="text-blue-100 mb-6">
                Our support team is always ready to assist you
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-[#001F54] hover:bg-gray-100"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Start a Conversation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
