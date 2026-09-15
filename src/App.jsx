import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import Login from './pages/Login'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import MembersList from './pages/admin/MembersList'
import AdminProjects from './pages/admin/AdminProjects'
import AdminReferrals from './pages/admin/AdminReferrals'
import AdminReports from './pages/admin/AdminReports'
import AdminSettings from './pages/admin/AdminSettings'
import MemberLayout from './pages/member/MemberLayout'
import MemberDashboard from './pages/member/MemberDashboard'
import MyProfile from './pages/member/MyProfile'
import MyProjects from './pages/member/MyProjects'
import MyReferrals from './pages/member/MyReferrals'
import Directory from './pages/member/Directory'
import Meetings from './pages/member/Meetings'
import EditProfile from './pages/member/EditProfile'
import SlipHistory from './pages/member/SlipHistory'
import AdminSetup from './pages/AdminSetup'
import VisitMeeting from './pages/VisitMeeting'
import AdminVisitRequests from './pages/admin/Visits'
import AdminSlipHistory from './pages/admin/AdminSlipHistory'

export default function App() {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login toggleDark={() => setDark(d => !d)} dark={dark} />} />
        <Route path="/admin-setup" element={<AdminSetup />} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout toggleDark={() => setDark(d => !d)} dark={dark} /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="members" element={<MembersList />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="referrals" element={<AdminReferrals />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="visitors" element={<AdminVisitRequests />} />
          <Route path="history" element={<AdminSlipHistory />} />
        </Route>
        <Route path="/member" element={<ProtectedRoute role="member"><MemberLayout toggleDark={() => setDark(d => !d)} dark={dark} /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MemberDashboard />} />
          <Route path="profile" element={<MyProfile />} />
          <Route path="projects" element={<MyProjects />} />
          <Route path="referrals" element={<MyReferrals />} />
          <Route path="directory" element={<Directory />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="edit-profile" element={<EditProfile />} />
          <Route path="history" element={<SlipHistory />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route path="visit-meeting" element={<VisitMeeting />} />
      </Routes>
    </AuthProvider>
  )
}