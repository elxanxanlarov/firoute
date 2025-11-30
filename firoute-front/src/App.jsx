import { Route, Routes } from 'react-router-dom'
import AdminPanel from './pages/AdminPanel'
import DashboardLayout from './components/dashboard-layout/DashboardLayout'
import { AdminSidebarData } from './data/sidebar-data/AdminSidebarData'
import Login from './pages/Login'
import PendingCustomerForm from './pages/PendingCustomerForm'
import Profile from './pages/Profile'
import Home from './pages/Home'
import WifiPassword from './pages/WifiPassword'
import WifiCheckBox from './pages/WifiCheckBox'
const App = () => {
  return (
    <Routes>
      <Route path="/admin/:slug" element={<DashboardLayout sidebarData={AdminSidebarData} title="Admin Panel"><AdminPanel /></DashboardLayout>}/>    
      <Route path="/reception/:slug" element={<DashboardLayout sidebarData={AdminSidebarData} title="Reception Panel"><AdminPanel /></DashboardLayout>}/>    
      <Route path="/dashboard/login" element={<Login />} />
      <Route path="/pending-customer-form" element={<PendingCustomerForm />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/wifi-password" element={<WifiPassword />} />
      <Route path="/wifi-checkbox" element={<WifiCheckBox />} />
      <Route path="/" element={<Home />} />
    </Routes>
  )
}

export default App