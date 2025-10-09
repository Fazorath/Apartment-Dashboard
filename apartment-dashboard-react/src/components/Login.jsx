import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Eye, EyeOff, User } from 'lucide-react'

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
    <div className="min-h-screen text-[#EDEEF2] antialiased relative overflow-hidden">
      {/* Dynamic Background - Warm Glow Animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-orange-800/15 to-blue-900/25 animate-gradient-shift"></div>
      
      {/* Abstract Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.1)_0%,transparent_50%)] animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08)_0%,transparent_50%)] animate-pulse-slower"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(255,255,255,0.05)_0%,transparent_50%)] animate-pulse-slowest"></div>
      </div>
      
      {/* Subtle Geometric Patterns */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 border border-white/10 rounded-full animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-32 h-32 border border-white/8 rounded-full animate-float-delayed"></div>
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 border border-white/6 rounded-full animate-float-slow"></div>
      </div>

      {/* Main content */}
      <main className="relative z-10 flex min-h-screen items-center justify-center p-6 md:translate-y-[-6vh]">
        <div className="w-full max-w-[420px] md:translate-x-[-8%]">

          {/* Glassmorphism Card */}
          <section 
            className="login-card relative rounded-3xl bg-white/[0.08] backdrop-blur-2xl 
                       shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]
                       border border-white/10"
          >
            {/* Main Content Container with Consistent Vertical Rhythm */}
            <div className="flex flex-col gap-5">
              <h1 className="text-[30px] sm:text-[32px] font-semibold tracking-tight leading-[1.1] text-center">
                {isLogin ? 'Roommate Dash' : 'Create Your Account'}
              </h1>
              <p className="text-[14px] text-neutral-400 leading-[1.45] text-center">
                {isLogin ? "Let's keep your chores in check." : 'Organize tasks, live better together.'}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Username - Floating Label */}
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder=" "
                  autoComplete="username"
                  className="peer w-full h-14 rounded-2xl bg-white/[0.06] border border-white/10 px-10 pt-6 pb-2 outline-none
                           text-[15px] text-white transition-all duration-200 ease-out
                           focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20
                           placeholder-shown:pt-4"
                  required
                />
                <label className="absolute left-10 top-2 text-xs font-medium text-neutral-400 transition-all duration-200 ease-out
                                peer-focus:top-2 peer-focus:text-xs peer-focus:text-emerald-400
                                peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500
                                pointer-events-none select-none">
                  Username
                </label>
              </div>

              {/* Password - Floating Label */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder=" "
                  autoComplete="current-password"
                  className="peer w-full h-14 rounded-2xl bg-white/[0.06] border border-white/10 px-10 pt-6 pb-2 pr-12 outline-none
                           text-[15px] text-white transition-all duration-200 ease-out
                           focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20
                           placeholder-shown:pt-4"
                  required
                />
                <label className="absolute left-10 top-2 text-xs font-medium text-neutral-400 transition-all duration-200 ease-out
                                peer-focus:top-2 peer-focus:text-xs peer-focus:text-emerald-400
                                peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-neutral-500
                                pointer-events-none select-none">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-3 my-auto h-8 w-8 rounded-lg text-neutral-400 hover:text-emerald-400
                           hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition-all duration-200 ease-out"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-[#FF5C5C]/60 bg-[#FF5C5C]/10 p-3 backdrop-blur">
                  <div className="w-4 h-4 rounded-full bg-[#FF5C5C] flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <p className="text-[#FF7A7A] text-sm">{error}</p>
                </div>
              )}

                {/* Remember me & Forgot password - Grouped Container */}
                <div className="flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      className="h-4 w-4 rounded border-white/20 bg-white/5 focus:ring-2 focus:ring-emerald-400/20" 
                    />
                    <span className="text-neutral-400">Remember me</span>
                  </label>
                  <a href="#" className="text-neutral-300 hover:text-emerald-400 underline underline-offset-4 transition-colors duration-200">
                    Forgot password?
                  </a>
                </div>

                {/* Enhanced CTA Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold tracking-tight
                           shadow-lg hover:shadow-xl hover:from-emerald-400 hover:to-teal-400 
                           active:transform active:scale-[0.98] active:translate-y-[1px]
                           focus:outline-none focus:ring-4 focus:ring-emerald-400/30
                           disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
                           relative overflow-hidden transition-all duration-200 ease-out
                           before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0
                           before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
                >
                  <span className={`relative z-10 ${loading ? "translate-x-[-6px]" : ""}`}>
                    {isLogin ? 'Sign in' : 'Create account'}
                  </span>
                  {loading && (
                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin z-10" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" opacity=".25" />
                      <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" />
                    </svg>
                  )}
                </button>
              </form>

              {/* Separator */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

              {/* Secondary Action - Separated from main form */}
              <p className="text-center text-sm text-neutral-400">
                {isLogin ? (
                  <>
                    New here? <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors duration-200 font-medium"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account? <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 transition-colors duration-200 font-medium"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>

              {/* Legal microcopy - Secondary information */}
              <p className="text-center text-[11px] leading-4 text-neutral-500 opacity-70">
                By continuing, you agree to our{' '}
                <a href="#" className="underline hover:text-neutral-300 transition-colors duration-200">Terms</a>
                {' '}and{' '}
                <a href="#" className="underline hover:text-neutral-300 transition-colors duration-200">Privacy Policy</a>.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Login