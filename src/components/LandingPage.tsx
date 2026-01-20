import {
  ArrowRight,
  MessageSquare,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Button } from "./ui/button";

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-[#001F54] text-sm font-semibold mb-6 animate-fade-in">
            <Shield className="w-4 h-4 mr-2" />
            Anonymous & Secure
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-gray-900 leading-tight">
            <span className="block">Your Voice Matters</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#001F54] to-blue-600">
              At PAU
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Speak up anonymously or openly. Shape our campus
            community through honest feedback, constructive
            criticism, and meaningful conversations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              onClick={() => onNavigate("feedback")}
              className="group relative px-8 py-6 text-lg bg-gradient-to-r from-[#001F54] to-blue-600 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
            >
              Give Feedback
              <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </Button>

            <Button
              onClick={() => onNavigate("login")}
              variant="outline"
              className="px-8 py-6 text-lg border-2"
            >
              <MessageSquare className="w-5 h-5 mr-3" />
              Join Discussion
            </Button>
          </div>

          <div className="flex justify-center">
            <div className="flex items-center text-gray-500 animate-bounce">
              <span className="mr-2">Scroll to explore</span>
              <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-7 h-7 text-[#001F54]" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Anonymous & Safe
            </h3>
            <p className="text-gray-600">
              Share your thoughts without fear. Your identity is
              protected when you choose anonymity.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
              <TrendingUp className="w-7 h-7 text-[#001F54]" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Make Real Change
            </h3>
            <p className="text-gray-600">
              Your feedback directly reaches campus authorities
              and leads to tangible improvements.
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <MessageSquare className="w-7 h-7 text-[#001F54]" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Community Driven
            </h3>
            <p className="text-gray-600">
              Join discussions, vote on ideas, and collaborate
              with fellow students to shape PAU.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative bg-gradient-to-r from-[#001F54] to-blue-700 rounded-3xl p-12 text-center text-white overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Make Your Voice Heard?
            </h2>
            <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
              Join thousands of PAU students who are already
              shaping our campus community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => onNavigate("feedback")}
                className="bg-white text-[#001F54] hover:bg-blue-50 px-8 py-6 text-lg shadow-lg hover:shadow-xl"
              >
                Start Sharing Now
              </Button>
              <Button
                onClick={() => onNavigate("about")}
                variant="outline"
                className="border-2 border-white/50 text-[#001F54] hover:bg-white/10 px-8 py-6 text-lg"
              >
                Learn How It Works
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-fade-in {
          animation: fadeIn 1s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}