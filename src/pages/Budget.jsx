import { useState } from 'react'
import { Save, AlertTriangle, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'
import { CATEGORIES } from '../data/categories'
import { formatVND, getCurrentYearMonth } from '../utils/format'
import './Budget.css'

export default function Budget() {
  const { budgets, setBudget, getBudgetUsage } = useStore()
  const { year, month } = getCurrentYearMonth()
  const [editing, setEditing] = useState({})
  const [saved, setSaved] = useState({})

  const usage = getBudgetUsage(year, month)

  const handleChange = (catId, val) => {
    setEditing((e) => ({ ...e, [catId]: val }))
  }

  const handleSave = async (catId) => {
    const rawVal = (editing[catId] || '').toString().replace(/\D/g, '')
    const amount = Number(rawVal)
    if (!isNaN(amount) && amount >= 0) {
      try {
        await setBudget(catId, amount, month, year)
        setSaved((s) => ({ ...s, [catId]: true }))
        setTimeout(() => setSaved((s) => ({ ...s, [catId]: false })), 2000)
      } catch (e) {
        console.error('Budget save error:', e)
      }
      setEditing((e) => { const n = { ...e }; delete n[catId]; return n })
    }
  }

  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0)
  const totalSpent = usage.reduce((s, u) => s + u.spent, 0)
  const overCount = usage.filter((u) => u.isOver).length

  return (
    <div className="page-content animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Ngân sách</h1>
        <p className="page-subtitle">Tháng {month}/{year} · Thiết lập hạn mức chi tiêu</p>
      </div>

      {/* Summary */}
      <div className="budget-summary glass-card">
        <div className="budget-summary-item">
          <div className="budget-summary-label">Tổng ngân sách</div>
          <div className="budget-summary-val" style={{ color: 'var(--primary-light)' }}>{formatVND(totalBudget)}</div>
        </div>
        <div className="budget-summary-divider" />
        <div className="budget-summary-item">
          <div className="budget-summary-label">Đã chi</div>
          <div className="budget-summary-val" style={{ color: 'var(--accent-red)' }}>{formatVND(totalSpent)}</div>
        </div>
        <div className="budget-summary-divider" />
        <div className="budget-summary-item">
          <div className="budget-summary-label">Còn lại</div>
          <div className="budget-summary-val" style={{ color: 'var(--accent-green)' }}>
            {formatVND(Math.max(0, totalBudget - totalSpent))}
          </div>
        </div>
        {overCount > 0 && (
          <>
            <div className="budget-summary-divider" />
            <div className="budget-summary-item">
              <div className="budget-summary-label" style={{ color: 'var(--accent-orange)' }}>
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Vượt mức
              </div>
              <div className="budget-summary-val" style={{ color: 'var(--accent-orange)' }}>
                {overCount} danh mục
              </div>
            </div>
          </>
        )}
      </div>

      {/* Overall Progress */}
      <div className="glass-card budget-overall">
        <div className="budget-overall-header">
          <span>Tổng thể</span>
          <span className="budget-pct">
            {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%
          </span>
        </div>
        <div className="progress-bar-container" style={{ height: '10px' }}>
          <div
            className="progress-bar-fill"
            style={{
              width: `${totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0}%`,
              background: totalSpent > totalBudget
                ? 'var(--accent-red)'
                : totalSpent > totalBudget * 0.8
                ? 'var(--accent-orange)'
                : 'linear-gradient(90deg, var(--primary), var(--accent-green))',
            }}
          />
        </div>
      </div>

      {/* Category Budgets */}
      <div className="budget-list">
        {usage.map((u, idx) => {
          const cat = CATEGORIES.find((c) => c.id === u.category)
          if (!cat) return null
          const currentEdit = editing[cat.id]
          const isSaved = saved[cat.id]
          const progressColor = u.isOver
            ? 'var(--accent-red)'
            : u.percentage >= 80
            ? 'var(--accent-orange)'
            : cat.color

          return (
            <motion.div
              key={cat.id}
              className="budget-card glass-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <div className="budget-card-header">
                <div className="budget-cat-info">
                  <div
                    className="budget-cat-icon"
                    style={{ background: cat.light }}
                  >
                    {cat.icon}
                  </div>
                  <div>
                    <div className="budget-cat-name">{cat.name}</div>
                    <div className="budget-cat-spent">
                      Đã chi: <span style={{ color: cat.color }}>{formatVND(u.spent)}</span>
                    </div>
                  </div>
                </div>

                {u.isOver && (
                  <div className="budget-over-badge">
                    <AlertTriangle size={12} /> Vượt mức
                  </div>
                )}
                {u.percentage >= 80 && !u.isOver && (
                  <div className="budget-warn-badge">Gần hết</div>
                )}
              </div>

              {/* Progress */}
              <div className="budget-progress-row">
                <div className="progress-bar-container">
                  <motion.div
                    className="progress-bar-fill"
                    style={{ background: progressColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${u.percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.04 }}
                  />
                </div>
                <span className="budget-pct-label" style={{ color: progressColor }}>
                  {u.percentage.toFixed(0)}%
                </span>
              </div>

              {/* Budget Edit */}
              <div className="budget-edit-row">
                <span className="budget-edit-label">Hạn mức:</span>
                <div className="budget-input-wrapper">
                  <input
                    id={`budget-input-${cat.id}`}
                    className="budget-input"
                    type="text"
                    inputMode="numeric"
                    value={currentEdit !== undefined
                      ? currentEdit
                      : u.budget > 0 ? u.budget.toLocaleString('vi-VN') : ''}
                    placeholder="Chưa đặt"
                    onChange={(e) => handleChange(cat.id, e.target.value)}
                    onFocus={() => handleChange(cat.id, u.budget > 0 ? u.budget.toString() : '')}
                    onBlur={() => handleSave(cat.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(cat.id) }}
                  />
                  <span className="budget-input-suffix">₫</span>
                </div>
                {isSaved && (
                  <CheckCircle size={16} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
