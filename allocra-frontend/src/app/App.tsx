import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RequireAuth, RequireGuest } from './routes'
import AppLayout from '@/components/layout/AppLayout'
import { ToastProvider } from '@/components/ui/Toast'

import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import Dashboard from '@/pages/Dashboard'
import Allocation from '@/pages/Allocation'
import Team from '@/pages/Team'
import Tasks from '@/pages/Tasks'
import Workspace from '@/pages/Workspace'
import Pricing from '@/pages/Pricing'
import Profile from '@/pages/Profile'
import About from '@/pages/About'
import Chat from '@/pages/Chat'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<RequireGuest />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard"  element={<Dashboard />} />
            <Route path="/allocation" element={<Allocation />} />
            <Route path="/team"       element={<Team />} />
            <Route path="/tasks"      element={<Tasks />} />
            <Route path="/workspace"  element={<Workspace />} />
            <Route path="/pricing"    element={<Pricing />} />
            <Route path="/profile"    element={<Profile />} />
            <Route path="/about"      element={<About />} />
            <Route path="/chat"       element={<Chat />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
