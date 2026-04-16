import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import './AuthPage.css'

export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'forgot'
  const [form, setForm] = useState({ email: '', password: '', displayName: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn({ email: form.email, password: form.password })
        if (error) throw error

      } else if (mode === 'register') {
        if (form.password !== form.confirmPassword) throw new Error('Mật khẩu xác nhận không khớp')
        if (form.password.length < 6) throw new Error('Mật khẩu phải ít nhất 6 ký tự')
        if (!form.displayName.trim()) throw new Error('Vui lòng nhập tên hiển thị')
        const { error } = await signUp({ email: form.email, password: form.password, displayName: form.displayName })
        if (error) throw error
        setSuccess('Đăng ký thành công! Kiểm tra email để xác nhận tài khoản nhé.')
        setMode('login')

      } else if (mode === 'forgot') {
        const { error } = await resetPassword(form.email)
        if (error) throw error
        setSuccess('Đã gửi link đặt lại mật khẩu vào email của bạn!')
      }
    } catch (err) {
      const msg = err.message
      if (msg.includes('Invalid login credentials')) setError('Email hoặc mật khẩu không đúng')
      else if (msg.includes('User already registered')) setError('Email này đã được đăng ký')
      else if (msg.includes('Email not confirmed')) setError('Vui lòng xác nhận email trước khi đăng nhập')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Background */}
      <div className="auth-bg">
        <div className="auth-bg-blob auth-bg-blob-1" />
        <div className="auth-bg-blob auth-bg-blob-2" />
      </div>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">💸</div>
          <div className="auth-logo-title">ChiTiêu</div>
          <div className="auth-logo-sub">Quản lý chi tiêu thông minh</div>
        </div>

        {/* Tabs */}
        {mode !== 'forgot' && (
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              id="tab-login"
            >
              <LogIn size={15} /> Đăng nhập
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); setSuccess('') }}
              id="tab-register"
            >
              <UserPlus size={15} /> Đăng ký
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Forgot password header */}
          {mode === 'forgot' && (
            <div className="auth-forgot-header">
              <h2>🔑 Quên mật khẩu</h2>
              <p>Nhập email và chúng tôi sẽ gửi link đặt lại mật khẩu</p>
            </div>
          )}

          {/* Display Name (register only) */}
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Tên hiển thị</label>
              <input
                id="input-displayname"
                className="form-input"
                type="text"
                placeholder="Nguyen Van A"
                value={form.displayName}
                onChange={update('displayName')}
                required
              />
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="input-email"
                className="form-input auth-input"
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={update('email')}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          {mode !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="input-password"
                  className="form-input auth-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update('password')}
                  required
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="auth-toggle-pw"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password (register only) */}
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="input-confirm-password"
                  className="form-input auth-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={update('confirmPassword')}
                  required
                />
              </div>
            </div>
          )}

          {/* Forgot link */}
          {mode === 'login' && (
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
            >
              Quên mật khẩu?
            </button>
          )}

          {/* Error / Success Messages */}
          {error && (
            <motion.div
              className="auth-message auth-error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ⚠️ {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              className="auth-message auth-success"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ✅ {success}
            </motion.div>
          )}

          {/* Submit */}
          <button
            id="btn-auth-submit"
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            ) : mode === 'login' ? (
              <><LogIn size={16} /> Đăng nhập</>
            ) : mode === 'register' ? (
              <><UserPlus size={16} /> Tạo tài khoản</>
            ) : (
              <><Mail size={16} /> Gửi email đặt lại</>
            )}
          </button>

          {/* Back to login (forgot mode) */}
          {mode === 'forgot' && (
            <button
              type="button"
              className="btn btn-ghost auth-submit-btn"
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
            >
              ← Quay lại đăng nhập
            </button>
          )}
        </form>
      </motion.div>
    </div>
  )
}
