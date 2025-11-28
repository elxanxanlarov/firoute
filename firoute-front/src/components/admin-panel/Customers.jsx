import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { UserPlus } from 'lucide-react';
import { getCustomerColumns } from '../../data/table-columns/CustomerColumns';
import { customerAPI } from '../../api';
import { 
    initializeSocket,
    onCustomerStatusUpdate,
    offCustomerStatusUpdate,
    onCustomerUpdate,
    offCustomerUpdate
} from '../../utils/socket.js';

const statusOptions = ["active", "inactive"];

export default function Customers() {
    const { t } = useTranslation('admin-panel');
    const navigate = useNavigate();
    const location = useLocation();
    const [customerData, setCustomerData] = useState([]);
    console.log(customerData);
    const [loading, setLoading] = useState(true);

    const columns = getCustomerColumns(t);

    // Fetch customers data
    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true);
            try {
                // Default olaraq aktiv müştəriləri gətir
                const response = await customerAPI.getAll();
                if (response.success && response.data) {
                    // Transform data for table
                    const transformedData = response.data.map(customer => ({
                        id: customer.id,
                        name: `${customer.firstName} ${customer.lastName}`,
                        firstName: customer.firstName,
                        lastName: customer.lastName,
                        email: customer.email,
                        phone: customer.phone || '-',
                        status: customer.isActive ? 'Active' : 'Inactive',
                        isActive: customer.isActive,
                        reservations: customer.reservations || [],
                        createdAt: customer.createdAt,
                        ...customer
                    }));
                    setCustomerData(transformedData);
                } else {
                    setCustomerData([]);
                }
            } catch (error) {
                console.error('Error fetching customers:', error);
                Alert.error('Xəta!', 'Müştəriləri əldə etmək mümkün olmadı');
                setCustomerData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCustomers();
    }, []);

    // WebSocket inteqrasiyası - real-time customer status yeniləməsi
    useEffect(() => {
        // Socket bağlantısını başlat
        const socket = initializeSocket();
        
        // Customer room-una qoşul
        const connectAndJoin = () => {
            if (socket && socket.connected) {
                socket.emit('join-customer-room');
            }
        };
        
        connectAndJoin();
        
        // Əgər socket hələ bağlanmayıbsa, connect event-ini dinlə
        if (!socket.connected) {
            socket.on('connect', connectAndJoin);
        }

        // Customer status dəyişikliyi event-ini dinlə
        const handleCustomerStatusUpdate = (updatedCustomer) => {
            setCustomerData(prev => {
                const index = prev.findIndex(c => c.id === updatedCustomer.id);
                if (index !== -1) {
                    // Customer məlumatlarını yenilə
                    const transformedCustomer = {
                        id: updatedCustomer.id,
                        name: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
                        firstName: updatedCustomer.firstName,
                        lastName: updatedCustomer.lastName,
                        email: updatedCustomer.email,
                        phone: updatedCustomer.phone || '-',
                        status: updatedCustomer.isActive ? 'Active' : 'Inactive',
                        isActive: updatedCustomer.isActive,
                        reservations: updatedCustomer.reservations || [],
                        createdAt: updatedCustomer.createdAt,
                        ...updatedCustomer
                    };
                    const newData = [...prev];
                    newData[index] = transformedCustomer;
                    return newData;
                }
                return prev;
            });
        };

        // Customer yenilənmə event-ini dinlə
        const handleCustomerUpdate = (updatedCustomer) => {
            setCustomerData(prev => {
                const index = prev.findIndex(c => c.id === updatedCustomer.id);
                if (index !== -1) {
                    // Customer məlumatlarını yenilə
                    const transformedCustomer = {
                        id: updatedCustomer.id,
                        name: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
                        firstName: updatedCustomer.firstName,
                        lastName: updatedCustomer.lastName,
                        email: updatedCustomer.email,
                        phone: updatedCustomer.phone || '-',
                        status: updatedCustomer.isActive ? 'Active' : 'Inactive',
                        isActive: updatedCustomer.isActive,
                        reservations: updatedCustomer.reservations || [],
                        createdAt: updatedCustomer.createdAt,
                        ...updatedCustomer
                    };
                    const newData = [...prev];
                    newData[index] = transformedCustomer;
                    return newData;
                } else {
                    // Yeni customer əlavə et (əgər yoxdursa)
                    const transformedCustomer = {
                        id: updatedCustomer.id,
                        name: `${updatedCustomer.firstName} ${updatedCustomer.lastName}`,
                        firstName: updatedCustomer.firstName,
                        lastName: updatedCustomer.lastName,
                        email: updatedCustomer.email,
                        phone: updatedCustomer.phone || '-',
                        status: updatedCustomer.isActive ? 'Active' : 'Inactive',
                        isActive: updatedCustomer.isActive,
                        reservations: updatedCustomer.reservations || [],
                        createdAt: updatedCustomer.createdAt,
                        ...updatedCustomer
                    };
                    return [transformedCustomer, ...prev];
                }
            });
        };

        onCustomerStatusUpdate(handleCustomerStatusUpdate);
        onCustomerUpdate(handleCustomerUpdate);

        // Cleanup
        return () => {
            offCustomerStatusUpdate(handleCustomerStatusUpdate);
            offCustomerUpdate(handleCustomerUpdate);
            if (socket && socket.connected) {
                socket.emit('leave-customer-room');
            }
        };
    }, []);

    const handleEdit = async (customer) => {
        const isAdmin = location.pathname.includes('/admin');
        if (!isAdmin) return;
        const editPath = `/admin/customer-form?id=${customer.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (customer) => {
        const result = await Alert.confirm(
            t('alert.delete_confirm'),
            `${t('alert.delete_confirm_text')} ${customer.name || `${customer.firstName} ${customer.lastName}`}?`,
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
                await customerAPI.delete(customer.id.toString());
                setCustomerData(prev => prev.filter(item => item.id !== customer.id));
                Alert.close();
                Alert.success(t('alert.delete_success'), t('alert.delete_success_text'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error'), error.response?.data?.message || t('alert.error_text'));
            }
        }
    };

    const handleView = (customer) => {
        const statusName = customer.isActive !== undefined 
            ? (customer.isActive ? 'Active' : 'Inactive')
            : (customer.status || 'Active');
        
        const activeReservation = customer.reservations?.find(res => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const checkIn = new Date(res.checkIndate);
            const checkOut = new Date(res.checkOutdate);
            return res.status === 'CHECKED_IN' && checkIn <= today && checkOut >= today;
        });
        
        let details = `${t('email')}: ${customer.email}\n${t('phone')}: ${customer.phone || '-'}\n${t('status')}: ${t(statusName.toLowerCase())}`;
        
        if (activeReservation) {
            const checkIn = new Date(activeReservation.checkIndate);
            const checkOut = new Date(activeReservation.checkOutdate);
            const checkInStr = checkIn.toLocaleString('az-AZ', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const checkOutStr = checkOut.toLocaleString('az-AZ', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            details += `\n${t('room', 'Otaq')}: ${activeReservation.room?.number || '-'}\n${t('check_in', 'Check-in')}: ${checkInStr}\n${t('check_out', 'Check-out')}: ${checkOutStr}\n${t('guest_count', 'Qonaq sayı')}: ${activeReservation.guestCount}`;
        }
        
        Alert.info(
            `${t('name')}: ${customer.name || `${customer.firstName} ${customer.lastName}`}`,
            details
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
                await Promise.all(selectedIds.map(id => customerAPI.delete(id.toString())));
                setCustomerData(prev => prev.filter(item => !selectedIds.includes(item.id)));
                Alert.close();
                Alert.success(t('alert.bulk_delete_success'), t('alert.bulk_delete_success_text'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error'), error.response?.data?.message || t('alert.error_text'));
            }
        }
    };

    const handleAddCustomer = () => {
        const isAdmin = location.pathname.includes('/admin');
        const addCustomerPath = isAdmin ? '/admin/customer-form' : '/reception/customer-form';
        navigate(addCustomerPath);
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('router_management')}</h1>
                    <p className="text-gray-600">{t('manage_routers')}</p>
                </div>
                <button
                    onClick={handleAddCustomer}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    {t('add_customer')}
                </button>
            </div>

            <TableTemplate
                data={customerData}
                columns={columns}
                title={t('customers')}
                searchFields={['name', 'email', 'phone', 'firstName', 'lastName']}
                filterOptions={{
                    status: statusOptions.map(status => t(status))
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
                    icon: 'users',
                    title: t('no_customers_found'),
                    description: t('no_customers_description'),
                    actionText: t('add_first_customer'),
                    onAction: handleAddCustomer,
                    showAction: true
                }}
            />
        </div>
    );
}