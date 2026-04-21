import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { get, set as idbSet, del } from 'idb-keyval'
import { supabase } from '../lib/supabase'
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY } from '../data/categories'

// --- Default budgets for first-time users ---
const DEFAULT_BUDGET_AMOUNT = 0

// --- Custom IndexedDB storage for Zustand ---
const idbStorage = {
  getItem: async (name) => {
    const value = await get(name)
    return value || null
  },
  setItem: async (name, value) => {
    await idbSet(name, value)
  },
  removeItem: async (name) => {
    await del(name)
  },
}

export const useStore = create(
  persist(
    (set, get) => ({
      // ===== STATE =====
      transactions: [],
      categories: [],      // user's categories from Supabase
      budgets: {},         // keyed by category id for current month
      budgetRecords: [],   // raw DB records
      loadedMonths: [],    // tracks which months (YYYY-MM) have been loaded
      loading: false,
      error: null,
      currentUserId: null,
      subscription: null, // Holds the Supabase real-time subscription
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      syncQueue: [], // Queue of pending operations: { table, type, payload, id, tempId }

      // ===== HELPERS =====
      getCategoryById: (id) => {
        const { categories } = get()
        return categories.find((c) => c.id === id) || FALLBACK_CATEGORY
      },

      // ===== INIT =====
      loadUserData: async (userId) => {
        set({ loading: true, error: null, currentUserId: userId })
        try {
          const now = new Date()
          const currentYear = now.getFullYear()
          const currentMonth = now.getMonth() + 1
          
          await Promise.all([
            get().fetchCategories(userId),
            get().ensureMonthDataLoaded(currentYear, currentMonth),
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
        loadedMonths: [],
        currentUserId: null,
        subscription: null,
        syncQueue: [],
      }),

      setOnline: (status) => {
        set({ isOnline: status })
        if (status) {
          get().processSyncQueue()
        }
      },

      // ===== SYNC QUEUE =====
      processSyncQueue: async () => {
        const { syncQueue, isOnline, currentUserId } = get()
        if (!isOnline || syncQueue.length === 0 || !currentUserId) return

        console.log(`Processing sync queue: ${syncQueue.length} items`)
        const remainingQueue = [...syncQueue]
        
        // Process one by one to handle dependencies (like categories before transactions)
        while (remainingQueue.length > 0) {
          const op = remainingQueue[0]
          try {
            let res
            if (op.type === 'INSERT') {
              res = await supabase.from(op.table).insert(op.payload).select().single()
              if (res.error) throw res.error
              
              // If it was a transaction with a tempId, update the local record with the real ID
              if (op.tempId) {
                const realId = res.data.id
                // Update references in remaining queue elements
                remainingQueue.forEach(q => {
                  if (q.id === op.tempId) q.id = realId
                  if (q.payload && q.payload.category === op.tempId) {
                    q.payload.category = realId
                  }
                })

                if (op.table === 'transactions') {
                  set(state => {
                    const exists = state.transactions.some(t => t.id === realId)
                    return {
                      transactions: exists 
                        ? state.transactions.filter(t => t.id !== op.tempId)
                        : state.transactions.map(t => t.id === op.tempId ? res.data : t)
                    }
                  })
                } else if (op.table === 'categories') {
                  set(state => {
                    const exists = state.categories.some(c => c.id === realId)
                    return {
                      categories: exists
                        ? state.categories.filter(c => c.id !== op.tempId)
                        : state.categories.map(c => c.id === op.tempId ? res.data : c)
                    }
                  })
                } else if (op.table === 'budgets') {
                   set(state => {
                     const exists = state.budgetRecords.some(b => b.id === realId)
                     return {
                       budgetRecords: exists
                         ? state.budgetRecords.filter(b => b.id !== op.tempId)
                         : state.budgetRecords.map(b => b.id === op.tempId ? res.data : b)
                     }
                  })
                }
              }
            } else if (op.type === 'UPDATE') {
              res = await supabase.from(op.table).update(op.payload).eq('id', op.id).select().single()
              if (res.error) throw res.error
            } else if (op.type === 'DELETE') {
              res = await supabase.from(op.table).delete().eq('id', op.id)
              if (res.error) throw res.error
            }
            
            // Success - remove from queue
            remainingQueue.shift()
            set({ syncQueue: [...remainingQueue] })
          } catch (e) {
            console.error(`Sync failed for ${op.table}/${op.type}`, e)
            if (!e.status || e.message === 'Failed to fetch') {
              break // network error or timeout, wait for retry
            }
            // Real error (e.g., constraint violation). Drop it to unblock sync queue.
            remainingQueue.shift()
            set({ syncQueue: [...remainingQueue] })
          }
        }
      },

      // ===== REAL-TIME SYNC =====
      subscribeToChanges: (userId) => {
        const { subscription } = get()
        if (subscription) return // Already subscribed

        const channel = supabase
          .channel('any')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
            (payload) => {
              const { eventType, new: newRecord, old: oldRecord } = payload
              set((state) => {
                let updatedTxs = [...state.transactions]
                if (eventType === 'INSERT') {
                  if (!updatedTxs.find(t => t.id === newRecord.id)) {
                    updatedTxs = [newRecord, ...updatedTxs]
                  }
                } else if (eventType === 'UPDATE') {
                  updatedTxs = updatedTxs.map(t => t.id === newRecord.id ? newRecord : t)
                } else if (eventType === 'DELETE') {
                  updatedTxs = updatedTxs.filter(t => t.id === oldRecord.id)
                }
                return { transactions: updatedTxs }
              })
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
            (payload) => {
              const { eventType, new: newRecord, old: oldRecord } = payload
              set((state) => {
                let updatedCats = [...state.categories]
                if (eventType === 'INSERT') {
                  if (!updatedCats.find(c => c.id === newRecord.id)) {
                    updatedCats = [...updatedCats, newRecord]
                  }
                } else if (eventType === 'UPDATE') {
                  updatedCats = updatedCats.map(c => c.id === newRecord.id ? newRecord : c)
                } else if (eventType === 'DELETE') {
                  updatedCats = updatedCats.filter(c => c.id !== oldRecord.id)
                }
                return { categories: updatedCats }
              })
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${userId}` },
            (payload) => {
              const { eventType, new: newRecord, old: oldRecord } = payload
              set((state) => {
                let updatedBgs = [...state.budgetRecords]
                if (eventType === 'INSERT') {
                  if (!updatedBgs.find(b => b.id === newRecord.id)) {
                    updatedBgs = [...updatedBgs, newRecord]
                  }
                } else if (eventType === 'UPDATE') {
                  updatedBgs = updatedBgs.map(b => b.id === newRecord.id ? newRecord : b)
                } else if (eventType === 'DELETE') {
                  updatedBgs = updatedBgs.filter(b => b.id !== oldRecord.id)
                }
                
                // Rebuild map for current view if needed
                const now = new Date()
                get()._rebuildBudgetMap(updatedBgs, now.getMonth() + 1, now.getFullYear())
                
                return { budgetRecords: updatedBgs }
              })
            }
          )
          .subscribe()

        set({ subscription: channel })
      },

      unsubscribeFromChanges: () => {
        const { subscription } = get()
        if (subscription) {
          supabase.removeChannel(subscription)
          set({ subscription: null })
        }
      },

      // ===== CATEGORIES =====
      fetchCategories: async (userId) => {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('user_id', userId)
          .order('sort_order', { ascending: true })
        if (error) throw error

        if (!data || data.length === 0) {
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
        const { currentUserId, categories, isOnline } = get()
        const tempId = `temp-cat-${Date.now()}`
        const sortOrder = categories.length
        const payload = { user_id: currentUserId, name, icon, color, sort_order: sortOrder }

        // Optimistic update
        const optimisticCat = { ...payload, id: tempId }
        set((state) => ({ categories: [...state.categories, optimisticCat] }))

        if (!isOnline) {
          set((state) => ({ syncQueue: [...state.syncQueue, { table: 'categories', type: 'INSERT', payload, tempId }] }))
          return optimisticCat
        }

        try {
          const { data, error } = await supabase
            .from('categories')
            .insert(payload)
            .select()
            .single()
          
          if (error) throw error
          
          set((state) => ({
            categories: state.categories.map(c => c.id === tempId ? data : c)
          }))
          return data
        } catch (e) {
          if (!e.status || e.message === 'Failed to fetch') {
            set((state) => ({ syncQueue: [...state.syncQueue, { table: 'categories', type: 'INSERT', payload, tempId }] }))
            return optimisticCat
          }
          set((state) => ({ categories: state.categories.filter(c => c.id !== tempId) }))
          throw e
        }
      },

      updateCategory: async (id, { name, icon, color }) => {
        const { categories, isOnline } = get()
        const oldCat = categories.find(c => c.id === id)
        if (!oldCat) return

        const payload = { name, icon, color }

        // Optimistic update
        set((state) => ({
          categories: state.categories.map((c) => c.id === id ? { ...c, ...payload } : c),
        }))

        if (!isOnline) {
          set((state) => ({ syncQueue: [...state.syncQueue, { table: 'categories', type: 'UPDATE', payload, id }] }))
          return
        }

        try {
          const { data, error } = await supabase
            .from('categories')
            .update(payload)
            .eq('id', id)
            .select()
            .single()
          
          if (error) throw error
          set((state) => ({
            categories: state.categories.map((c) => c.id === id ? data : c),
          }))
        } catch (e) {
          if (!e.status || e.message === 'Failed to fetch') {
            set((state) => ({ syncQueue: [...state.syncQueue, { table: 'categories', type: 'UPDATE', payload, id }] }))
            return
          }
          set((state) => ({
            categories: state.categories.map((c) => c.id === id ? oldCat : c),
          }))
          throw e
        }
      },

      deleteCategory: async (id) => {
        const { categories, isOnline } = get()
        const oldCat = categories.find(c => c.id === id)
        if (!oldCat) return

        // Optimistic update
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }))

        if (!isOnline) {
          set((state) => ({ syncQueue: [...state.syncQueue, { table: 'categories', type: 'DELETE', id }] }))
          return
        }

        try {
          const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id)
          
          if (error) throw error
        } catch (e) {
          if (!e.status || e.message === 'Failed to fetch') {
            set((state) => ({ syncQueue: [...state.syncQueue, { table: 'categories', type: 'DELETE', id }] }))
            return
          }
          set((state) => ({
            categories: [...state.categories, oldCat].sort((a, b) => a.sort_order - b.sort_order),
          }))
          throw e
        }
      },

      // ===== DATA LOADING =====
      ensureMonthDataLoaded: async (year, month) => {
        const { currentUserId, loadedMonths } = get()
        const monthKey = `${year}-${String(month).padStart(2, '0')}`

        // Stale-While-Revalidate: If already loaded, rebuild map from cache immediately
        // but still kick off a background fetch to ensure data is fresh.
        const isLoaded = loadedMonths.includes(monthKey)
        if (isLoaded) {
          get()._rebuildBudgetMap(get().budgetRecords, month, year)
        }

        try {
          const start = startOfMonth(new Date(year, month - 1)).toISOString()
          const end = endOfMonth(new Date(year, month - 1)).toISOString()

          const [txRes, budgetRes] = await Promise.all([
            supabase
              .from('transactions')
              .select('*')
              .eq('user_id', currentUserId)
              .gte('date', start)
              .lte('date', end)
              .order('date', { ascending: false })
              .order('created_at', { ascending: false }),
            supabase
              .from('budgets')
              .select('*')
              .eq('user_id', currentUserId)
              .eq('month', month)
              .eq('year', year)
          ])

          if (txRes.error) throw txRes.error
          if (budgetRes.error) throw budgetRes.error

          set((state) => {
            const newTxs = txRes.data || []
            // Merge transactions: keep existing if not in new, add new
            const newTxIds = new Set(newTxs.map(t => t.id))
            const combinedTxs = [
              ...state.transactions.filter(t => !newTxIds.has(t.id)),
              ...newTxs
            ].sort((a, b) => new Date(b.date) - new Date(a.date))

            const newBgs = budgetRes.data || []
            const newBgIds = new Set(newBgs.map(b => b.id))
            const combinedBgs = [
              ...state.budgetRecords.filter(b => !newBgIds.has(b.id)),
              ...newBgs
            ]

            return {
              transactions: combinedTxs,
              budgetRecords: combinedBgs,
              loadedMonths: isLoaded ? state.loadedMonths : [...state.loadedMonths, monthKey]
            }
          })

          get()._rebuildBudgetMap(get().budgetRecords, month, year)
          
        } catch (e) {
          console.error("Failed to load month data", e)
        }
      },

      // ===== TRANSACTIONS =====
      addTransaction: async (formData) => {
        const { currentUserId, isOnline } = get()
        const tempId = `temp-${Date.now()}`
        const payload = {
          user_id: currentUserId,
          amount: Number(formData.amount),
          category: formData.category,
          note: formData.note || '',
          date: formData.date,
        }

        // Optimistic update
        const optimisticTx = { ...payload, id: tempId, created_at: new Date().toISOString() }
        set((state) => ({ transactions: [optimisticTx, ...state.transactions] }))

        if (!isOnline) {
          set((state) => ({ syncQueue: [...state.syncQueue, { table: 'transactions', type: 'INSERT', payload, tempId }] }))
          return optimisticTx
        }

        try {
          const { data, error } = await supabase
            .from('transactions')
            .insert(payload)
            .select()
            .single()
          
          if (error) throw error
          
          set((state) => ({
            transactions: state.transactions.map(tx => tx.id === tempId ? data : tx)
          }))
          return data
        } catch (e) {
          // If it's likely a network error, keep optimistic and add to queue
          if (!e.status || e.message === 'Failed to fetch') {
            set((state) => ({ syncQueue: [...state.syncQueue, { table: 'transactions', type: 'INSERT', payload, tempId }] }))
            return optimisticTx
          }
          // Real error - rollback
          set((state) => ({ transactions: state.transactions.filter(tx => tx.id !== tempId) }))
          throw e
        }
      },

      updateTransaction: async (id, formData) => {
        const { transactions, isOnline } = get()
        const oldTx = transactions.find(t => t.id === id)
        if (!oldTx) return

        const payload = {
          amount: Number(formData.amount),
          category: formData.category,
          note: formData.note || '',
          date: formData.date,
          updated_at: new Date().toISOString(),
        }

        // Optimistic update
        const optimisticTx = { ...oldTx, ...payload }
        set((state) => ({
          transactions: state.transactions.map((tx) => tx.id === id ? optimisticTx : tx),
        }))

        if (!isOnline) {
          set((state) => ({ syncQueue: [...state.syncQueue, { table: 'transactions', type: 'UPDATE', payload, id }] }))
          return
        }

        try {
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
        } catch (e) {
          if (!e.status || e.message === 'Failed to fetch') {
            set((state) => ({ syncQueue: [...state.syncQueue, { table: 'transactions', type: 'UPDATE', payload, id }] }))
            return
          }
          set((state) => ({
            transactions: state.transactions.map((tx) => tx.id === id ? oldTx : tx),
          }))
          throw e
        }
      },

      deleteTransaction: async (id) => {
        const { transactions, isOnline } = get()
        const oldTx = transactions.find(t => t.id === id)
        if (!oldTx) return

        // Optimistic update
        set((state) => ({
          transactions: state.transactions.filter((tx) => tx.id !== id),
        }))

        if (!isOnline) {
          set((state) => ({ syncQueue: [...state.syncQueue, { table: 'transactions', type: 'DELETE', id }] }))
          return
        }

        try {
          const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id)
          
          if (error) throw error
        } catch (e) {
          if (!e.status || e.message === 'Failed to fetch') {
            set((state) => ({ syncQueue: [...state.syncQueue, { table: 'transactions', type: 'DELETE', id }] }))
            return
          }
          set((state) => ({
            transactions: [oldTx, ...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)),
          }))
          throw e
        }
      },

      // ===== BUDGETS =====
      _rebuildBudgetMap: (records, month, year) => {
        const map = {}
        records
          .filter((r) => r.month === month && r.year === year)
          .forEach((r) => { map[r.category] = r.amount })
        set({ budgets: map })
      },

      setBudget: async (categoryId, amount, month, year) => {
        const { currentUserId, budgetRecords, isOnline } = get()
        const existing = budgetRecords.find(
          (r) => r.category === categoryId && r.month === month && r.year === year
        )
        const tempId = existing ? existing.id : `temp-bg-${Date.now()}`
        const amountNum = Number(amount)

        // Optimistic update
        const optimisticRecord = existing
          ? { ...existing, amount: amountNum }
          : { id: tempId, user_id: currentUserId, category: categoryId, amount: amountNum, month, year }

        set((state) => ({
          budgetRecords: existing
            ? state.budgetRecords.map(r => r.id === existing.id ? optimisticRecord : r)
            : [...state.budgetRecords, optimisticRecord],
          budgets: { ...state.budgets, [categoryId]: amountNum }
        }))

        if (!isOnline) {
          const type = existing ? 'UPDATE' : 'INSERT'
          const id = existing ? existing.id : null
          set((state) => ({ syncQueue: [...state.syncQueue, { table: 'budgets', type, payload: optimisticRecord, id, tempId: existing ? null : tempId }] }))
          return
        }

        try {
          let data, error
          if (existing) {
            const res = await supabase
              .from('budgets')
              .update({ amount: amountNum })
              .eq('id', existing.id)
              .select()
              .single()
            data = res.data
            error = res.error
          } else {
            const res = await supabase
              .from('budgets')
              .insert({ user_id: currentUserId, category: categoryId, amount: amountNum, month, year })
              .select()
              .single()
            data = res.data
            error = res.error
          }

          if (error) throw error

          // Replace temp with actual
          set((state) => ({
            budgetRecords: state.budgetRecords.map(r => r.id === (existing ? existing.id : tempId) ? data : r)
          }))
        } catch (e) {
          if (!e.status || e.message === 'Failed to fetch') {
            const type = existing ? 'UPDATE' : 'INSERT'
            const id = existing ? existing.id : null
            set((state) => ({ syncQueue: [...state.syncQueue, { table: 'budgets', type, payload: optimisticRecord, id, tempId: existing ? null : tempId }] }))
            return
          }
          // Rollback
          set((state) => ({
            budgetRecords: existing
              ? state.budgetRecords.map(r => r.id === existing.id ? existing : r)
              : state.budgetRecords.filter(r => r.id !== tempId),
            budgets: { ...state.budgets, [categoryId]: existing ? existing.amount : 0 }
          }))
          throw e
        }
      },

      // ===== MIGRATION =====
      migrateFromLocalStorage: async (userId) => {
        try {
          const raw = localStorage.getItem('chitieuapp-storage')
          if (!raw) return false
          const parsed = JSON.parse(raw)
          const oldTxs = parsed?.state?.transactions || []
          if (oldTxs.length === 0) return false

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
    }),
    {
      name: 'chitieuapp-storage-idb',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        transactions: state.transactions,
        categories: state.categories,
        budgetRecords: state.budgetRecords,
        loadedMonths: state.loadedMonths,
        budgets: state.budgets,
        syncQueue: state.syncQueue
      }),
    }
  )
)
