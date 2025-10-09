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
    <div className="min-h-screen bg-[#0B0B0C] text-[#EDEEF2] antialiased relative">
      {/* Vignette background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_35%_at_50%_35%,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_60%)]"></div>
      
      {/* Optional grain texture */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'><rect width='4' height='4' fill='%23000'/><circle cx='0.5' cy='0.5' r='0.5' fill='%23fff' opacity='0.3'/></svg>")`
        }}
      ></div>

      {/* Main content */}
      <main className="relative z-10 flex min-h-screen items-center justify-center p-6 md:translate-y-[-6vh]">
        <div className="w-full max-w-[420px]">
          {/* Brand */}
          <div className="mb-3 flex items-center gap-2 text-sm text-neutral-300">
            <User className="h-4 w-4 opacity-90" />
            <span>Apartment Dashboard</span>
          </div>

          {/* Card */}
          <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 sm:p-9 md:p-10 shadow-[0_10px_30px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.05)]">
            <h1 className="text-[30px] sm:text-[32px] font-semibold tracking-tight leading-[1.1]">
              {isLogin ? 'Sign in' : 'Create account'}
            </h1>
            <p className="mt-1 text-[13.5px] text-neutral-400 leading-[1.45]">
              {isLogin ? 'Welcome back to your organized home.' : 'Join your roommates and start organizing.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Username */}
              <label className="block text-sm font-medium text-neutral-300">Username</label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 outline-none
                           placeholder:text-neutral-600 text-[15px] transition-all duration-120 ease-out
                           focus:border-white/20 focus:bg-white/10 focus:ring-4 focus:ring-sky-400/20"
                  required
                />
              </div>

              {/* Password */}
              <label className="block text-sm font-medium text-neutral-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 pr-12 outline-none
                           placeholder:text-neutral-600 text-[15px] transition-all duration-120 ease-out
                           focus:border-white/20 focus:bg-white/10 focus:ring-4 focus:ring-sky-400/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-2 my-auto h-9 w-9 rounded-lg text-neutral-400 hover:text-neutral-200
                           hover:bg-white/5 focus:outline-none focus:ring-4 focus:ring-sky-400/20 transition-all duration-160 ease-out"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between pt-1 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-white/20 bg-white/5 focus:ring-2 focus:ring-sky-400/20" 
                  />
                  <span className="text-neutral-400">Remember me</span>
                </label>
                <a href="#" className="text-neutral-300 hover:text-white underline underline-offset-4 transition-colors duration-160 pr-4">
                  Forgot password?
                </a>
              </div>

              {/* CTA Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full h-12 rounded-full bg-white text-black font-semibold tracking-tight
                         shadow hover:bg-neutral-100 active:bg-neutral-200 active:transform active:translate-y-[1px]
                         focus:outline-none focus:ring-4 focus:ring-sky-400/20
                         disabled:opacity-60 disabled:cursor-not-allowed relative
                         transition-all duration-160 ease-out"
              >
                <span className={loading ? "translate-x-[-6px]" : ""}>
                  {isLogin ? 'Sign in' : 'Create account'}
                </span>
                {loading && (
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" opacity=".25" />
                    <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" />
                  </svg>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            {/* Toggle Button */}
            <p className="text-center text-sm text-neutral-400">
              {isLogin ? (
                <>
                  New here? <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-neutral-200 hover:text-white underline underline-offset-4 transition-colors duration-160"
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account? <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-neutral-200 hover:text-white underline underline-offset-4 transition-colors duration-160"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

            {/* Legal microcopy */}
            <p className="mt-3 text-center text-[12px] leading-5 text-neutral-500">
              By continuing, you agree to our{' '}
              <a href="#" className="underline hover:text-neutral-300 transition-colors duration-160">Terms</a>
              {' '}and{' '}
              <a href="#" className="underline hover:text-neutral-300 transition-colors duration-160">Privacy Policy</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

export default Login