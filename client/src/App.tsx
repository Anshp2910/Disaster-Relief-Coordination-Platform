import { type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import SocialCallback from './pages/SocialCallback'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import CreateRequest from './pages/CreateRequest'
import EditRequest from './pages/EditRequest'
import RequestDetail from './pages/RequestDetail'
import Profile from './pages/Profile'
import Resources from './pages/Resources'
import ZoneHeatMap from './pages/ZoneHeatMap'
import AdminDashboard from './pages/AdminDashboard'
import Incidents from './pages/Incidents'
import Schedules from './pages/Schedules'
import BulkImport from './pages/BulkImport'
import Escalation from './pages/Escalation'
import Geofencing from './pages/Geofencing'
import MapOverview from './pages/MapOverview'
import PublicStatus from './pages/PublicStatus'
import NotFound from './pages/NotFound'

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  return children
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <Routes>
      {/* Auth routes with Layout (header + footer) */}
      <Route path="/login" element={<Layout><Login /></Layout>} />
      <Route path="/register" element={<Layout><Register /></Layout>} />
      <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
      <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />
      <Route path="/social-callback" element={<SocialCallback />} />
      {/* Standard routes with Layout (header + footer) */}
      <Route path="/*" element={
        <Layout>
          <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/public" element={<PublicStatus />} />
                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/map" element={<RequireAuth><MapOverview /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/resources" element={<RequireAuth><Resources /></RequireAuth>} />
                <Route path="/zones" element={<RequireAuth><ZoneHeatMap /></RequireAuth>} />
                <Route path="/requests/new" element={<RequireAuth><CreateRequest /></RequireAuth>} />
                <Route path="/requests/:id" element={<RequireAuth><RequestDetail /></RequireAuth>} />
                <Route path="/requests/:id/edit" element={<RequireAuth><EditRequest /></RequireAuth>} />
                <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                <Route path="/incidents" element={<RequireAuth><Incidents /></RequireAuth>} />
                <Route path="/schedules" element={<RequireAuth><Schedules /></RequireAuth>} />
                <Route path="/bulk" element={<RequireAdmin><BulkImport /></RequireAdmin>} />
                <Route path="/escalation" element={<RequireAdmin><Escalation /></RequireAdmin>} />
                <Route path="/geofencing" element={<RequireAuth><Geofencing /></RequireAuth>} />
                <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        } />
    </Routes>
  )
}

export { App }
