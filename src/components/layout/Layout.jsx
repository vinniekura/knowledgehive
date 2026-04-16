import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUser, useClerk, useAuth } from '@clerk/clerk-react'
import { LayoutDashboard, Users, CalendarDays, CreditCard, Shield, LogOut } from 'lucide-react'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/students',  icon: Users,           label: 'Students' },
  { to: '/sessions',  icon: CalendarDays,    label: 'Sessions' },
  { to: '/payments',  icon: CreditCard,      label: 'Payments' },
]

export default function Layout({ children }) {
  const { user } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const appName = import.meta.env.VITE_APP_NAME || 'KnowledgeHive'

  useEffect(() => {
    getToken().then(token =>
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => { if (r.ok) setIsAdmin(true) })
        .catch(() => {})
    )
  }, [getToken])

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: 'var(--navy)' }}>
        <div className="px-4 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 font-bold text-lg"
               style={{ background: 'var(--honey)', color: 'var(--navy)', fontFamily: 'serif' }}>K</div>
          <div className="text-white font-semibold text-base leading-tight">{appName}</div>
          <div className="text-white/30 text-xs mt-0.5 uppercase tracking-wider">Tutor Platform</div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive ? 'text-amber-400 bg-amber-400/15' : 'text-white/50 hover:text-white hover:bg-white/7'}`}>
              <Icon size={16} />{label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="text-white/20 text-xs uppercase tracking-wider px-3 pt-4 pb-1 font-semibold">Admin</div>
              <NavLink to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${isActive ? 'text-amber-400 bg-amber-400/15' : 'text-white/50 hover:text-white hover:bg-white/7'}`}>
                <Shield size={16} />Admin Portal
              </NavLink>
            </>
          )}
        </nav>

        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                 style={{ background: 'var(--honey)', color: 'var(--navy)' }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/80 text-xs font-semibold truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-white/30 text-xs">{isAdmin ? 'Administrator' : 'Tutor'}</div>
            </div>
            <button onClick={() => signOut(() => navigate('/'))} className="text-white/30 hover:text-white/70 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
