import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'

// --- Default budgets for first-time users ---
const DEFAULT_BUDGETS = {
  food: 3000000,
  transport: 1000000,
  shopping: 2000000,
  entertainment: 1500000,
  health: 500000,
  utilities: 1000000,
  education: 500000,
  personal: 500000,
  other: 500000,
}

export const useStore = create((set, get) => ({
  // ===== STATE =====
  transactions: [],
  budgets: DEFAULT_BUDGETS,  // keyed by category, for current month
  budgetRecords: [],          // raw DB records
  loading: false,
  error: null,
  currentUserId: null,

  // ===== INIT: load data for logged-in user =====
  loadUserData: async (userId) => {
    set({ loading: true, error: null, currentUserId: userId })
    try {
      await Promise.all([
        get().fetchTransactions(userId),
        get().fetchBudgets(userId),
      ])
    } catch (e) {
      set({ error: e.message })
    } finally {
      set({ loading: false })
    }
  },

  clearData: () => set({
    transactions: [],
    budgets: DEFAULT_BUDGETS,
    budgetRecords: [],
    currentUserId: null,
  }),

  // ===== TRANSACTIONS =====
  fetchTransactions: async (userId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    set({ transactions: data || [] })
  },

  addTransaction: async (formData) => {
    const { currentUserId } = get()
    const payload = {
      user_id: currentUserId,
      amount: Number(formData.amount),
      category: formData.category,
      note: formData.note || '',
      date: formData.date,
    }
    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    set((state) => ({ transactions: [data, ...state.transactions] }))
    return data
  },

  updateTransaction: async (id, formData) => {
    const payload = {
      amount: Number(formData.amount),
      category: formData.category,
      note: formData.note || '',
      date: formData.date,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set((state) => ({
      transactions: state.transactions.map((tx) => tx.id === id ? data : tx),
    }))
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    if (error) throw error
    set((state) => ({
      transactions: state.transactions.filter((tx) => tx.id !== id),
    }))
  },

  // ===== BUDGETS =====
  fetchBudgets: async (userId) => {
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    const records = data || []
    set({ budgetRecords: records })
    get()._rebuildBudgetMap(records, month, year)
  },

  _rebuildBudgetMap: (records, month, year) => {
    const map = { ...DEFAULT_BUDGETS }
    records
      .filter((r) => r.month === month && r.year === year)
      .forEach((r) => { map[r.category] = r.amount })
    set({ budgets: map })
  },

  setBudget: async (categoryId, amount, month, year) => {
    const { currentUserId, budgetRecords } = get()
    const existing = budgetRecords.find(
      (r) => r.category === categoryId && r.month === month && r.year === year
    )

    let record
    if (existing) {
      const { data, error } = await supabase
        .from('budgets')
        .update({ amount: Number(amount) })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      record = data
      set((state) => ({
        budgetRecords: state.budgetRecords.map((r) => r.id === record.id ? record : r),
      }))
    } else {
      const { data, error } = await supabase
        .from('budgets')
        .insert({ user_id: currentUserId, category: categoryId, amount: Number(amount), month, year })
        .select()
        .single()
      if (error) throw error
      record = data
      set((state) => ({ budgetRecords: [...state.budgetRecords, record] }))
    }

    set((state) => ({
      budgets: { ...state.budgets, [categoryId]: Number(amount) },
    }))
  },

  // ===== MIGRATION: localStorage → Supabase =====
  migrateFromLocalStorage: async (userId) => {
    try {
      const raw = localStorage.getItem('chitieuapp-storage')
      if (!raw) return false
      const parsed = JSON.parse(raw)
      const oldTxs = parsed?.state?.transactions || []
      if (oldTxs.length === 0) return false

      const payload = oldTxs.map((tx) => ({
        user_id: userId,
        amount: Number(tx.amount),
        category: tx.category,
        note: tx.note || '',
        date: tx.date,
        created_at: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
      }))

      const { error } = await supabase.from('transactions').insert(payload)
      if (!error) {
        localStorage.removeItem('chitieuapp-storage')
        return true
      }
      return false
    } catch {
      return false
    }
  },

  // ===== SELECTORS =====
  getTransactionsByMonth: (year, month) => {
    const { transactions } = get()
    const start = startOfMonth(new Date(year, month - 1))
    const end = endOfMonth(new Date(year, month - 1))
    return transactions.filter((tx) => {
      try {
        return isWithinInterval(parseISO(tx.date), { start, end })
      } catch { return false }
    })
  },

  getTotalByMonth: (year, month) => {
    return get().getTransactionsByMonth(year, month).reduce((s, tx) => s + tx.amount, 0)
  },

  getCategoryTotals: (year, month) => {
    const txs = get().getTransactionsByMonth(year, month)
    const totals = {}
    txs.forEach((tx) => { totals[tx.category] = (totals[tx.category] || 0) + tx.amount })
    return totals
  },

  getBudgetUsage: (year, month) => {
    const { budgetRecords } = get()
    const monthBudgets = { ...DEFAULT_BUDGETS }
    budgetRecords
      .filter((r) => r.month === month && r.year === year)
      .forEach((r) => { monthBudgets[r.category] = r.amount })

    const totals = get().getCategoryTotals(year, month)
    return Object.entries(monthBudgets).map(([cat, budget]) => ({
      category: cat,
      budget,
      spent: totals[cat] || 0,
      percentage: budget > 0 ? Math.min(((totals[cat] || 0) / budget) * 100, 100) : 0,
      isOver: (totals[cat] || 0) > budget,
    }))
  },

  getDailyTotals: (year, month) => {
    const txs = get().getTransactionsByMonth(year, month)
    const daily = {}
    txs.forEach((tx) => { daily[tx.date] = (daily[tx.date] || 0) + tx.amount })
    return Object.entries(daily)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date))
  },

  getLast7DaysTotals: () => {
    const { transactions } = get()
    const result = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const total = transactions
        .filter((tx) => tx.date === dateStr)
        .reduce((s, tx) => s + tx.amount, 0)
      result.push({ date: dateStr, total })
    }
    return result
  },
}))
