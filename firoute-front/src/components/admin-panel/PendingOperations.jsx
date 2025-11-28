import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Alert from '../ui/Alert';
import { RefreshCw, Trash2, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import TableTemplate from '../../components/ui/TableTamplate';
const examplePendingData = [
    {
        id: 1,
        operation: "Router yaratmaq",
        customerName: "Ahmed Aliyev",
        customerEmail: "ahmed.aliyev@example.com",
        routerName: "Router-006",
        status: "Pending",
        createdAt: "2024-01-15T10:30:00Z",
        errorMessage: "Router konfiqurasiyası yüklənmədi",
        retryCount: 2,
        priority: "High"
    },
    {
        id: 2,
        operation: "Router yeniləmək",
        customerName: "Leyla Məmmədova",
        customerEmail: "leyla.mammadova@example.com",
        routerName: "Router-002",
        status: "Failed",
        createdAt: "2024-01-15T09:15:00Z",
        errorMessage: "Şəbəkə bağlantısı kəsildi",
        retryCount: 3,
        priority: "Medium"
    },
    {
        id: 3,
        operation: "Router silmək",
        customerName: "Rəşad Həsənov",
        customerEmail: "rashad.hasanov@example.com",
        routerName: "Router-003",
        status: "Pending",
        createdAt: "2024-01-15T08:45:00Z",
        errorMessage: "Router aktiv bağlantıları var",
        retryCount: 1,
        priority: "Low"
    },
    {
        id: 4,
        operation: "Router yaratmaq",
        customerName: "Günel Əliyeva",
        customerEmail: "gunel.aliyeva@example.com",
        routerName: "Router-007",
        status: "Failed",
        createdAt: "2024-01-14T16:20:00Z",
        errorMessage: "Yetersiz sistem resursları",
        retryCount: 4,
        priority: "High"
    },
    {
        id: 5,
        operation: "Router konfiqurasiyası",
        customerName: "Elvin Quliyev",
        customerEmail: "elvin.guliyev@example.com",
        routerName: "Router-005",
        status: "Pending",
        createdAt: "2024-01-14T14:10:00Z",
        errorMessage: "Konfiqurasiya faylı tapılmadı",
        retryCount: 0,
        priority: "Medium"
    }
];

const statusOptions = ["pending", "failed"];
const priorityOptions = ["high", "medium", "low"];

export default function PendingOperations() {
    const { t } = useTranslation('admin-panel');
    const [pendingData, setPendingData] = useState(examplePendingData);
    const [loading] = useState(false);

    const columns = [
        {
            key: 'operation',
            label: t('operation', 'Əməliyyat'),
            render: (value, item) => (
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
                        {item.operation.charAt(0)}
                    </div>
                    <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{value}</div>
                        <div className="text-sm text-gray-500">{item.routerName}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'customerName',
            label: t('customer', 'Müştəri'),
            render: (value, item) => (
                <div>
                    <div className="text-sm font-medium text-gray-900">{value}</div>
                    <div className="text-sm text-gray-500">{item.customerEmail}</div>
                </div>
            )
        },
        {
            key: 'status',
            label: t('status', 'Status'),
            render: (value) => {
                const statusConfig = {
                    'Pending': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
                    'Failed': { color: 'bg-red-100 text-red-800', icon: XCircle }
                };
                const config = statusConfig[value] || statusConfig['Pending'];
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
            key: 'priority',
            label: t('priority', 'Prioritet'),
            render: (value) => {
                const priorityConfig = {
                    'High': 'bg-red-100 text-red-800',
                    'Medium': 'bg-yellow-100 text-yellow-800',
                    'Low': 'bg-green-100 text-green-800'
                };
                
                return (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityConfig[value] || priorityConfig['Low']}`}>
                        {t(value.toLowerCase())}
                    </span>
                );
            }
        },
        {
            key: 'retryCount',
            label: t('retry_count', 'Yenidən cəhd sayı'),
            render: (value) => (
                <span className="text-sm font-medium text-gray-900">
                    {value}/5
                </span>
            )
        },
        {
            key: 'createdAt',
            label: t('created', 'Yaradılıb'),
            render: (value) => new Date(value).toLocaleString()
        }
    ];

    const handleRetry = async () => {
        try {
            Alert.loading(t('retrying_operation', 'Əməliyyat yenidən cəhd edilir...'));
            // TODO: Real API call here
            Alert.close();
            Alert.success(t('retry_success', 'Uğurla yenidən cəhd edildi!'), t('retry_success_text', 'Əməliyyat yenidən cəhd edildi.'));
        } catch {
            Alert.close();
            Alert.error(t('alert.error'), t('alert.error_text'));
        }
    };

    const handleDelete = async (operation) => {
        const result = await Alert.confirm(
            t('alert.delete_confirm'),
            `${t('delete_operation_confirm', 'Bu əməliyyatı silmək istədiyinizə əminsiniz?')} ${operation.operation}?`,
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
                // TODO: Real API call here
                setPendingData(prev => prev.filter(item => item.id !== operation.id));
                Alert.close();
                Alert.success(t('alert.delete_success'), t('alert.delete_success_text'));
            } catch {
                Alert.close();
                Alert.error(t('alert.error'), t('alert.error_text'));
            }
        }
    };

    const handleView = (operation) => {
        Alert.info(
            `${t('operation', 'Əməliyyat')}: ${operation.operation}`,
            `${t('customer', 'Müştəri')}: ${operation.customerName}\n${t('email', 'Email')}: ${operation.customerEmail}\n${t('router_name', 'Router adı')}: ${operation.routerName}\n${t('status', 'Status')}: ${t(operation.status.toLowerCase())}\n${t('priority', 'Prioritet')}: ${t(operation.priority.toLowerCase())}\n${t('retry_count', 'Yenidən cəhd sayı')}: ${operation.retryCount}/5\n${t('error_message', 'Xəta mesajı')}: ${operation.errorMessage}`
        );
    };

    const handleBulkRetry = async (selectedIds) => {
        const result = await Alert.confirm(
            t('bulk_retry_confirm', 'Seçilmiş əməliyyatları yenidən cəhd etmək istədiyinizə əminsiniz?'),
            `${t('bulk_retry_confirm_text', 'Bu əməliyyatlar yenidən cəhd ediləcək')} ${selectedIds.length} ${t('items_selected', 'element seçilib')}?`,
            {
                confirmText: t('alert.yes'),
                cancelText: t('alert.no'),
                confirmColor: '#10B981',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('retrying_operations', 'Əməliyyatlar yenidən cəhd edilir...'));
                // TODO: Real API call here
                Alert.close();
                Alert.success(t('bulk_retry_success', 'Uğurla yenidən cəhd edildi!'), t('bulk_retry_success_text', 'Seçilmiş əməliyyatlar yenidən cəhd edildi.'));
            } catch {
                Alert.close();
                Alert.error(t('alert.error'), t('alert.error_text'));
            }
        }
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
                // TODO: Real API call here
                setPendingData(prev => prev.filter(item => !selectedIds.includes(item.id)));
                Alert.close();
                Alert.success(t('alert.bulk_delete_success'), t('alert.bulk_delete_success_text'));
            } catch {
                Alert.close();
                Alert.error(t('alert.error'), t('alert.error_text'));
            }
        }
    };

    const handleRefresh = async () => {
        try {
            Alert.loading(t('refreshing', 'Yenilənir...'));
            // TODO: Real API call here
            Alert.close();
            Alert.success(t('refresh_success', 'Uğurla yeniləndi!'), t('refresh_success_text', 'Gözləyən əməliyyatlar yeniləndi.'));
        } catch {
            Alert.close();
            Alert.error(t('alert.error'), t('alert.error_text'));
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('pending_operations', 'Gözləyən Əməliyyatlar')}</h1>
                    <p className="text-gray-600">{t('manage_pending_operations', 'Gözləyən və uğursuz əməliyyatları idarə edin')}</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    {t('refresh', 'Yenilə')}
                </button>
            </div>

            <TableTemplate
                data={pendingData}
                columns={columns}
                title={t('pending_operations_list', 'Gözləyən Əməliyyatlar Siyahısı')}
                searchFields={['operation', 'customerName', 'customerEmail', 'routerName', 'errorMessage']}
                filterOptions={{
                    status: statusOptions.map(status => t(status)),
                    priority: priorityOptions.map(priority => t(priority))
                }}
                onEdit={handleRetry}
                onDelete={handleDelete}
                onView={handleView}
                onBulkDelete={handleBulkDelete}
                showBulkActions={true}
                showFilters={true}
                showSearch={true}
                showDateFilter={true}
                loading={loading}
                emptyState={{
                    icon: 'check-circle',
                    title: t('no_pending_operations', 'Gözləyən əməliyyat yoxdur'),
                    description: t('no_pending_operations_description', 'Hələlik gözləyən və ya uğursuz əməliyyat yoxdur.'),
                    showAction: false
                }}
                customActions={[
                    {
                        key: 'retry',
                        label: t('retry', 'Yenidən cəhd et'),
                        icon: RefreshCw,
                        onClick: handleRetry,
                        className: 'text-green-600 hover:text-green-700'
                    }
                ]}
                bulkActions={[
                    {
                        key: 'bulk_retry',
                        label: t('bulk_retry', 'Seçilmişləri yenidən cəhd et'),
                        icon: RefreshCw,
                        onClick: handleBulkRetry,
                        className: 'text-green-600 hover:text-green-700'
                    }
                ]}
            />
        </div>
    );
}
