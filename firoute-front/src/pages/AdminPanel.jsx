import { useParams } from "react-router-dom"
import Staff from "../components/admin-panel/Staff.jsx"
import Customers from "../components/admin-panel/Customers.jsx"
import Statistics from "../components/admin-panel/Statistics.jsx"
import PendingOperations from "../components/admin-panel/PendingOperations.jsx"
import RouterManagement from "../components/admin-panel/RouterManagement.jsx"
import PendingCustomers from "../components/admin-panel/PendingCustomers.jsx"
import ActivityLog from "../components/admin-panel/ActivityLog.jsx"
import StaffForm from "../components/admin-panel/ui/StaffForm.jsx"
import CustomerForm from "../components/admin-panel/ui/CustomerForm.jsx"
import RouterForm from "../components/admin-panel/ui/RouterForm.jsx"
import Profile from "./Profile.jsx"
import Settings from "../components/admin-panel/Settings.jsx"
import RolesManagement from "../components/admin-panel/RolesManagement.jsx"
import RolesForm from "../components/admin-panel/ui/RolesForm.jsx"
import RoomManagement from "../components/admin-panel/RoomManagement.jsx"
import RoomsForm from "../components/admin-panel/ui/RoomsForm.jsx"
import RadiusProfileManagement from "../components/admin-panel/RadiusProfileManagement.jsx"
import RadiusProfileForm from "../components/admin-panel/ui/RadiusProfileForm.jsx"
import ReservationForm from "../components/admin-panel/ui/ReservationForm.jsx"
import WifiCredentials from "../components/admin-panel/ui/WifiCredentials.jsx"
import InternetUsers from "../components/admin-panel/InternetUsers.jsx"
export default function AdminPanel() {
    const { slug } = useParams()
    
    return (
        <div>
            {slug === "staff" && <Staff />}
            {slug === "staff-form" && <StaffForm />}
            {slug === "customers" && <Customers />}
            {slug === "customer-form" && <CustomerForm />}
            {slug === "statistics" && <Statistics />}
            {slug === "pending-operations" && <PendingOperations />}
            {slug === "router-management" && <RouterManagement />}
            {slug === "router-form" && <RouterForm />}
            {slug === "pending-customers" && <PendingCustomers/>}
            {slug === "activity-log" && <ActivityLog />}
            {slug === "profile" && <Profile />}
            {slug === "internet-users" && <InternetUsers />}

            {/* Settings */}
            {slug === "settings" && <Settings />}   
            {slug === "roles-management" && <RolesManagement />}
            {slug === "roles-form" && <RolesForm />}
            {slug === "room-management" && <RoomManagement />}
            {slug === "rooms-form" && <RoomsForm />}
            {slug === "radius-profiles" && <RadiusProfileManagement />}
            {slug === "radius-profile-form" && <RadiusProfileForm />}
            {slug === "reservation-form" && <ReservationForm />}
            {slug === "wifi-credentials" && <WifiCredentials />}
            {/* End Settings */}
        </div>
    )
}
