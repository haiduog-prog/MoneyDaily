import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, List, BarChart2, PiggyBank, Settings } from 'lucide-react'
import './Sidebar.css'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tổng quan', exact: true },
  { to: '/transactions', icon: List, label: 'Giao dịch' },
  { to: '/statistics', icon: BarChart2, label: 'Thống kê' },
  { to: '/budget', icon: PiggyBank, label: 'Ngân sách' },
  { to: '/settings', icon: Settings, label: 'Cài đặt' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">💸</div>
        <div>
          <div className="sidebar-logo-title">ChiTiêu</div>
          <div className="sidebar-logo-sub">Quản lý thông minh</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
            <div className="sidebar-nav-indicator" />
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-text">v1.0.0 · Dữ liệu lưu cục bộ</div>
      </div>
    </aside>
  )
}
