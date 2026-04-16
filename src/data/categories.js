// Default expense categories with icons and colors
export const CATEGORIES = [
  { id: 'food', name: 'Ăn uống', icon: '🍜', color: '#FF9F43', light: 'rgba(255,159,67,0.15)' },
  { id: 'transport', name: 'Di chuyển', icon: '🚗', color: '#54A0FF', light: 'rgba(84,160,255,0.15)' },
  { id: 'shopping', name: 'Mua sắm', icon: '🛍️', color: '#FF6584', light: 'rgba(255,101,132,0.15)' },
  { id: 'entertainment', name: 'Giải trí', icon: '🎮', color: '#A29BFE', light: 'rgba(162,155,254,0.15)' },
  { id: 'health', name: 'Y tế', icon: '💊', color: '#10D9A0', light: 'rgba(16,217,160,0.15)' },
  { id: 'utilities', name: 'Hóa đơn', icon: '🏠', color: '#00CEC9', light: 'rgba(0,206,201,0.15)' },
  { id: 'education', name: 'Học tập', icon: '📚', color: '#FDCB6E', light: 'rgba(253,203,110,0.15)' },
  { id: 'personal', name: 'Cá nhân', icon: '💄', color: '#FD79A8', light: 'rgba(253,121,168,0.15)' },
  { id: 'other', name: 'Khác', icon: '📦', color: '#9B9BC8', light: 'rgba(155,155,200,0.15)' },
]

export const getCategoryById = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]
