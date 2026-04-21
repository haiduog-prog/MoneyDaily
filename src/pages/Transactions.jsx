import { useState, useEffect } from 'react'
import { Plus, Search, Filter, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '../store/useStore'
import { groupByDate, friendlyDate, formatVND, getCurrentYearMonth } from '../utils/format'
import TransactionModal from '../components/Transactions/TransactionModal'
import TransactionItem from '../components/Transactions/TransactionItem'
import './Transactions.css'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function Transactions() {
  const { getTransactionsByMonth, getTotalByMonth, categories, ensureMonthDataLoaded } = useStore()
  const now = getCurrentYearMonth()
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)

  useEffect(() => {
    ensureMonthDataLoaded(year, month)
  }, [year, month, ensureMonthDataLoaded])

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)

  const allTxs = getTransactionsByMonth(year, month)
  const total = getTotalByMonth(year, month)

  // Filter
  const filtered = allTxs.filter((tx) => {
    const matchSearch = !search || tx.note.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || tx.category === filterCat
    return matchSearch && matchCat
  })

  const grouped = groupByDate(filtered)

  const openEdit = (tx) => { setEditingTx(tx); setModalOpen(true) }
  const handleClose = () => { setModalOpen(false); setEditingTx(null) }

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    const { month: cm, year: cy } = getCurrentYearMonth()
    if (year === cy && month === cm) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="page-content animate-fadeIn">
      <div className="page-header">
        <div className="txs-header">
          <div>
            <h1 className="page-title">Giao dịch</h1>
            <p className="page-subtitle">{filtered.length} giao dịch · Tổng {formatVND(total)}</p>
          </div>
          <button id="add-tx-btn" className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={18} /> Thêm
          </button>
        </div>

        {/* Month Picker */}
        <div className="month-nav">
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
          <span className="month-label">Tháng {month}/{year}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={nextMonth}
            disabled={year === now.year && month === now.month}
          >›</button>
        </div>

        {/* Search & Filter */}
        <div className="txs-filters">
          <div className="search-input-wrapper">
            <Search size={15} className="search-icon" />
            <input
              id="search-input"
              className="search-input"
              type="text"
              placeholder="Tìm kiếm ghi chú..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="cat-filter-row">
            <button
              className={`cat-filter-pill ${filterCat === 'all' ? 'active' : ''}`}
              onClick={() => setFilterCat('all')}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`filter-${cat.id}`}
                className={`cat-filter-pill ${filterCat === cat.id ? 'active' : ''}`}
                style={filterCat === cat.id ? { background: `${cat.color}22`, borderColor: cat.color, color: cat.color } : {}}
                onClick={() => setFilterCat(filterCat === cat.id ? 'all' : cat.id)}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transaction Groups */}
      {grouped.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-state-icon">🧾</div>
          <p className="empty-state-title">Không có giao dịch</p>
          <p className="empty-state-desc">
            {search || filterCat !== 'all' ? 'Thử thay đổi bộ lọc' : `Tháng ${month}/${year} chưa có chi tiêu nào`}
          </p>
          {!search && filterCat === 'all' && (
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> Thêm chi tiêu đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="tx-groups">
          <AnimatePresence>
            {grouped.map(({ date, items }) => {
              const dayTotal = items.reduce((s, tx) => s + tx.amount, 0)
              return (
                <motion.div
                  key={date}
                  className="tx-group"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="tx-group-header">
                    <span className="tx-group-date">{friendlyDate(date)}</span>
                    <span className="tx-group-total">-{formatVND(dayTotal)}</span>
                  </div>
                  <AnimatePresence>
                    {items.map((tx) => (
                      <TransactionItem key={tx.id} tx={tx} onEdit={openEdit} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <TransactionModal isOpen={modalOpen} onClose={handleClose} editing={editingTx} />
    </div>
  )
}
