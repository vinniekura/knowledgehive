import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import Layout from './components/layout/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import StudentsPage from './pages/StudentsPage.jsx'
import SessionsPage from './pages/SessionsPage.jsx'
import PaymentsPage from './pages/PaymentsPage.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import JoinPage from './pages/public/JoinPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public routes — no auth needed */}
      <Route path="/join" element={<JoinPage />} />

      {/* Protected routes */}
      <Route path="/*" element={
        <>
          <SignedIn>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </SignedIn>
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
        </>
      } />
    </Routes>
  )
}
