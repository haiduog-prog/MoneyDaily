import { useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts'
import { useStore } from '../store/useStore'
import { formatVND, formatVNDShort, formatDateShort, getCurrentYearMonth } from '../utils/format'
import './Statistics.css'

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

const CustomBarTooltip = ({ active, payload, label }) => {
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

export default function Statistics() {
  const { getTransactionsByMonth, getCategoryTotals, getDailyTotals, getTotalByMonth, categories } = useStore()
  const now = getCurrentYearMonth()
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)

  const transactions = getTransactionsByMonth(year, month)
  const total = getTotalByMonth(year, month)
  const categoryTotals = getCategoryTotals(year, month)
  const dailyData = getDailyTotals(year, month).map((d) => ({
    date: formatDateShort(d.date),
    total: d.total,
  }))

  // Pie chart data
  const pieData = categories
    .map((cat) => ({
      name: cat.name,
      value: categoryTotals[cat.id] || 0,
      color: cat.color,
      icon: cat.icon,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // Category bar data
  const barData = pieData.map((d) => ({
    name: d.name,
    value: d.value,
    color: d.color,
    icon: d.icon,
  }))

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (year === now.year && month === now.month) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="page-content animate-fadeIn">
      <div className="page-header">
        <h1 className="page-title">Thống kê</h1>
        <p className="page-subtitle">{transactions.length} giao dịch · Tổng {formatVND(total)}</p>
      </div>

      {/* Month Nav */}
      <div className="month-nav" style={{ marginBottom: '24px' }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
        <span className="month-label">Tháng {month}/{year}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={nextMonth}
          disabled={year === now.year && month === now.month}
        >›</button>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-title">Không có dữ liệu</p>
          <p className="empty-state-desc">Tháng {month}/{year} chưa có chi tiêu nào để thống kê</p>
        </div>
      ) : (
        <div className="stats-charts">
          {/* Pie + Table Row */}
          <div className="chart-row">
            {/* Pie Chart */}
            <div className="glass-card chart-box">
              <h2 className="card-title" style={{ marginBottom: '16px' }}>Theo danh mục</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={<CustomPieLabel />}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [formatVND(value), name]}
                    contentStyle={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Table */}
            <div className="glass-card chart-box">
              <h2 className="card-title" style={{ marginBottom: '16px' }}>Chi tiết danh mục</h2>
              <div className="cat-table">
                {pieData.map((item) => {
                  const pct = total > 0 ? (item.value / total) * 100 : 0
                  return (
                    <div key={item.name} className="cat-table-row">
                      <div
                        className="cat-table-color"
                        style={{ background: item.color }}
                      />
                      <span className="cat-table-icon">{item.icon}</span>
                      <div className="cat-table-info">
                        <div className="cat-table-name">{item.name}</div>
                        <div className="progress-bar-container" style={{ marginTop: '3px' }}>
                          <div
                            className="progress-bar-fill"
                            style={{ width: `${pct}%`, background: item.color }}
                          />
                        </div>
                      </div>
                      <div className="cat-table-values">
                        <div className="cat-table-amount" style={{ color: item.color }}>
                          {formatVNDShort(item.value)}
                        </div>
                        <div className="cat-table-pct">{pct.toFixed(1)}%</div>
                      </div>
                    </div>
                  )
                })}
                <div className="cat-table-total">
                  <span>Tổng cộng</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{formatVND(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Bar Chart */}
          <div className="glass-card chart-box-full">
            <h2 className="card-title" style={{ marginBottom: '16px' }}>Chi tiêu từng ngày</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#5C5C8A', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#5C5C8A', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatVNDShort} width={48} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="total" fill="#6C63FF" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Bar Chart */}
          <div className="glass-card chart-box-full">
            <h2 className="card-title" style={{ marginBottom: '16px' }}>So sánh danh mục</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, left: 70, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#5C5C8A', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatVNDShort} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#9B9BC8', fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={65}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
