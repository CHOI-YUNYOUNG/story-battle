'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('이메일을 확인해주세요! 인증 링크가 전송되었습니다.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setMessage(error.message)
    setLoading(false)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="card-dark p-8 rounded-2xl">
        <h2 className="text-2xl font-serif text-gold text-center mb-6">
          {isSignUp ? '계정 만들기' : '로그인'}
        </h2>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-gray-800 font-medium hover:bg-gray-100 transition-all mb-6 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 계속하기
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-navy-600" />
          <span className="text-gray-500 text-sm">또는</span>
          <div className="flex-1 h-px bg-navy-600" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="이메일"
            required
            className="input-dark w-full"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            className="input-dark w-full"
          />
          <button type="submit" disabled={loading} className="btn-gold w-full py-3 disabled:opacity-50">
            {loading ? '처리 중...' : isSignUp ? '가입하기' : '로그인'}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-blue-300">{message}</p>
        )}

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gold transition-colors"
        >
          {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 가입하기'}
        </button>
      </div>
    </div>
  )
}
