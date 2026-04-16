import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { CATEGORIES } from '../../data/categories'
import { getTodayStr, formatVND } from '../../utils/format'
import './TransactionModal.css'

export default function TransactionModal({ isOpen, onClose, editing = null }) {
  const { addTransaction, updateTransaction } = useStore()
  const [form, setForm] = useState({
    amount: '',
    category: 'food',
    note: '',
    date: getTodayStr(),
  })
  const [amountDisplay, setAmountDisplay] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (editing) {
      setForm({
        amount: editing.amount,
        category: editing.category,
        note: editing.note,
        date: editing.date,
      })
      setAmountDisplay(editing.amount.toLocaleString('vi-VN'))
    } else {
      setForm({ amount: '', category: 'food', note: '', date: getTodayStr() })
      setAmountDisplay('')
    }
    setErrors({})
    setSubmitError('')
  }, [editing, isOpen])

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    setAmountDisplay(raw ? Number(raw).toLocaleString('vi-VN') : '')
    setForm((f) => ({ ...f, amount: raw }))
  }

  const validate = () => {
    const errs = {}
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Nhập số tiền hợp lệ'
    if (!form.date) errs.date = 'Chọn ngày'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSubmitting(true)
    setSubmitError('')
    try {
      if (editing) {
        await updateTransaction(editing.id, form)
      } else {
        await addTransaction(form)
      }
      onClose()
    } catch (err) {
      setSubmitError(err.message || 'Có lỗi xảy ra, thử lại nhé')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            className="modal"
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 400 }}
          >
            {/* Header */}
            <div className="modal-header">
              <h3 className="modal-title">
                {editing ? '✏️ Sửa giao dịch' : '➕ Thêm chi tiêu'}
              </h3>
              <button className="btn-icon" onClick={onClose} id="modal-close-btn">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              {/* Amount */}
              <div className="form-group">
                <label className="form-label">Số tiền (VNĐ)</label>
                <div className={`amount-input-wrapper ${errors.amount ? 'error' : ''}`}>
                  <span className="amount-currency">₫</span>
                  <input
                    id="amount-input"
                    className="amount-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amountDisplay}
                    onChange={handleAmountChange}
                    autoFocus
                  />
                </div>
                {errors.amount && <span className="form-error">{errors.amount}</span>}
                {form.amount && Number(form.amount) > 0 && (
                  <span className="amount-preview">{formatVND(Number(form.amount))}</span>
                )}
              </div>

              {/* Category Grid */}
              <div className="form-group">
                <label className="form-label">Danh mục</label>
                <div className="category-grid">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      id={`cat-${cat.id}`}
                      className={`category-chip ${form.category === cat.id ? 'selected' : ''}`}
                      style={form.category === cat.id ? {
                        background: cat.light,
                        borderColor: cat.color,
                        color: cat.color,
                      } : {}}
                      onClick={() => setForm((f) => ({ ...f, category: cat.id }))}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                      {form.category === cat.id && <Check size={10} style={{ marginLeft: 'auto' }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <input
                  id="note-input"
                  className="form-input"
                  type="text"
                  placeholder="Mô tả chi tiêu..."
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  maxLength={100}
                />
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Ngày</label>
                <input
                  id="date-input"
                  className={`form-input form-select ${errors.date ? 'error' : ''}`}
                  type="date"
                  value={form.date}
                  max={getTodayStr()}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
                {errors.date && <span className="form-error">{errors.date}</span>}
              </div>

              {/* Submit error */}
              {submitError && (
                <div className="form-error" style={{ padding: '8px 12px', background: 'var(--accent-red-light)', borderRadius: '8px' }}>
                  ⚠️ {submitError}
                </div>
              )}

              {/* Submit */}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                  Hủy
                </button>
                <button type="submit" id="submit-transaction-btn" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    : <><Check size={16} /> {editing ? 'Lưu thay đổi' : 'Thêm ngay'}</>
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
