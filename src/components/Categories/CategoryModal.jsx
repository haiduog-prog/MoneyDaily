import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import './CategoryModal.css'

const ICON_OPTIONS = [
  '🍜','🍔','🍕','🥗','☕','🚗','🚌','⛽','🛍️','👗',
  '🎮','🎬','🎵','🎤','💊','🏥','🏠','💡','📱','📚',
  '💄','✂️','💪','🏋️','✈️','🏖️','🎁','👶','🐾','📦',
  '💰','💳','🧾','🔧','🎂','🍺','🥤','🎓','👔','💻',
]

const COLOR_OPTIONS = [
  '#FF9F43', '#54A0FF', '#FF6584', '#A29BFE', '#10D9A0',
  '#00CEC9', '#FDCB6E', '#FD79A8', '#9B9BC8', '#E17055',
  '#6C5CE7', '#00B894', '#FFEAA7', '#74B9FF', '#DFE6E9',
  '#FF7675', '#636E72', '#2D3436', '#0984E3', '#E84393',
]

export default function CategoryModal({ isOpen, onClose, editing = null }) {
  const { addCategory, updateCategory } = useStore()
  const [form, setForm] = useState({ name: '', icon: '📦', color: '#9B9BC8' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, icon: editing.icon, color: editing.color })
    } else {
      setForm({ name: '', icon: '📦', color: '#9B9BC8' })
    }
    setError('')
  }, [editing, isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nhập tên danh mục'); return }
    setSubmitting(true)
    setError('')
    try {
      if (editing) {
        await updateCategory(editing.id, form)
      } else {
        await addCategory(form)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="modal cat-modal"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 400 }}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {editing ? '✏️ Sửa danh mục' : '🏷️ Thêm danh mục'}
              </h3>
              <button className="btn-icon" onClick={onClose}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              {/* Preview */}
              <div className="cat-preview-card">
                <div
                  className="cat-preview-icon"
                  style={{ background: `${form.color}22`, border: `2px solid ${form.color}` }}
                >
                  {form.icon}
                </div>
                <div className="cat-preview-name" style={{ color: form.color }}>
                  {form.name || 'Tên danh mục'}
                </div>
              </div>

              {/* Name */}
              <div className="form-group">
                <label className="form-label">Tên danh mục</label>
                <input
                  id="cat-name-input"
                  className="form-input"
                  type="text"
                  placeholder="Ví dụ: Ăn vặt, Xăng xe..."
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={30}
                  autoFocus
                />
              </div>

              {/* Icon Picker */}
              <div className="form-group">
                <label className="form-label">Biểu tượng</label>
                <div className="icon-picker-grid">
                  {ICON_OPTIONS.map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      className={`icon-picker-item ${form.icon === ico ? 'selected' : ''}`}
                      style={form.icon === ico ? { borderColor: form.color, background: `${form.color}22` } : {}}
                      onClick={() => setForm((f) => ({ ...f, icon: ico }))}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div className="form-group">
                <label className="form-label">Màu sắc</label>
                <div className="color-picker-grid">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-picker-item ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                    >
                      {form.color === c && <Check size={12} color="white" />}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="form-error" style={{ padding: '8px 12px', background: 'var(--accent-red-light)', borderRadius: '8px' }}>
                  ⚠️ {error}
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    : <><Check size={16} /> {editing ? 'Lưu' : 'Thêm'}</>
                  }
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
