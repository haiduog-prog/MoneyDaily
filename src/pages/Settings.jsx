import { useState } from 'react'
import { Trash2, Download, AlertTriangle, LogOut, User } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useAuth } from '../contexts/AuthContext'
import { formatVND, getCurrentYearMonth } from '../utils/format'
import CategoryModal from '../components/Categories/CategoryModal'
import { supabase } from '../lib/supabase'
import './Settings.css'

export default function Settings() {
  const { transactions, categories, getTotalByMonth, deleteCategory } = useStore()
  const { user, signOut } = useAuth()
  const { year, month } = getCurrentYearMonth()
  const [confirmClear, setConfirmClear] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [deletingCat, setDeletingCat] = useState(null)

  const total = getTotalByMonth(year, month)
  const allTotal = transactions.reduce((s, t) => s + t.amount, 0)

  const handleExport = () => {
    const header = 'Ngày,Danh mục,Ghi chú,Số tiền\n'
    const rows = transactions.map((tx) => {
      const cat = categories.find((c) => c.id === tx.category)?.name || tx.category
      return `${tx.date},"${cat}","${tx.note}",${tx.amount}`
    }).join('\n')
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chitieuapp_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await signOut()
  }

  const handleClearData = async () => {
    if (confirmClear) {
      // Delete all user's transactions and budgets from Supabase
      await supabase.from('transactions').delete().eq('user_id', user.id)
      await supabase.from('budgets').delete().eq('user_id', user.id)
      window.location.reload()
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 4000)
    }
  }

  const handleEditCategory = (cat) => {
    setEditingCat(cat)
    setCatModalOpen(true)
  }

  const handleDeleteCategory = async (e, cat) => {
    e.stopPropagation()
    if (deletingCat === cat.id) return
    if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.name}"? Các giao dịch cũ sẽ hiển thị "Không rõ".`)) {
      setDeletingCat(cat.id)
      try {
        await deleteCategory(cat.id)
      } finally {
        setDeletingCat(null)
      }
    }
  }

  return (
    <div className="page-content animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Cài đặt</h1>
        <p className="page-subtitle">Quản lý tài khoản và dữ liệu</p>
      </div>

      {/* User Info */}
      <div className="glass-card settings-section">
        <h2 className="settings-section-title"><User size={16} style={{ display: 'inline', marginRight: 8 }} />Tài khoản</h2>
        <div className="settings-user-info">
          <div className="settings-avatar">
            {user?.user_metadata?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="settings-user-name">
              {user?.user_metadata?.display_name || 'Người dùng'}
            </div>
            <div className="settings-user-email">{user?.email}</div>
          </div>
        </div>
        <button
          id="signout-btn"
          className="btn btn-ghost"
          onClick={handleSignOut}
          disabled={signingOut}
          style={{ color: 'var(--accent-red)', borderColor: 'rgba(255,101,132,0.3)' }}
        >
          {signingOut
            ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            : <LogOut size={16} />
          }
          Đăng xuất
        </button>
      </div>

      {/* Stats Summary */}
      <div className="glass-card settings-section">
        <h2 className="settings-section-title">📊 Tổng quan dữ liệu</h2>
        <div className="settings-stats">
          <div className="settings-stat">
            <div className="settings-stat-val">{transactions.length}</div>
            <div className="settings-stat-label">Tổng giao dịch</div>
          </div>
          <div className="settings-stat">
            <div className="settings-stat-val">{formatVND(allTotal)}</div>
            <div className="settings-stat-label">Tổng đã chi</div>
          </div>
          <div className="settings-stat">
            <div className="settings-stat-val">{formatVND(total)}</div>
            <div className="settings-stat-label">Tháng này</div>
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="glass-card settings-section">
        <h2 className="settings-section-title">💾 Xuất dữ liệu</h2>
        <p className="settings-desc">Tải xuống toàn bộ giao dịch dưới dạng file CSV để mở bằng Excel.</p>
        <button
          id="export-csv-btn"
          className="btn btn-ghost"
          onClick={handleExport}
          disabled={transactions.length === 0}
        >
          <Download size={16} /> Xuất file CSV
        </button>
      </div>

      {/* Categories */}
      <div className="glass-card settings-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="settings-section-title">🏷️ Danh mục chi tiêu</h2>
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setEditingCat(null); setCatModalOpen(true); }}>
            + Thêm mới
          </button>
        </div>
        <div className="cat-preview-grid">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              className="cat-preview-item clickable" 
              style={{ background: `${cat.color}22`, border: `1px solid ${cat.color}55`, cursor: 'pointer', position: 'relative' }}
              onClick={() => handleEditCategory(cat)}
            >
              <span>{cat.icon}</span>
              <span style={{ color: cat.color, fontSize: '12px', fontWeight: 600 }}>{cat.name}</span>
              <button
                className="btn-icon cat-delete-btn"
                onClick={(e) => handleDeleteCategory(e, cat)}
                disabled={deletingCat === cat.id}
                title="Xóa danh mục"
              >
                {deletingCat === cat.id ? (
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: `${cat.color} transparent transparent transparent` }} />
                ) : (
                  <Trash2 size={12} color={cat.color} />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card settings-section danger-zone">
        <h2 className="settings-section-title" style={{ color: 'var(--accent-red)' }}>
          <AlertTriangle size={18} style={{ display: 'inline', marginRight: 6 }} />
          Vùng nguy hiểm
        </h2>
        <p className="settings-desc">Xóa toàn bộ dữ liệu trên cloud. Hành động này không thể hoàn tác!</p>
        <button
          id="clear-data-btn"
          className={`btn ${confirmClear ? 'btn-danger' : 'btn-ghost'}`}
          onClick={handleClearData}
          style={{ borderColor: 'var(--accent-red)' }}
        >
          <Trash2 size={16} />
          {confirmClear ? '⚠️ Xác nhận xóa tất cả?' : 'Xóa tất cả dữ liệu'}
        </button>
      </div>

      {/* About */}
      <div className="glass-card settings-section" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>💸</div>
        <div style={{ fontWeight: 800, fontSize: '20px', marginBottom: '4px' }}>ChiTiêu v2.0</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Ứng dụng quản lý chi tiêu thông minh<br />
          Dữ liệu đồng bộ cloud · Powered by Supabase
        </div>
      </div>

      <CategoryModal
        isOpen={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        editing={editingCat}
      />
    </div>
  )
}
