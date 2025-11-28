import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus, Shield, ShieldOff, ArrowLeft } from 'lucide-react';
import { roleAPI, authApi } from '../../api';

export default function RolesManagement() {
    const { t } = useTranslation('admin-panel');
    const navigate = useNavigate();
    const location = useLocation();
    const [rolesData, setRolesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    // Fetch roles data
    useEffect(() => {
        const fetchRoles = async () => {
            setLoading(true);
            try {
                const response = await roleAPI.getAll();
                if (response.success && response.data) {
                    const transformedData = response.data.map(role => ({
                        id: role.id,
                        name: role.name,
                        description: role.description || '-',
                        status: role.isActive ? 'Active' : 'Inactive',
                        isCore: role.isCore || false,
                        createdAt: role.createdAt,
                        ...role
                    }));
                    setRolesData(transformedData);
                } else {
                    setRolesData([]);
                }
            } catch (error) {
                console.error('Error fetching roles:', error);
                Alert.error('Xəta!', 'Rolları əldə etmək mümkün olmadı');
                setRolesData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRoles();
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

    const isCoreRole = (role) => {
        return role.isCore === true || role.name?.toLowerCase() === 'superadmin';
    };

    const columns = [
        {
            key: 'name',
            label: t('role_name', 'Rol adı'),
            render: (value, item) => (
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {value?.charAt(0)?.toUpperCase() || 'R'}
                    </div>
                    <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{value}</div>
                        {item.isCore && (
                            <div className="text-xs text-purple-600 font-medium">Əsas Rol</div>
                        )}
                    </div>
                </div>
            )
        },
        {
            key: 'description',
            label: t('description', 'Təsvir'),
            render: (value) => (
                <span className="text-sm text-gray-600 max-w-md truncate block">
                    {value || '-'}
                </span>
            )
        },
        {
            key: 'status',
            label: t('status', 'Status'),
            render: (value, item) => {
                const isActive = item.isActive !== undefined ? item.isActive : (value === 'Active');
                const Icon = isActive ? Shield : ShieldOff;
                return (
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {isActive ? 'Aktiv' : 'Deaktiv'}
                    </span>
                );
            }
        },
        {
            key: 'createdAt',
            label: t('created', 'Yaradılıb'),
            render: (value) => value ? new Date(value).toLocaleDateString('az-AZ') : '-'
        }
    ];

    const handleEdit = async (role) => {
        if (isCoreRole(role) && !isCurrentSuperadmin) {
            Alert.error('Xəta!', 'Core rollar yalnız Superadmin tərəfindən redaktə edilə bilər');
            return;
        }
        
        const isAdmin = location.pathname.includes('/admin');
        if (!isAdmin) return;
        const editPath = `/admin/roles-form?id=${role.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (role) => {
        if (isCoreRole(role)) {
            Alert.error('Xəta!', 'Core rollar silinə bilməz');
            return;
        }

        const result = await Alert.confirm(
            t('alert.delete_confirm'),
            `${t('delete_role_confirm', 'Bu rolu silmək istədiyinizə əminsiniz?')} ${role.name}?`,
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
                await roleAPI.delete(role.id.toString());
                setRolesData(prev => prev.filter(item => item.id !== role.id));
                Alert.close();
                Alert.success(t('alert.delete_success'), t('alert.delete_success_text'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error'), error.response?.data?.message || t('alert.error_text'));
            }
        }
    };

    const handleView = (role) => {
        Alert.info(
            `${t('role_name', 'Rol adı')}: ${role.name}`,
            `${t('description', 'Təsvir')}: ${role.description || '-'}\n${t('status', 'Status')}: ${role.isActive ? 'Aktiv' : 'Deaktiv'}\nƏsas Rol: ${role.isCore ? 'Bəli' : 'Xeyr'}\n${t('created', 'Yaradılıb')}: ${role.createdAt ? new Date(role.createdAt).toLocaleString('az-AZ') : '-'}`
        );
    };

    // Toggle status handler - can be used later if needed
    // const handleToggleStatus = async (role) => {
    //     if (isCoreRole(role) && !isCurrentSuperadmin) {
    //         Alert.error('Xəta!', 'Core rolların statusu yalnız Superadmin tərəfindən dəyişdirilə bilər');
    //         return;
    //     }

    //     try {
    //         Alert.loading(t('loading'));
    //         const response = await roleAPI.toggleStatus(role.id.toString());
    //         if (response.success && response.data) {
    //             setRolesData(prev => prev.map(item => 
    //                 item.id === role.id 
    //                     ? { ...item, isActive: response.data.isActive, status: response.data.isActive ? 'Active' : 'Inactive' }
    //                     : item
    //             ));
    //             Alert.close();
    //             Alert.success('Uğurlu', 'Rol statusu dəyişdirildi');
    //         } else {
    //             Alert.close();
    //             Alert.error(t('alert.error'), response.message || t('alert.error_text'));
    //         }
    //     } catch (error) {
    //         Alert.close();
    //         Alert.error(t('alert.error'), error.response?.data?.message || t('alert.error_text'));
    //     }
    // };

    const handleBulkDelete = async (selectedIds) => {
        // Check if any selected role is core
        const selectedRoles = rolesData.filter(item => selectedIds.includes(item.id));
        const hasCoreRole = selectedRoles.some(role => isCoreRole(role));
        
        if (hasCoreRole) {
            Alert.error('Xəta!', 'Core rollar silinə bilməz. Zəhmət olmasa seçimdən çıxarın.');
            return;
        }

        if (selectedIds.length === 0) {
            Alert.error('Xəta!', 'Zəhmət olmasa ən azı bir rol seçin');
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
                const idsToDelete = selectedIds.filter(id => {
                    const role = rolesData.find(r => r.id === id);
                    return role && !isCoreRole(role);
                });
                
                await Promise.all(idsToDelete.map(id => roleAPI.delete(id.toString())));
                setRolesData(prev => prev.filter(item => !selectedIds.includes(item.id)));
                Alert.close();
                Alert.success(t('alert.bulk_delete_success'), t('alert.bulk_delete_success_text'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error'), error.response?.data?.message || t('alert.error_text'));
            }
        }
    };

    const handleAddRole = () => {
        const isAdmin = location.pathname.includes('/admin');
        const addRolePath = isAdmin ? '/admin/roles-form' : '/reception/roles-form';
        navigate(addRolePath);
    };

    const handleBack = () => {
        const isAdmin = location.pathname.includes('/admin');
        navigate(isAdmin ? '/admin/settings' : '/reception/settings');
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('roles_management', 'Rolların İdarəetməsi')}</h1>
                        <p className="text-gray-600">{t('manage_roles', 'Rolları yaradın və idarə edin')}</p>
                    </div>
                </div>
                <button
                    onClick={handleAddRole}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('add_role', 'Rol əlavə et')}
                </button>
            </div>

            <TableTemplate
                data={rolesData}
                columns={columns}
                title={t('roles', 'Rollar')}
                searchFields={['name', 'description']}
                filterOptions={{
                    status: ['Active', 'Inactive']
                }}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onBulkDelete={handleBulkDelete}
                showBulkActions={true}
                showFilters={true}
                showSearch={true}
                showDateFilter={true}
                loading={loading}
                emptyState={{
                    icon: 'shield',
                    title: t('no_roles_found', 'Rol tapılmadı'),
                    description: t('no_roles_description', 'Hələlik göstəriləcək rol yoxdur.'),
                    actionText: t('add_first_role', 'İlk rolu əlavə et'),
                    onAction: handleAddRole,
                    showAction: true
                }}
            />
        </div>
    );
}