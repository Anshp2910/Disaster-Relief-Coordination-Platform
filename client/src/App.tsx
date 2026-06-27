import { Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './context/AuthContext'
import { retryLazy } from './utils/retryLazy'

const Login = retryLazy(() => import('./pages/Login'))
const Register = retryLazy(() => import('./pages/Register'))
const ForgotPassword = retryLazy(() => import('./pages/ForgotPassword'))
const ResetPassword = retryLazy(() => import('./pages/ResetPassword'))
const Dashboard = retryLazy(() => import('./pages/Dashboard'))
const CreateRequest = retryLazy(() => import('./pages/CreateRequest'))
const EditRequest = retryLazy(() => import('./pages/EditRequest'))
const RequestDetail = retryLazy(() => import('./pages/RequestDetail'))
const Profile = retryLazy(() => import('./pages/Profile'))
const Resources = retryLazy(() => import('./pages/Resources'))
const ZoneHeatMap = retryLazy(() => import('./pages/ZoneHeatMap'))
const AdminDashboard = retryLazy(() => import('./pages/AdminDashboard'))
const Incidents = retryLazy(() => import('./pages/Incidents'))
const Schedules = retryLazy(() => import('./pages/Schedules'))
const BulkImport = retryLazy(() => import('./pages/BulkImport'))
const Escalation = retryLazy(() => import('./pages/Escalation'))
const Geofencing = retryLazy(() => import('./pages/Geofencing'))
const MapOverview = retryLazy(() => import('./pages/MapOverview'))
const PublicStatus = retryLazy(() => import('./pages/PublicStatus'))
const NotFound = retryLazy(() => import('./pages/NotFound'))
const EmergencyCommandCenter = retryLazy(() => import('./pages/EmergencyCommandCenter'))

function PageLoader() {
  return (
    <div className="flex-center min-h-60vh gap-12">
      <div className="loading-spinner" />
      <span className="text-14 text-muted">Loading...</span>
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  return (
    <Routes>
      {/* Standalone routes (no Layout — full-screen pages) */}
      <Route path="/command-center" element={<Layout><EmergencyCommandCenter /></Layout>} />
      <Route path="/login" element={<Layout><Login /></Layout>} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Standard routes with Layout (header + footer) */}
      <Route path="/*" element={
        <Layout>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </Layout>
      } />
    </Routes>
  )
}

export { App }
