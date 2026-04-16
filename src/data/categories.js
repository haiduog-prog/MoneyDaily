// Default categories — used as seed data for new users
export const DEFAULT_CATEGORIES = [
  { name: 'Ăn uống', icon: '🍜', color: '#FF9F43', sort_order: 0 },
  { name: 'Di chuyển', icon: '🚗', color: '#54A0FF', sort_order: 1 },
  { name: 'Mua sắm', icon: '🛍️', color: '#FF6584', sort_order: 2 },
  { name: 'Giải trí', icon: '🎮', color: '#A29BFE', sort_order: 3 },
  { name: 'Y tế', icon: '💊', color: '#10D9A0', sort_order: 4 },
  { name: 'Hóa đơn', icon: '🏠', color: '#00CEC9', sort_order: 5 },
  { name: 'Học tập', icon: '📚', color: '#FDCB6E', sort_order: 6 },
  { name: 'Cá nhân', icon: '💄', color: '#FD79A8', sort_order: 7 },
  { name: 'Khác', icon: '📦', color: '#9B9BC8', sort_order: 8 },
]

// Fallback category when not found
export const FALLBACK_CATEGORY = { id: 'unknown', name: 'Không rõ', icon: '❓', color: '#9B9BC8' }
