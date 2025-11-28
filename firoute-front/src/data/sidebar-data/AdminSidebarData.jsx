import { MdPeople , MdPerson, MdBarChart, MdPersonAdd, MdAccessTime, MdSettings, MdLocalHospital, MdPeopleAlt} from 'react-icons/md'
export const AdminSidebarData = [
  {
    title: 'staff_management',
    path: '/admin/staff',
    icon: <MdPeople />,
  },
  {
    title: 'customer_management',
    path: '/admin/customers',
    icon: <MdPerson />,
  },
  {
    title: 'pending_customers',
    path: '/admin/pending-customers',
    icon: <MdPersonAdd />,
  },
  {
    title: 'activity_log',
    path: '/admin/activity-log',
    icon: <MdAccessTime />,
  },
  {
    title: 'statistics',
    path: '/admin/statistics',
    icon: <MdBarChart />,
  },
  {
    title: 'settings',
    path: '/admin/settings',
    icon: <MdSettings />,
  },
  
  
]