import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp'
import { Loader2, Mail } from 'lucide-react'

interface VerifyEmailPageProps {
  onNavigate: (page: string) => void
}

export function VerifyEmailPage({ onNavigate }: VerifyEmailPageProps) {
  const { verifyEmail, resendVerificationCode, user, loading } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)

  const handleVerify = async () => {
    setError('')
    
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    try {
      await verifyEmail(code)
      setSuccess(true)
      setTimeout(() => {
        onNavigate('dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Invalid verification code')
    }
  }

  const handleResend = async () => {
    setError('')
    setResending(true)
    try {
      await resendVerificationCode()
    } catch (err: any) {
      setError(err.message || 'Failed to resend code')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#001F54]" />
              </div>
            </div>
            <CardTitle className="text-2xl">Verify Your Email</CardTitle>
            <CardDescription>
              We've sent a 6-digit verification code to<br />
              <span className="font-medium text-foreground">{user?.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <AlertDescription>
                  Email verified successfully! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleVerify}
              className="w-full bg-[#001F54]"
              disabled={loading || code.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Didn't receive the code? </span>
              <button
                type="button"
                className="text-[#001F54] hover:underline font-medium"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Resending...' : 'Resend'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
