import { Phone, Router, Home, Calendar } from 'lucide-react';

export const getCustomerColumns = (t) => [
    {
        key: 'name',
        label: t('name'),
        render: (value, item) => (
            <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
                    {(value || `${item.firstName || ''} ${item.lastName || ''}` || '-')
                        .trim()
                        .split(' ')
                        .filter(Boolean)
                        .map(n => n[0])
                        .join('') || '-'}
                </div>
                <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{value || `${item.firstName || ''} ${item.lastName || ''}`}</div>
                    <div className="text-sm text-gray-500">{item.email}</div>
                </div>
            </div>
        )
    },
    {
        key: 'phone',
        label: t('phone'),
        render: (value) => (
            <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900">{value || '-'}</span>
            </div>
        )
    },
    {
        key: 'room',
        label: t('room', 'Otaq'),
        render: (value, item) => {
            // CHECKED_IN statuslu rezervasiyaları tap (tarix yoxlaması ilə)
            const activeReservation = item.reservations?.find(res => {
                if (res.status !== 'CHECKED_IN') return false;
                const now = new Date();
                const checkIn = new Date(res.checkIndate);
                const checkOut = new Date(res.checkOutdate);
                // Aktiv rezervasiya: check-in <= now <= check-out (saat ilə)
                return checkIn <= now && checkOut >= now;
            });
            
            // Əgər aktiv rezervasiya yoxdursa, ən son CHECKED_IN statuslu rezervasiyanı göstər
            const reservationToShow = activeReservation || item.reservations?.find(res => res.status === 'CHECKED_IN');
            
            if (reservationToShow?.room) {
                return (
                    <div className="flex items-center space-x-2">
                        <Home className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">
                            {reservationToShow.room.number}
                            {reservationToShow.room.floor && ` (Mərtəbə ${reservationToShow.room.floor})`}
                        </span>
                    </div>
                );
            }
            return <span className="text-sm text-gray-400">-</span>;
        }
    },
    {
        key: 'reservationDates',
        label: t('reservation_dates', 'Rezervasiya Tarixləri'),
        render: (value, item) => {
            // CHECKED_IN statuslu rezervasiyaları tap (tarix yoxlaması ilə)
            const activeReservation = item.reservations?.find(res => {
                if (res.status !== 'CHECKED_IN') return false;
                const now = new Date();
                const checkIn = new Date(res.checkIndate);
                const checkOut = new Date(res.checkOutdate);
                // Aktiv rezervasiya: check-in <= now <= check-out (saat ilə)
                return checkIn <= now && checkOut >= now;
            });
            
            // Əgər aktiv rezervasiya yoxdursa, ən son CHECKED_IN statuslu rezervasiyanı göstər
            const reservationToShow = activeReservation || item.reservations?.find(res => res.status === 'CHECKED_IN');
            
            if (reservationToShow) {
                const checkIn = new Date(reservationToShow.checkIndate);
                const checkOut = new Date(reservationToShow.checkOutdate);
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
                return (
                    <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div className="text-sm text-gray-900">
                            <div>{checkInStr} - {checkOutStr}</div>
                            <div className="text-xs text-gray-500">{reservationToShow.guestCount} {t('guests', 'nəfər')}</div>
                        </div>
                    </div>
                );
            }
            return <span className="text-sm text-gray-400">-</span>;
        }
    },
    {
        key: 'status',
        label: t('status'),
        render: (value, item) => {
            const status = value || item.status || 'Active';
            const isActive = status === 'Active' || status === 'active';
            return (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                    {t(isActive ? 'active' : 'inactive')}
                </span>
            );
        }
    }
];

