import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useStore } from '../../store/useStore'
import { formatVND } from '../../utils/format'
import './TransactionItem.css'

export default function TransactionItem({ tx, onEdit }) {
  const { deleteTransaction, getCategoryById } = useStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const cat = getCategoryById(tx.category)

  const handleDelete = async () => {
    if (confirmDelete) {
      setDeleting(true)
      try { await deleteTransaction(tx.id) } finally { setDeleting(false) }
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <motion.div
      className="tx-item"
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div
        className="tx-icon"
        style={{ background: `${cat.color}22`, border: `1px solid ${cat.color}22` }}
      >
        {cat.icon}
      </div>
      <div className="tx-info">
        <div className="tx-note">{tx.note || cat.name}</div>
        <div className="tx-category-badge" style={{ background: `${cat.color}22`, color: cat.color }}>
          {cat.name}
        </div>
      </div>
      <div className="tx-amount">-{formatVND(tx.amount)}</div>
      <div className="tx-actions">
        <button className="btn-icon tx-action-btn" onClick={() => onEdit(tx)} disabled={deleting}>
          <Pencil size={14} />
        </button>
        <button
          className={`btn-icon tx-action-btn ${confirmDelete ? 'btn-danger' : ''}`}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <Trash2 size={14} />}
        </button>
      </div>
    </motion.div>
  )
}
