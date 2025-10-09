import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Mail, Lock, Eye, EyeOff, Apple, User } from 'lucide-react'

const Login = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  const { user, login, register } = useAuth()

  useEffect(() => {
    if (user) {
      window.location.href = '/dashboard'
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = isLogin 
        ? await login(formData.username, formData.password)
        : await register(formData.username, formData.password)

      if (!result.success) {
        setError(result.error)
      } else {
        window.location.href = '/dashboard'
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-50 antialiased">
      {/* Subtle grid + spotlight */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute left-1/2 top-0 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.14),rgba(255,255,255,0)_70%)]" />
      </div>

      {/* Center */}
      <div className="relative flex min-h-screen items-center justify-center px-6 md:px-8">
        <div className="w-full max-w-[560px] md:max-w-[640px]" style={{ animation: 'slideUp 0.6s ease-out' }}>
          {/* Brand */}
          <div className="mb-8 flex items-center justify-center gap-2 text-neutral-300">
            <User className="h-5 w-5" />
            <span className="text-sm tracking-wide">Apartment Dashboard</span>
          </div>

          {/* Card */}
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-10 md:p-12 shadow-[0_10px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            {/* Light sheen */}
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/10 [mask-image:linear-gradient(to_bottom,white,transparent_60%)]" />

            <div className="relative">
              <h1 className="text-center text-4xl md:text-5xl font-semibold tracking-tight">
                {isLogin ? 'Sign in' : 'Create account'}
              </h1>
              <p className="mt-4 text-center text-base md:text-lg text-neutral-400">
                {isLogin ? 'Welcome back to your organized home' : 'Join your roommates and start organizing'}
              </p>

              <form onSubmit={handleSubmit} className="mt-10 md:mt-12 space-y-6 md:space-y-7">
                {/* Username */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-300">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Enter your username"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 py-4 text-base text-neutral-50 outline-none transition placeholder:text-neutral-500 focus:border-white/20 focus:ring-2 focus:ring-white/10"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-300">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-12 py-4 text-base text-neutral-50 outline-none transition placeholder:text-neutral-500 focus:border-white/20 focus:ring-2 focus:ring-white/10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 transition hover:text-neutral-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 backdrop-blur">
                    <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-white py-4 text-neutral-900 text-base font-semibold transition hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-neutral-900/30 border-t-neutral-900 rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <span>{isLogin ? 'Sign in' : 'Create account'}</span>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-sm text-neutral-400">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Toggle Button */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-neutral-400 hover:text-neutral-100 transition-colors text-sm underline-offset-4 hover:underline"
                  >
                    {isLogin ? (
                      <>
                        New here? <span className="text-neutral-100">Create an account</span>
                      </>
                    ) : (
                      <>
                        Already have an account? <span className="text-neutral-100">Sign in</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              <p className="mt-8 text-center text-xs text-neutral-400">
                By continuing, you agree to our Terms and Privacy Policy.
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-neutral-400">
            Apartment Dashboard — Keep your home organized ✨
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login