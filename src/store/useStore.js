import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY } from '../data/categories'

// --- Default budgets for first-time users ---
const DEFAULT_BUDGET_AMOUNT = 1000000

export const useStore = create((set, get) => ({
  // ===== STATE =====
  transactions: [],
  categories: [],      // user's categories from Supabase
  budgets: {},         // keyed by category id for current month
  budgetRecords: [],   // raw DB records
  loading: false,
  error: null,
  currentUserId: null,

  // ===== HELPERS =====
  getCategoryById: (id) => {
    const { categories } = get()
    return categories.find((c) => c.id === id) || FALLBACK_CATEGORY
  },

  // ===== INIT =====
  loadUserData: async (userId) => {
    set({ loading: true, error: null, currentUserId: userId })
    try {
      await Promise.all([
        get().fetchCategories(userId),
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
    categories: [],
    budgets: {},
    budgetRecords: [],
    currentUserId: null,
  }),

  // ===== CATEGORIES =====
  fetchCategories: async (userId) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
    if (error) throw error

    if (!data || data.length === 0) {
      // Seed default categories for new user
      await get().seedDefaultCategories(userId)
    } else {
      set({ categories: data })
    }
  },

  seedDefaultCategories: async (userId) => {
    const seeds = DEFAULT_CATEGORIES.map((cat) => ({
      user_id: userId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      sort_order: cat.sort_order,
    }))
    const { data, error } = await supabase
      .from('categories')
      .insert(seeds)
      .select()
    if (error) throw error
    set({ categories: data || [] })
  },

  addCategory: async ({ name, icon, color }) => {
    const { currentUserId, categories } = get()
    const sortOrder = categories.length
    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: currentUserId, name, icon, color, sort_order: sortOrder })
      .select()
      .single()
    if (error) throw error
    set((state) => ({ categories: [...state.categories, data] }))
    return data
  },

  updateCategory: async (id, { name, icon, color }) => {
    const { data, error } = await supabase
      .from('categories')
      .update({ name, icon, color })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    set((state) => ({
      categories: state.categories.map((c) => c.id === id ? data : c),
    }))
  },

  deleteCategory: async (id) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    if (error) throw error
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }))
  },

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
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    const records = data || []
    set({ budgetRecords: records })
    const now = new Date()
    get()._rebuildBudgetMap(records, now.getMonth() + 1, now.getFullYear())
  },

  _rebuildBudgetMap: (records, month, year) => {
    const map = {}
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

  // ===== MIGRATION =====
  migrateFromLocalStorage: async (userId) => {
    try {
      const raw = localStorage.getItem('chitieuapp-storage')
      if (!raw) return false
      const parsed = JSON.parse(raw)
      const oldTxs = parsed?.state?.transactions || []
      if (oldTxs.length === 0) return false

      // Map old category keys to user's new category IDs by name matching
      const { categories } = get()
      const nameMap = {}
      const oldNameMap = {
        food: 'Ăn uống', transport: 'Di chuyển', shopping: 'Mua sắm',
        entertainment: 'Giải trí', health: 'Y tế', utilities: 'Hóa đơn',
        education: 'Học tập', personal: 'Cá nhân', other: 'Khác',
      }
      Object.entries(oldNameMap).forEach(([key, name]) => {
        const found = categories.find((c) => c.name === name)
        if (found) nameMap[key] = found.id
      })

      const fallbackId = categories[categories.length - 1]?.id
      const payload = oldTxs.map((tx) => ({
        user_id: userId,
        amount: Number(tx.amount),
        category: nameMap[tx.category] || fallbackId,
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
    } catch { return false }
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
    const { categories, budgetRecords } = get()
    const totals = get().getCategoryTotals(year, month)
    return categories.map((cat) => {
      const budgetRec = budgetRecords.find(
        (r) => r.category === cat.id && r.month === month && r.year === year
      )
      const budget = budgetRec ? budgetRec.amount : DEFAULT_BUDGET_AMOUNT
      const spent = totals[cat.id] || 0
      return {
        category: cat.id,
        budget,
        spent,
        percentage: budget > 0 ? Math.min((spent / budget) * 100, 100) : 0,
        isOver: spent > budget,
      }
    })
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
