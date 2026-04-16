import { useState, useEffect } from 'react'
import { Plus, TrendingDown, Calendar, Flame } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useStore } from '../store/useStore'
import {
  formatVND, formatVNDShort, formatDateShort, getCurrentYearMonth, friendlyDate
} from '../utils/format'
import TransactionModal from '../components/Transactions/TransactionModal'
import TransactionItem from '../components/Transactions/TransactionItem'
import './Dashboard.css'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: 'easeOut' },
})

// Custom Tooltip for chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="chart-tooltip">
        <div className="chart-tooltip-label">{label}</div>
        <div className="chart-tooltip-value">{formatVND(payload[0].value)}</div>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const { getTransactionsByMonth, getTotalByMonth,
    getCategoryTotals, getLast7DaysTotals, loading, categories } = useStore()
  const { year, month } = getCurrentYearMonth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)

  const transactions = getTransactionsByMonth(year, month)
  const total = getTotalByMonth(year, month)
  const categoryTotals = getCategoryTotals(year, month)
  const last7Days = getLast7DaysTotals()
  const recentTxs = transactions.slice(0, 5)

  // Top categories
  const topCategories = categories
    .map((cat) => ({ ...cat, amount: categoryTotals[cat.id] || 0 }))
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4)

  const chartData = last7Days.map((d) => ({
    date: formatDateShort(d.date),
    total: d.total,
  }))

  const todayTotal = last7Days.find(
    (d) => d.date === new Date().toISOString().split('T')[0]
  )?.total || 0

  const openEdit = (tx) => { setEditingTx(tx); setModalOpen(true) }
  const handleCloseModal = () => { setModalOpen(false); setEditingTx(null) }

  return (
    <div className="page-content dashboard animate-fadeIn">
      {/* Page Header */}
      <motion.div className="dashboard-header" {...fadeUp(0)}>
        <div>
          <h1 className="page-title">Tổng quan</h1>
          <p className="page-subtitle">
            {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date())}
          </p>
        </div>
        <button
          id="add-transaction-btn"
          className="btn btn-primary"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={18} /> Thêm chi tiêu
        </button>
      </motion.div>

      {/* Stats Row */}
      <motion.div className="stats-grid" {...fadeUp(0.05)}>
        {/* Monthly total */}
        <div className="stat-card glass-card stat-main">
          <div className="stat-label">
            <Calendar size={14} /> Chi tiêu tháng này
          </div>
          <div className="stat-amount">{formatVND(total)}</div>
          <div className="stat-count">{transactions.length} giao dịch</div>
          <div className="stat-bg-icon">💸</div>
        </div>

        {/* Today */}
        <div className="stat-card glass-card stat-today">
          <div className="stat-label">
            <Flame size={14} /> Hôm nay
          </div>
          <div className="stat-amount">{formatVND(todayTotal)}</div>
          <div className="stat-count">
            {last7Days.filter((d) => d.date === new Date().toISOString().split('T')[0]).length > 0
              ? `${transactions.filter((t) => t.date === new Date().toISOString().split('T')[0]).length} giao dịch`
              : 'Chưa có giao dịch'}
          </div>
          <div className="stat-bg-icon">🔥</div>
        </div>

        {/* Average */}
        <div className="stat-card glass-card stat-avg">
          <div className="stat-label">
            <TrendingDown size={14} /> TB / ngày
          </div>
          <div className="stat-amount">
            {formatVND(transactions.length > 0 ? Math.round(total / new Date().getDate()) : 0)}
          </div>
          <div className="stat-count">Tháng {month}/{year}</div>
          <div className="stat-bg-icon">📊</div>
        </div>
      </motion.div>

      {/* Chart + Top Categories */}
      <div className="dashboard-grid">
        {/* 7-day chart */}
        <motion.div className="glass-card chart-card" {...fadeUp(0.1)}>
          <div className="card-header">
            <h2 className="card-title">Chi tiêu 7 ngày qua</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#5C5C8A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5C5C8A', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatVNDShort} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6C63FF"
                strokeWidth={2.5}
                fill="url(#areaGrad)"
                activeDot={{ r: 5, fill: '#6C63FF', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Categories */}
        <motion.div className="glass-card top-cats-card" {...fadeUp(0.15)}>
          <div className="card-header">
            <h2 className="card-title">Danh mục hàng đầu</h2>
          </div>
          {topCategories.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px' }}>
              <div className="empty-state-icon" style={{ fontSize: '32px' }}>📭</div>
              <p className="empty-state-title" style={{ fontSize: '14px' }}>Chưa có dữ liệu</p>
            </div>
          ) : (
            <div className="top-cats-list">
              {topCategories.map((cat, i) => {
                const pct = total > 0 ? (cat.amount / total) * 100 : 0
                return (
                  <div key={cat.id} className="top-cat-item">
                    <div className="top-cat-rank" style={{ color: cat.color }}>{i + 1}</div>
                    <div className="top-cat-icon" style={{ background: `${cat.color}22` }}>{cat.icon}</div>
                    <div className="top-cat-info">
                      <div className="top-cat-name">{cat.name}</div>
                      <div className="progress-bar-container" style={{ marginTop: '4px' }}>
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${pct}%`, background: cat.color }}
                        />
                      </div>
                    </div>
                    <div className="top-cat-amount" style={{ color: cat.color }}>
                      {formatVNDShort(cat.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div className="glass-card recent-card" {...fadeUp(0.2)}>
        <div className="card-header">
          <h2 className="card-title">Gần đây</h2>
          <a href="/transactions" className="card-link">Xem tất cả →</a>
        </div>
        {recentTxs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧾</div>
            <p className="empty-state-title">Chưa có giao dịch nào</p>
            <p className="empty-state-desc">Nhấn "Thêm chi tiêu" để bắt đầu ghi lại</p>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Thêm ngay
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 16px 8px' }}>
            {recentTxs.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} onEdit={openEdit} />
            ))}
          </div>
        )}
      </motion.div>

      <TransactionModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        editing={editingTx}
      />
    </div>
  )
}
