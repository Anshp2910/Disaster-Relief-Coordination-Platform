import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
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
    </Layout>
  )
}
