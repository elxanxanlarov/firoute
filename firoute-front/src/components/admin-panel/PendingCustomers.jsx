import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../../components/ui/TableTamplate';
import Alert from '../../components/ui/Alert';
import { pendingCustomerAPI } from '../../api';
import { 
    Clock, 
    XCircle, 
    CheckCircle, 
    Eye, 
    Trash2, 
    UserPlus,
    Mail,
    Phone,
    MapPin
} from 'lucide-react';

const statusOptions = ["pending", "approved", "rejected"];

export default function PendingCustomers() {
    const { t } = useTranslation('admin-panel');
    const navigate = useNavigate();
    const location = useLocation();
    const [pendingCustomersData, setPendingCustomersData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch pending customers data
    useEffect(() => {
        const fetchPendingCustomers = async () => {
            setLoading(true);
            try {
                const response = await pendingCustomerAPI.getAll();
                if (response.success && response.data) {
                    const transformedData = response.data.map(pending => ({
                        id: pending.id,
                        name: `${pending.firstName} ${pending.lastName}`,
                        firstName: pending.firstName,
                        lastName: pending.lastName,
                        email: pending.email || '-',
                        phone: pending.phone || '-',
                        activityStartDate: pending.activityStartDate,
                        activityEndDate: pending.activityEndDate,
                        maxConnections: pending.maxConnections || '-',
                        status: pending.status || 'pending',
                        notes: pending.notes || '-',
                        createdAt: pending.createdAt,
                        ...pending
                    }));
                    setPendingCustomersData(transformedData);
                } else {
                    setPendingCustomersData([]);
                }
            } catch (error) {
                console.error('Error fetching pending customers:', error);
                Alert.error('Xəta!', 'Pending customer-ləri əldə etmək mümkün olmadı');
                setPendingCustomersData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPendingCustomers();
    }, []);

    const columns = [
        {
            key: 'name',
            label: t('customer_name', 'Müştəri adı'),
            render: (value, row) => (
                <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserPlus className="w-4 h-4 text-blue-600" />
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-900">{value}</div>
                        <div className="text-sm text-gray-500">{row.email}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'phone',
            label: t('phone', 'Telefon'),
            render: (value) => (
                <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{value}</span>
                </div>
            )
        },
        {
            key: 'status',
            label: t('status', 'Status'),
            render: (value) => {
                const statusConfig = {
                    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
                    approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
                    rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
                    in_progress: { color: 'bg-blue-100 text-blue-800', icon: Clock },
                    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
                };
                const config = statusConfig[value] || statusConfig.pending;
                const Icon = config.icon;
                return (
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {t(value, value)}
                    </span>
                );
            }
        },
        {
            key: 'createdAt',
            label: t('request_date', 'Tələb tarixi'),
            render: (value) => {
                if (!value) return '-';
                try {
                    const date = new Date(value);
                    if (isNaN(date.getTime())) return '-';
                    return (
                        <div className="text-sm text-gray-900">
                            <div>{date.toLocaleDateString('az-AZ', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            })}</div>
                            <div className="text-xs text-gray-500">
                                {date.toLocaleTimeString('az-AZ', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </div>
                        </div>
                    );
                } catch {
                    return '-';
                }
            }
        },
        {
            key: 'actions',
            label: t('actions', 'Əməliyyatlar'),
            render: (_, row) => {
                // If status is approved or rejected, show status text instead of button
                if (row.status === 'approved') {
                    return (
                        <div className="flex items-center justify-center">
                            <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-md">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Təsdiq olundu
                            </span>
                        </div>
                    );
                }
                
                if (row.status === 'rejected') {
                    return (
                        <div className="flex items-center justify-center">
                            <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-md">
                                <XCircle className="w-4 h-4 mr-1" />
                                Rədd edildi
                            </span>
                        </div>
                    );
                }
                
                // If status is pending, show approve button
                return (
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => handleApprove(row)}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                            title={t('approve', 'Təsdiq et')}
                        >
                            {t('approve', 'Təsdiq et')}
                        </button>
                    </div>
                );
            }
        }
    ];

    const handleApprove = async (customer) => {
        // Navigate to customer form with pending customer id
        navigate(`/admin/customer-form?id=${customer.id}&pending=true`);
    };

    const handleView = (customer) => {
        const formatDate = (dateString) => {
            if (!dateString) return '-';
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return '-';
                return date.toLocaleString('az-AZ', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch {
                return '-';
            }
        };
        
        Alert.info(
            `${t('customer_name', 'Müştəri adı')}: ${customer.name}`,
            `${t('email', 'Email')}: ${customer.email || '-'}\n${t('phone', 'Telefon')}: ${customer.phone || '-'}\n${t('activity_start_date', 'Aktivlik Başlanğıc Tarixi')}: ${formatDate(customer.activityStartDate)}\n${t('activity_end_date', 'Aktivlik Bitiş Tarixi')}: ${formatDate(customer.activityEndDate)}\n${t('max_connections', 'Maksimum Giriş')}: ${customer.maxConnections || '-'}\n${t('status', 'Status')}: ${t(customer.status)}\n${t('notes', 'Qeydlər')}: ${customer.notes || '-'}`
        );
    };

    const handleDelete = async (customer) => {
        const result = await Alert.confirm(
            t('delete_customer_confirm', 'Müştəri tələbini silmək istəyirsiniz?'),
            `${customer.name}`
        );
        
        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading'));
                
                await pendingCustomerAPI.delete(customer.id);
                
                setPendingCustomersData(prev => 
                    prev.filter(item => item.id !== customer.id)
                );
                
                Alert.close();
                Alert.success(
                    t('delete_success', 'Silindi!'),
                    t('delete_success_text', 'Müştəri tələbi uğurla silindi.')
                );
            } catch (error) {
                console.error('Delete error:', error);
                Alert.close();
                Alert.error(
                    t('delete_error', 'Xəta!'),
                    error.response?.data?.message || t('delete_error_text', 'Müştəri tələbi silinə bilmədi.')
                );
            }
        }
    };

    const handleBulkApprove = async (selectedIds) => {
        const result = await Alert.confirm(
            t('bulk_approve_confirm', 'Seçilmiş tələbləri təsdiq etmək istəyirsiniz?'),
            `${t('bulk_approve_confirm_text', 'Seçilmiş')} ${selectedIds.length} ${t('items_selected', 'element təsdiq ediləcək')}?`
        );
        
        if (result.isConfirmed) {
            try {
                Alert.loading(t('bulk_approving', 'Təsdiq edilir...'));
                
                // Bulk approve - hər biri üçün API çağırışı
                const approvePromises = selectedIds.map(id => 
                    pendingCustomerAPI.updateStatus(id, 'approved')
                );
                
                await Promise.all(approvePromises);
                
                setPendingCustomersData(prev => 
                    prev.map(item => 
                        selectedIds.includes(item.id) 
                            ? { ...item, status: 'approved' }
                            : item
                    )
                );
                
                Alert.close();
                Alert.success(
                    t('bulk_approve_success', 'Təsdiq edildi!'),
                    t('bulk_approve_success_text', 'Seçilmiş tələblər uğurla təsdiq edildi.')
                );
            } catch (error) {
                console.error('Bulk approve error:', error);
                Alert.close();
                Alert.error(
                    t('bulk_approve_error', 'Xəta!'),
                    error.response?.data?.message || t('bulk_approve_error_text', 'Tələblər təsdiq edilə bilmədi.')
                );
            }
        }
    };

    const handleBulkDelete = async (selectedIds) => {
        const result = await Alert.confirm(
            t('alert.bulk_delete_confirm'),
            `${t('alert.bulk_delete_confirm_text')} ${selectedIds.length} ${t('items_selected')}?`
        );
        
        if (result.isConfirmed) {
            try {
                Alert.loading(t('bulk_deleting', 'Silinir...'));
                
                // Bulk delete - hər biri üçün API çağırışı
                const deletePromises = selectedIds.map(id => 
                    pendingCustomerAPI.delete(id)
                );
                
                await Promise.all(deletePromises);
                
                setPendingCustomersData(prev => 
                    prev.filter(item => !selectedIds.includes(item.id))
                );
                
                Alert.close();
                Alert.success(
                    t('alert.bulk_delete_success'),
                    t('alert.bulk_delete_success_text')
                );
            } catch (error) {
                console.error('Bulk delete error:', error);
                Alert.close();
                Alert.error(
                    t('alert.bulk_delete_error'),
                    error.response?.data?.message || t('alert.bulk_delete_error_text')
                );
            }
        }
    };

    const handleAddCustomer = () => {
        const isAdmin = location.pathname.includes('/admin');
        const formPath = isAdmin ? '/admin/pending-customer-form' : '/reception/pending-customer-form';
        navigate(formPath);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('pending_customers', 'Gözləyən Müştərilər')}
                    </h1>
                    <p className="text-gray-600">
                        {t('manage_pending_customers', 'Gözləyən müştəri tələblərini idarə edin')}
                    </p>
                </div>
            </div>

            <TableTemplate
                data={pendingCustomersData}
                columns={columns}
                title={t('pending_customers_list', 'Gözləyən tələblər')}
                searchFields={['name', 'email', 'phone']}
                filterOptions={{
                    status: statusOptions.map(status => t(status))
                }}
                onEdit={handleApprove}
                onDelete={handleDelete}
                onView={handleView}
                onBulkDelete={handleBulkDelete}
                onBulkApprove={handleBulkApprove}
                showBulkActions={true}
                showFilters={true}
                showSearch={true}
                showDateFilter={true}
                loading={loading}
                emptyState={{
                    icon: UserPlus,
                    title: t('no_pending_customers', 'Gözləyən tələb yoxdur'),
                    description: t('no_pending_customers_description', 'Hal-hazırda gözləyən müştəri tələbi yoxdur'),
                    action: {
                        label: t('add_first_customer', 'İlk müştəri tələbini əlavə et'),
                        onClick: handleAddCustomer
                    }
                }}
            />
        </div>
    );
}

