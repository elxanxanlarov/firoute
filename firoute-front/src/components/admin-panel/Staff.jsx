import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, UserPlus } from 'lucide-react';
import { getStaffColumns } from '../../data/table-columns/StaffColumns';
import { userAPI, authApi } from '../../api';

export default function Staff({ isReception = false }) {
    const { t } = useTranslation('admin-panel');
    const navigate = useNavigate();
    const location = useLocation();
    const [staffData, setStaffData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    const columns = getStaffColumns(t);

    // Fetch staff data
    useEffect(() => {
        const fetchStaff = async () => {
            setLoading(true);
            try {
                const response = await userAPI.getAll();
                console.log('Staff API Response:', response);
                
                if (response.success && response.data) {
                    // Transform data for table - heç bir filter yox, bütün user-ləri göstər
                    const transformedData = response.data.map(user => ({
                        id: user.id,
                        name: `${user.firstName} ${user.lastName}`,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        phone: user.phone || '-',
                        role: user.role, // Keep role object for columns
                        status: user.isActive ? 'Active' : 'Inactive',
                        createdAt: user.createdAt,
                        lastLogin: user.lastLogin || user.createdAt,
                        isActive: user.isActive,
                        // Include all other fields
                        ...user
                    }));
                    
                    console.log('Transformed Staff Data:', transformedData);
                    setStaffData(transformedData);
                } else {
                    console.warn('No data in response:', response);
                    setStaffData([]);
                }
            } catch (error) {
                console.error('Error fetching staff:', error);
                Alert.error('Xəta!', 'İşçiləri əldə etmək mümkün olmadı');
                setStaffData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchStaff();
    }, []);

    // Fetch current user info
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await authApi.me();
                if (response.success && response.data) {
                    setCurrentUser(response.data);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, []);

    const getRoleName = (role) => {
        if (!role) return '';
        if (typeof role === 'string') return role;
        return role.name || '';
    };

    const currentUserRole = getRoleName(currentUser?.role);
    const isCurrentSuperadmin = currentUserRole.toLowerCase() === 'superadmin';

    const isTargetSuperadmin = (staff) => {
        const roleName = getRoleName(staff.role);
        return roleName.toLowerCase() === 'superadmin';
    };

    const handleEdit = async (staff) => {
        if (isTargetSuperadmin(staff) && !isCurrentSuperadmin) {
            Alert.error('Xəta!', 'Superadmin yalnız Superadmin tərəfindən redaktə edilə bilər');
            return;
        }
        
        // Navigate to edit page with query parameter (only for admin)
        const isAdmin = location.pathname.includes('/admin');
        if (!isAdmin) return; // Reception can't edit staff
        const editPath = `/admin/staff-form?id=${staff.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (staff) => {
        if (isTargetSuperadmin(staff) && !isCurrentSuperadmin) {
            Alert.error('Xəta!', 'Superadmin yalnız Superadmin tərəfindən idarə oluna bilər');
            return;
        }
        
        const result = await Alert.confirm(
            t('alert.delete_confirm'),
            `${t('alert.delete_confirm_text')} ${staff.name || `${staff.firstName} ${staff.lastName}`}?`,
            {
                confirmText: t('alert.yes'),
                cancelText: t('alert.no'),
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading'));
                
                await userAPI.delete(staff.id.toString());
                
                setStaffData(prev => prev.filter(item => item.id !== staff.id));
                
                Alert.close();
                Alert.success(t('alert.delete_success'), t('alert.delete_success_text'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error'), error.response?.data?.message || t('alert.error_text'));
            }
        }
    };

    const handleView = (staff) => {
        const roleName = staff.role?.name || staff.role || '';
        if (roleName.toLowerCase() === 'superadmin' && !isCurrentSuperadmin) {
            Alert.error('Xəta!', 'Superadmin məlumatları yalnız Superadmin tərəfindən görüntülənə bilər');
            return;
        }
        
        const statusName = staff.isActive !== undefined 
            ? (staff.isActive ? 'Active' : 'Inactive')
            : (staff.status || 'Active');
        
        Alert.info(
            `${t('name')}: ${staff.name || `${staff.firstName} ${staff.lastName}`}`,
            `${t('email')}: ${staff.email}\n${t('phone')}: ${staff.phone || '-'}\n${t('role')}: ${roleName}\n${t('status')}: ${statusName}\n${staff.position ? `${t('position')}: ${staff.position}\n` : ''}${staff.department ? `${t('department')}: ${staff.department}` : ''}`
        );
    };

    const handleBulkDelete = async (selectedIds) => {
        // Superadmin-i seçilmişlərdən yoxla
        if (!isCurrentSuperadmin) {
            const selectedStaff = staffData.filter(item => selectedIds.includes(item.id));
            const hasSuperadmin = selectedStaff.some(staff => isTargetSuperadmin(staff));
            
            if (hasSuperadmin) {
                Alert.error('Xəta!', 'Superadmin silinə bilməz. Zəhmət olmasa seçimdən çıxarın.');
                return;
            }
        }

        if (selectedIds.length === 0) {
            Alert.error('Xəta!', 'Zəhmət olmasa ən azı bir işçi seçin');
            return;
        }
        
        const result = await Alert.confirm(
            t('alert.bulk_delete_confirm'),
            `${t('alert.bulk_delete_confirm_text')} ${selectedIds.length} ${t('items_selected')}?`,
            {
                confirmText: t('alert.yes'),
                cancelText: t('alert.no'),
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading'));
                
                const idsToDelete = isCurrentSuperadmin
                    ? selectedIds
                    : selectedIds.filter(id => {
                        const staff = staffData.find(s => s.id === id);
                        return staff && !isTargetSuperadmin(staff);
                    });
                
                await Promise.all(idsToDelete.map(id => userAPI.delete(id.toString())));
                
                setStaffData(prev => prev.filter(item => !selectedIds.includes(item.id)));
                
                Alert.close();
                Alert.success(t('alert.bulk_delete_success'), t('alert.bulk_delete_success_text'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error'), error.response?.data?.message || t('alert.error_text'));
            }
        }
    };

    const handleAddStaff = () => {
        // Navigate to staff form without query parameter (add mode)
        const isAdmin = location.pathname.includes('/admin');
        const addStaffPath = isAdmin ? '/admin/staff-form' : '/reception/staff-form';
        navigate(addStaffPath);
    };


    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('staff_management')}</h1>
                    <p className="text-gray-600">{t('manage_team')}</p>
                </div>
                {!isReception && (
                    <button
                        onClick={handleAddStaff}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        {t('add_staff')}
                    </button>
                )}
            </div>

            <TableTemplate
                data={staffData}
                columns={columns}
                title={t('staff_members')}
                searchFields={['name', 'email', 'phone', 'firstName', 'lastName']}
                onEdit={isReception ? undefined : handleEdit}
                onDelete={isReception ? undefined : handleDelete}
                onView={handleView}
                onBulkDelete={isReception ? undefined : handleBulkDelete}
                showBulkActions={!isReception}
                showFilters={false}
                showSearch={true}
                showDateFilter={false}
                loading={loading}
                emptyState={{
                    icon: 'users',
                    title: t('no_staff_found'),
                    description: t('no_staff_description'),
                    actionText: t('add_first_staff'),
                    onAction: handleAddStaff,
                    showAction: !isReception
                }}
            />
        </div>
    );
}