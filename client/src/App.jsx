import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateRequest from './pages/CreateRequest'
import EditRequest from './pages/EditRequest'
import AdminDashboard from './pages/AdminDashboard'

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

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/requests/new"
          element={
            <RequireAuth>
              <CreateRequest />
            </RequireAuth>
          }
        />

        <Route
          path="/requests/:id/edit"
          element={
            <RequireAuth>
              <EditRequest />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}
