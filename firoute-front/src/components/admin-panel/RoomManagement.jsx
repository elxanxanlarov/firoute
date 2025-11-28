import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus, Home, ArrowLeft } from 'lucide-react';
import { roomAPI } from '../../api';

export default function RoomManagement() {
    const { t } = useTranslation('admin-panel');
    const navigate = useNavigate();
    const location = useLocation();
    const [roomData, setRoomData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch rooms data
    useEffect(() => {
        const fetchRooms = async () => {
            setLoading(true);
            try {
                const response = await roomAPI.getAll();
                if (response.success && response.data) {
                    // Transform data for table
                    const transformedData = response.data.map(room => ({
                        id: room.id,
                        number: room.number,
                        floor: room.floor || '-',
                        createdAt: room.createdAt,
                        reservationsCount: room.reservations?.length || 0,
                        ...room
                    }));
                    setRoomData(transformedData);
                } else {
                    setRoomData([]);
                }
            } catch (error) {
                console.error('Error fetching rooms:', error);
                Alert.error('Xəta!', 'Otaqları əldə etmək mümkün olmadı');
                setRoomData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, []);

    const columns = [
        {
            key: 'number',
            label: t('room_number', 'Otaq nömrəsi'),
            render: (value, item) => (
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                        <Home className="w-4 h-4" />
                    </div>
                    <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{value}</div>
                        {item.floor && item.floor !== '-' && (
                            <div className="text-sm text-gray-500">{t('floor', 'Mərtəbə')}: {item.floor}</div>
                        )}
                    </div>
                </div>
            )
        },
        {
            key: 'floor',
            label: t('floor', 'Mərtəbə'),
            render: (value) => (
                <span className="text-sm text-gray-900">
                    {value || '-'}
                </span>
            )
        },
        {
            key: 'reservationsCount',
            label: t('reservations', 'Rezervasiyalar'),
            render: (value) => (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {value || 0}
                </span>
            )
        },
        {
            key: 'createdAt',
            label: t('created', 'Yaradılıb'),
            render: (value) => value ? new Date(value).toLocaleDateString('az-AZ') : '-'
        }
    ];

    const handleEdit = async (room) => {
        const isAdmin = location.pathname.includes('/admin');
        if (!isAdmin) return;
        const editPath = `/admin/rooms-form?id=${room.id.toString()}`;
        navigate(editPath);
    };

    const handleDelete = async (room) => {
        const result = await Alert.confirm(
            t('alert.delete_confirm', 'Silmə təsdiqi'),
            `${t('delete_room_confirm', 'Bu otağı silmək istədiyinizə əminsiniz?')} ${room.number}?`,
            {
                confirmText: t('alert.yes', 'Bəli'),
                cancelText: t('alert.no', 'Xeyr'),
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading', 'Yüklənir...'));
                await roomAPI.delete(room.id.toString());
                setRoomData(prev => prev.filter(item => item.id !== room.id));
                Alert.close();
                Alert.success(t('alert.delete_success', 'Uğurlu'), t('alert.delete_success_text', 'Silindi'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error', 'Xəta'), error.response?.data?.message || t('alert.error_text', 'Xəta baş verdi'));
            }
        }
    };

    const handleView = (room) => {
        Alert.info(
            `${t('room_number', 'Otaq nömrəsi')}: ${room.number}`,
            `${t('floor', 'Mərtəbə')}: ${room.floor || '-'}\n${t('reservations', 'Rezervasiyalar')}: ${room.reservationsCount || 0}`
        );
    };

    const handleBulkDelete = async (selectedIds) => {
        const result = await Alert.confirm(
            t('alert.bulk_delete_confirm', 'Toplu silmə təsdiqi'),
            `${t('alert.bulk_delete_confirm_text', 'Seçilmiş elementləri silmək istədiyinizə əminsiniz?')} ${selectedIds.length} ${t('items_selected', 'element')}?`,
            {
                confirmText: t('alert.yes', 'Bəli'),
                cancelText: t('alert.no', 'Xeyr'),
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading', 'Yüklənir...'));
                await Promise.all(selectedIds.map(id => roomAPI.delete(id.toString())));
                setRoomData(prev => prev.filter(item => !selectedIds.includes(item.id)));
                Alert.close();
                Alert.success(t('alert.bulk_delete_success', 'Uğurlu'), t('alert.bulk_delete_success_text', 'Silindi'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error', 'Xəta'), error.response?.data?.message || t('alert.error_text', 'Xəta baş verdi'));
            }
        }
    };

    const handleAddRoom = () => {
        const isAdmin = location.pathname.includes('/admin');
        const addRoomPath = isAdmin ? '/admin/rooms-form' : '/reception/rooms-form';
        navigate(addRoomPath);
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
                        <h1 className="text-2xl font-bold text-gray-900">{t('room_management', 'Otaq İdarəetməsi')}</h1>
                        <p className="text-gray-600">{t('manage_rooms', 'Otaqları yaradın və idarə edin')}</p>
                    </div>
                </div>
                <button
                    onClick={handleAddRoom}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('add_room', 'Otaq əlavə et')}
                </button>
            </div>

            <TableTemplate
                data={roomData}
                columns={columns}
                title={t('rooms', 'Otaqlar')}
                searchFields={['number']}
                filterOptions={{
                    floor: Array.from({ length: 20 }, (_, i) => (i + 1).toString())
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
                    icon: 'home',
                    title: t('no_rooms_found', 'Otaq tapılmadı'),
                    description: t('no_rooms_description', 'Hələlik göstəriləcək otaq yoxdur.'),
                    actionText: t('add_first_room', 'İlk otağı əlavə et'),
                    onAction: handleAddRoom,
                    showAction: true
                }}
            />
        </div>
    );
}
