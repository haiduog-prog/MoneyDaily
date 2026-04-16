import { NavLink } from 'react-router-dom'
import { LayoutDashboard, List, BarChart2, PiggyBank, Settings } from 'lucide-react'
import './BottomNav.css'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tổng quan', exact: true },
  { to: '/transactions', icon: List, label: 'Giao dịch' },
  { to: '/statistics', icon: BarChart2, label: 'Thống kê' },
  { to: '/budget', icon: PiggyBank, label: 'Ngân sách' },
  { to: '/settings', icon: Settings, label: 'Cài đặt' },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, icon: Icon, label, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
