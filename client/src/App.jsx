import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CreateRequest = lazy(() => import('./pages/CreateRequest'))
const EditRequest = lazy(() => import('./pages/EditRequest'))
const RequestDetail = lazy(() => import('./pages/RequestDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Resources = lazy(() => import('./pages/Resources'))
const ZoneHeatMap = lazy(() => import('./pages/ZoneHeatMap'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Incidents = lazy(() => import('./pages/Incidents'))
const Schedules = lazy(() => import('./pages/Schedules'))
const BulkImport = lazy(() => import('./pages/BulkImport'))
const Escalation = lazy(() => import('./pages/Escalation'))
const Geofencing = lazy(() => import('./pages/Geofencing'))
const MapOverview = lazy(() => import('./pages/MapOverview'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
      <div style={{ width: 24, height: 24, border: '3px solid #ccc', borderTopColor: '#000080', borderRadius: '50%', animation: 'admin-spin 0.7s linear infinite' }} />
      <span style={{ color: '#666', fontSize: 14 }}>Loading...</span>
    </div>
  )
}

function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />
  } catch {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
          <Route path="/bulk" element={<RequireAuth><BulkImport /></RequireAuth>} />
          <Route path="/escalation" element={<RequireAdmin><Escalation /></RequireAdmin>} />
          <Route path="/geofencing" element={<RequireAuth><Geofencing /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
