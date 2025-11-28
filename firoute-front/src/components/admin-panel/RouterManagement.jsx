import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus, Wifi, WifiOff } from 'lucide-react';
import { routerAPI } from '../../api';

const statusOptions = ["active", "inactive", "maintenance"];
const networkInterfaceOptions = ["eth0", "eth1", "eth2", "wlan0", "wlan1"];

export default function RouterManagement() {
    const { t } = useTranslation('admin-panel');
    const navigate = useNavigate();
    const location = useLocation();
    const [routerData, setRouterData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch routers data
    useEffect(() => {
        const fetchRouters = async () => {
            setLoading(true);
            try {
                const response = await routerAPI.getAll();
                if (response.success && response.data) {
                    // Transform data for table
                    const transformedData = response.data.map(router => ({
                        id: router.id,
                        name: router.name,
                        ip: router.ip,
                        port: router.port,
                        username: router.username,
                        networkInterface: router.networkInterface || '-',
                        status: router.status || 'Active',
                        createdAt: router.createdAt,
                        ...router
                    }));
                    setRouterData(transformedData);
                } else {
                    setRouterData([]);
                }
            } catch (error) {
                console.error('Error fetching routers:', error);
                Alert.error('Xəta!', 'Router-ləri əldə etmək mümkün olmadı');
                setRouterData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRouters();
    }, []);

    const columns = [
        {
            key: 'name',
            label: t('router_name', 'Router adı'),
            render: (value, item) => (
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                        {value.charAt(value.length - 1)}
                    </div>
                    <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{value}</div>
                        <div className="text-sm text-gray-500">{item.ip}:{item.port}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'ip',
            label: t('ip_address', 'IP ünvanı'),
            render: (value) => (
                <span className="text-sm font-mono text-gray-900">
                    {value}
                </span>
            )
        },
        {
            key: 'port',
            label: t('port', 'Port'),
            render: (value) => (
                <span className="text-sm font-mono text-gray-900">
                    {value}
                </span>
            )
        },
        {
            key: 'username',
            label: t('username', 'İstifadəçi adı'),
            render: (value) => (
                <span className="text-sm font-medium text-gray-900">
                    {value}
                </span>
            )
        },
        {
            key: 'networkInterface',
            label: t('interface', 'Interface'),
            render: (value) => (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {value || '-'}
                </span>
            )
        },
        {
            key: 'status',
            label: t('status', 'Status'),
            render: (value) => {
                const statusConfig = {
                    'Active': { color: 'bg-green-100 text-green-800', icon: Wifi },
                    'Inactive': { color: 'bg-red-100 text-red-800', icon: WifiOff },
                    'Maintenance': { color: 'bg-yellow-100 text-yellow-800', icon: Wifi }
                };
                const config = statusConfig[value] || statusConfig['Inactive'];
                const Icon = config.icon;
                
                return (
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {t(value.toLowerCase())}
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

    const handleEdit = async (router) => {
        const isAdmin = location.pathname.includes('/admin');
        if (!isAdmin) return;
        const editPath = `/admin/router-form?id=${router.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (router) => {
        const result = await Alert.confirm(
            t('alert.delete_confirm'),
            `${t('delete_router_confirm', 'Bu routeri silmək istədiyinizə əminsiniz?')} ${router.name}?`,
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
                await routerAPI.delete(router.id.toString());
                setRouterData(prev => prev.filter(item => item.id !== router.id));
                Alert.close();
                Alert.success(t('alert.delete_success'), t('alert.delete_success_text'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error'), error.response?.data?.message || t('alert.error_text'));
            }
        }
    };

    const handleView = (router) => {
        Alert.info(
            `${t('router_name', 'Router adı')}: ${router.name}`,
            `${t('ip_address', 'IP ünvanı')}: ${router.ip}\n${t('port', 'Port')}: ${router.port}\n${t('username', 'İstifadəçi adı')}: ${router.username}\n${t('interface', 'Interface')}: ${router.networkInterface || '-'}\n${t('status', 'Status')}: ${t((router.status || 'Active').toLowerCase())}`
        );
    };

    const handleBulkDelete = async (selectedIds) => {
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
                await Promise.all(selectedIds.map(id => routerAPI.delete(id.toString())));
                setRouterData(prev => prev.filter(item => !selectedIds.includes(item.id)));
                Alert.close();
                Alert.success(t('alert.bulk_delete_success'), t('alert.bulk_delete_success_text'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error'), error.response?.data?.message || t('alert.error_text'));
            }
        }
    };

    const handleAddRouter = () => {
        const isAdmin = location.pathname.includes('/admin');
        const addRouterPath = isAdmin ? '/admin/router-form' : '/reception/router-form';
        navigate(addRouterPath);
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('router_management', 'Router İdarəetməsi')}</h1>
                    <p className="text-gray-600">{t('manage_routers', 'Routerləri yaradın və idarə edin')}</p>
                </div>
                <button
                    onClick={handleAddRouter}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('add_router', 'Router əlavə et')}
                </button>
            </div>

            <TableTemplate
                data={routerData}
                columns={columns}
                title={t('routers', 'Routerlər')}
                searchFields={['name', 'ip', 'username', 'networkInterface']}
                filterOptions={{
                    status: statusOptions.map(status => t(status)),
                    networkInterface: networkInterfaceOptions.map(iface => iface)
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
                    icon: 'wifi',
                    title: t('no_routers_found', 'Router tapılmadı'),
                    description: t('no_routers_description', 'Hələlik göstəriləcək router yoxdur.'),
                    actionText: t('add_first_router', 'İlk routeri əlavə et'),
                    onAction: handleAddRouter,
                    showAction: true
                }}
            />
        </div>
    );
}
