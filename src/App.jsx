import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useStore } from './store/useStore'
import Sidebar from './components/Layout/Sidebar'
import BottomNav from './components/Layout/BottomNav'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Statistics from './pages/Statistics'
import Budget from './pages/Budget'
import Settings from './pages/Settings'
import AuthPage from './pages/Auth/AuthPage'

// --- Loading screen ---
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
      background: 'var(--bg-base)',
    }}>
      <div style={{ fontSize: '52px', filter: 'drop-shadow(0 0 20px rgba(108,99,255,0.5))' }}>💸</div>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Đang tải...</p>
    </div>
  )
}

// --- Protected layout (requires auth) ---
function AppLayout() {
  const { user, loading } = useAuth()
  const { loadUserData, clearData, migrateFromLocalStorage } = useStore()

  useEffect(() => {
    if (user) {
      // Load data then try migrate local storage
      loadUserData(user.id).then(async () => {
        const migrated = await migrateFromLocalStorage(user.id)
        if (migrated) {
          // Reload after migration
          loadUserData(user.id)
        }
      })
    } else if (!loading) {
      clearData()
    }
  }, [user?.id])

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

// --- Auth route (redirect if already logged in) ---
function AuthRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return <AuthPage />
}

// --- Root App ---
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
