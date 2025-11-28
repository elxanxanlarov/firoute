import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Input from '../../ui/Input';
import Alert from '../../ui/Alert';
import { Calendar, ArrowLeft, Users, Home, Wifi, Plus } from 'lucide-react';
import { reservationAPI, customerAPI, roomAPI, radiusProfileAPI } from '../../../api';
import InputDropdown from '../../ui/InputDropdown';

export default function ReservationForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const customerId = searchParams.get('customerId');
    
    // Check if coming from admin or reception
    const isAdmin = location.pathname.includes('/admin');
    const reservationPagePath = isAdmin ? '/admin/customers' : '/reception/customers';
    
    // Determine mode: if id exists in query params, use edit mode, otherwise add mode
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        customerId: '',
        roomId: '',
        guestCount: '',
        checkInDate: '',
        checkOutDate: '',
        wifiProfileId: ''
    });
    
    const [customers, setCustomers] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [wifiProfiles, setWifiProfiles] = useState([]);
    const [existingReservations, setExistingReservations] = useState([]);
    const [occupiedRoomIds, setOccupiedRoomIds] = useState([]);
    const [showNewRoomForm, setShowNewRoomForm] = useState(false);
    const [newRoomData, setNewRoomData] = useState({ number: '', floor: '' });
    const [newRoomErrors, setNewRoomErrors] = useState({});
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);

    // Fetch initial data (customers, rooms, wifi profiles)
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingData(true);
            try {
                // Fetch customers
                const customersResponse = await customerAPI.getAll({ isActive: true });
                if (customersResponse.success && customersResponse.data) {
                    setCustomers(customersResponse.data);
                }

                // Fetch rooms
                const roomsResponse = await roomAPI.getAll();
                if (roomsResponse.success && roomsResponse.data) {
                    setRooms(roomsResponse.data);
                    
                    // Get occupied room IDs based on used field
                    const occupiedIds = roomsResponse.data
                        .filter(room => room.used === true)
                        .map(room => room.id);
                    
                    setOccupiedRoomIds(occupiedIds);
                }

                // Fetch WiFi profiles
                const profilesResponse = await radiusProfileAPI.getAll();
                if (profilesResponse.success && profilesResponse.data) {
setWifiProfiles(profilesResponse.data);
                }

                // Əgər customerId varsa, müştəri avtomatik seçilsin
                if (customerId && !isEditMode) {
                    setFormData(prev => ({
                        ...prev,
                        customerId: customerId
                    }));
                    
                    // Bu müştərinin mövcud rezervasiyalarını gətir
                    const reservationsResponse = await reservationAPI.getAll({ customerId: customerId });
                    if (reservationsResponse.success && reservationsResponse.data) {
                        setExistingReservations(reservationsResponse.data);
                    }
                }

                // Əgər edit mode deyilsə, check-in tarixini avtomatik set et
                if (!isEditMode) {
                    setFormData(prev => ({
                        ...prev,
                        checkInDate: prev.checkInDate || getTodayDateTime()
                    }));
                }
            } catch (error) {
                console.error('Error fetching initial data:', error);
                Alert.error('Xəta!', 'Məlumatları əldə etmək mümkün olmadı');
            } finally {
                setLoadingData(false);
            }
        };

        fetchInitialData();
}, [customerId, isEditMode, id]);

    // Fetch reservation data (if edit mode)
    useEffect(() => {
        const fetchReservation = async () => {
            if (isEditMode && id && !loadingData) {
                // loadingData false olduqda, yəni initial data yüklənib
                try {
                    setIsLoading(true);
                    const response = await reservationAPI.getById(id);
                    if (response.success && response.data) {
                        const reservation = response.data;
                        
                        // Rezervasiya məlumatlarını formData-ya set et
                        setFormData({
                            customerId: reservation.customerId || '',
                            roomId: reservation.roomId || '',
                            guestCount: reservation.guestCount?.toString() || '',
                            checkInDate: reservation.checkIndate ? toDateTimeLocal(reservation.checkIndate) : '',
                            checkOutDate: reservation.checkOutdate ? toDateTimeLocal(reservation.checkOutdate) : '',
                            wifiProfileId: reservation.wifiProfileId || ''
                        });
                        
                        // Bu müştərinin digər rezervasiyalarını gətir (cari rezervasiya istisna olmaqla)
                        const reservationsResponse = await reservationAPI.getAll({ 
                            customerId: reservation.customerId 
                        });
                        if (reservationsResponse.success && reservationsResponse.data) {
                            const otherReservations = reservationsResponse.data.filter(r => r.id !== id);
                            setExistingReservations(otherReservations);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching reservation:', error);
                    Alert.error('Xəta!', 'Rezervasiya məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchReservation();
    }, [id, isEditMode, loadingData]);

    // Get today's date and time in datetime-local format (YYYY-MM-DDTHH:mm)
    const getTodayDateTime = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Convert ISO date string to datetime-local format
    const toDateTimeLocal = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Parse datetime-local string to Date object (local timezone)
    const parseDateTimeLocal = (dateTimeString) => {
        if (!dateTimeString) return null;
        // datetime-local format: YYYY-MM-DDTHH:mm
        // Parse as local time (not UTC)
        const [datePart, timePart] = dateTimeString.split('T');
        if (!datePart || !timePart) return null;
        
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        // Create date in local timezone
        return new Date(year, month - 1, day, hours, minutes);
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.customerId) {
            newErrors.customerId = 'Müştəri seçilməlidir';
        }
        
        if (!formData.roomId) {
            newErrors.roomId = 'Otaq seçilməlidir';
        }
        
        if (!formData.guestCount || parseInt(formData.guestCount) < 1) {
            newErrors.guestCount = 'Qonaq sayı ən azı 1 olmalıdır';
        }
        
        if (!formData.checkInDate) {
            newErrors.checkInDate = 'Check-in tarixi və vaxtı tələb olunur';
        } else {
            // datetime-local formatını local timezone-da parse et
            const checkIn = parseDateTimeLocal(formData.checkInDate);
            
            if (!checkIn || isNaN(checkIn.getTime())) {
                newErrors.checkInDate = 'Düzgün tarix və vaxt formatı daxil edin';
            }
        }
        
        if (!formData.checkOutDate) {
            newErrors.checkOutDate = 'Check-out tarixi və vaxtı tələb olunur';
        } else if (formData.checkInDate) {
            // datetime-local formatını local timezone-da parse et
            const checkIn = parseDateTimeLocal(formData.checkInDate);
            const checkOut = parseDateTimeLocal(formData.checkOutDate);
            
            if (!checkOut || isNaN(checkOut.getTime())) {
                newErrors.checkOutDate = 'Düzgün tarix və vaxt formatı daxil edin';
            } else if (!checkIn || checkOut <= checkIn) {
                newErrors.checkOutDate = 'Check-out tarixi və vaxtı check-in tarixindən sonra olmalıdır';
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleNewRoomInputChange = (field, value) => {
        setNewRoomData(prev => ({
            ...prev,
            [field]: value
        }));
        
        if (newRoomErrors[field]) {
            setNewRoomErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleCreateNewRoom = async () => {
        const newErrors = {};
        
        if (!newRoomData.number.trim()) {
            newErrors.number = 'Otaq nömrəsi tələb olunur';
        }
        
        if (newRoomData.floor && newRoomData.floor.trim()) {
            const floorNum = parseInt(newRoomData.floor);
            if (isNaN(floorNum) || floorNum < 0) {
                newErrors.floor = 'Mərtəbə müsbət rəqəm olmalıdır';
            }
        }
        
        setNewRoomErrors(newErrors);
        
        if (Object.keys(newErrors).length > 0) {
            return;
        }
        
        try {
            const payload = {
                number: newRoomData.number.trim(),
                floor: newRoomData.floor && newRoomData.floor.trim() ? parseInt(newRoomData.floor) : null
            };
            
            const response = await roomAPI.create(payload);
            if (response.success && response.data) {
                // Yeni otağı siyahıya əlavə et
                setRooms(prev => [...prev, response.data]);
                // Yeni otağı seç
                setFormData(prev => ({
                    ...prev,
                    roomId: response.data.id
                }));
                // Formu bağla
                setShowNewRoomForm(false);
                setNewRoomData({ number: '', floor: '' });
                Alert.success('Uğurlu!', 'Otaq uğurla əlavə edildi və seçildi');
            }
        } catch (error) {
            console.error('Error creating room:', error);
            const errorMessage = error.response?.data?.message || 'Otaq yaratmaqda xəta baş verdi';
            Alert.error('Xəta!', errorMessage);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setIsLoading(true);
        
        try {
            // Convert datetime-local to ISO format for backend
            const checkInISO = formData.checkInDate ? new Date(formData.checkInDate).toISOString() : null;
            const checkOutISO = formData.checkOutDate ? new Date(formData.checkOutDate).toISOString() : null;
            
            const payload = {
                customerId: formData.customerId,
                roomId: formData.roomId,
                guestCount: parseInt(formData.guestCount),
                checkIndate: checkInISO,
                checkOutdate: checkOutISO,
                wifiProfileId: formData.wifiProfileId || null
            };

            if (isEditMode) {
                await reservationAPI.update(id.toString(), payload);
                Alert.success('Uğurlu!', 'Rezervasiya məlumatları uğurla yeniləndi');
                navigate(reservationPagePath);
            } else {
                const response = await reservationAPI.create(payload);
                if (response.success) {
                    // WiFi accounts varsa WiFi credentials səhifəsinə yönləndir
                    if (response.wifiAccounts && response.wifiAccounts.length > 0) {
                        const roomNumber = rooms.find(r => r.id === formData.roomId)?.number || '';
                        const wifiAccountsParam = encodeURIComponent(JSON.stringify(response.wifiAccounts));
                        const wifiCredentialsPath = isAdmin 
                            ? `/admin/wifi-credentials?roomNumber=${roomNumber}&guestCount=${formData.guestCount}&wifiAccounts=${wifiAccountsParam}`
                            : `/reception/wifi-credentials?roomNumber=${roomNumber}&guestCount=${formData.guestCount}&wifiAccounts=${wifiAccountsParam}`;
                        navigate(wifiCredentialsPath);
                    } else {
                        Alert.success('Uğurlu!', 'Rezervasiya uğurla yaradıldı');
                        // Navigate to customer page after success
                        const customerPagePath = isAdmin ? '/admin/customers' : '/reception/customers';
                        navigate(customerPagePath);
                    }
                }
            }
            
        } catch (error) {
            console.error('Reservation operation error:', error);
            const errorMessage = error.response?.data?.message || 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.';
            Alert.error('Xəta!', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (loadingData) {
        return (
            <div className="p-6 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Yüklənir...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate(reservationPagePath)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Geri qayıt"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? 'Rezervasiya Məlumatlarını Redaktə Et' : 'Yeni Rezervasiya'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditMode ? 'Rezervasiya məlumatlarını yeniləyin' : 'Rezervasiya məlumatlarını daxil edin'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Customer and Room Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Müştəri və Otaq Məlumatları
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Müştəri <span className="text-red-500">*</span>
                                {customerId && !isEditMode && (
                                    <span className="ml-2 text-xs text-blue-600">(Yeni müştəri üçün)</span>
                                )}
                            </label>
                            <select
                                value={formData.customerId}
                                onChange={(e) => handleInputChange('customerId', e.target.value)}
                                disabled={!!customerId && !isEditMode}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.customerId ? 'border-red-500' : 'border-gray-300'
                                } ${customerId && !isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                required
                            >
                                <option value="">Müştəri seçin</option>
                                {customers.map(customer => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.firstName} {customer.lastName} {customer.email ? `(${customer.email})` : ''}
                                    </option>
                                ))}
                            </select>
                            {errors.customerId && (
                                <p className="mt-1 text-xs text-red-600">{errors.customerId}</p>
                            )}
                            {customerId && !isEditMode && (
                                <p className="mt-1 text-xs text-blue-600">
                                    Bu müştəri yeni yaradıldı və avtomatik seçildi
                                </p>
                            )}
                        </div>
                        
                        <div>
                            <div className="flex items-center justify-end mb-1">
                                <button
                                    type="button"
                                    onClick={() => setShowNewRoomForm(!showNewRoomForm)}
                                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    {showNewRoomForm ? 'Ləğv et' : 'Yeni otaq əlavə et'}
                                </button>
                            </div>
                            
                            {showNewRoomForm ? (
                                <div className="space-y-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                                    <div>
                                        <input
                                            type="text"
                                            value={newRoomData.number}
                                            onChange={(e) => handleNewRoomInputChange('number', e.target.value)}
                                            placeholder="Otaq nömrəsi (məs: 101)"
                                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                newRoomErrors.number ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        />
                                        {newRoomErrors.number && (
                                            <p className="mt-1 text-xs text-red-600">{newRoomErrors.number}</p>
                                        )}
                                    </div>
                                    <div>
                                        <input
                                            type="number"
                                            value={newRoomData.floor}
                                            onChange={(e) => handleNewRoomInputChange('floor', e.target.value)}
                                            placeholder="Mərtəbə (opsional)"
                                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                newRoomErrors.floor ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                        />
                                        {newRoomErrors.floor && (
                                            <p className="mt-1 text-xs text-red-600">{newRoomErrors.floor}</p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCreateNewRoom}
                                        className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Otaq Əlavə Et
                                    </button>
                                </div>
                            ) : (
                                <InputDropdown
                                    label="Otaq Nömrəsi"
                                    options={rooms.map(room => ({
                                        value: room.id,
                                        label: `${room.number}${room.floor ? ` (Mərtəbə ${room.floor})` : ''}${room.used ? ' - İstifadə olunur' : ''}`,
                                        ...room
                                    }))}
                                    value={formData.roomId}
                                    onChange={(value) => handleInputChange('roomId', value)}
                                    placeholder="Otaq seçin və ya axtarın..."
                                    searchPlaceholder="Otaq axtarın..."
                                    error={errors.roomId}
                                    required
                                    multiple={false}
                                    isOptionDisabled={(option) => {
                                        // Disable occupied rooms (except current room if editing)
                                        if (isEditMode && id && option.id === formData.roomId) {
                                            return false; // Allow current room
                                        }
                                        // Disable if room is used
                                        return option.used === true || occupiedRoomIds.includes(option.id);
                                    }}
                                />
                            )}
                        </div>
                        
                        <div>
                            <Input
                                label="Qonaq Sayı"
                                type="number"
                                value={formData.guestCount}
                                onChange={(e) => handleInputChange('guestCount', e.target.value)}
                                error={errors.guestCount}
                                placeholder="3"
                                icon={<Users />}
                                required
                                min="1"
                            />
                        </div>
                    </div>
                </div>

                {/* Date Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2" />
                        Tarix Məlumatları
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Check-in Tarixi və Vaxtı <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.checkInDate}
                                onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                                // min={getTodayDateTime()}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.checkInDate ? 'border-red-500' : 'border-gray-300'
                                }`}
                                required
                            />
                            {errors.checkInDate && (
                                <p className="mt-1 text-xs text-red-600">{errors.checkInDate}</p>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Check-out Tarixi və Vaxtı <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.checkOutDate}
                                onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                                min={formData.checkInDate || getTodayDateTime()}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.checkOutDate ? 'border-red-500' : 'border-gray-300'
                                }`}
                                required
                            />
                            {errors.checkOutDate && (
                                <p className="mt-1 text-xs text-red-600">{errors.checkOutDate}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* WiFi Profile */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4 flex items-center">
                        <Wifi className="w-5 h-5 mr-2" />
                        WiFi Profil
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <InputDropdown
                                label="WiFi Profil Seçin"
                                options={wifiProfiles.map(profile => ({
                                    value: profile.groupname,
                                    label: profile.displayName || profile.groupname,
                                    ...profile
                                }))}
                                value={formData.wifiProfileId}
                                onChange={(value) => handleInputChange('wifiProfileId', value)}
                                placeholder="Profil seçin və ya axtarın... (opsional)"
                                searchPlaceholder="Profil axtarın..."
                                multiple={false}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Qonaq sayına uyğun WiFi profili seçin
                            </p>
                        </div>
                    </div>
                </div>

                {/* Existing Reservations */}
                {existingReservations.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-6">
                        <h3 className="text-lg font-semibold text-yellow-900 border-b border-yellow-200 pb-3 mb-4 flex items-center">
                            <Calendar className="w-5 h-5 mr-2" />
                            Mövcud Rezervasiyalar
                        </h3>
                        
                        <div className="space-y-2">
                            {existingReservations.map(reservation => {
                                const checkIn = new Date(reservation.checkIndate);
                                const checkOut = new Date(reservation.checkOutdate);
                                const now = new Date();
                                
                                // Status və tarixə görə rezervasiya vəziyyətini müəyyən et
                                let statusLabel = '';
                                let statusClass = '';
                                let bgClass = '';
                                let borderClass = '';
                                
                                // Statusu Azərbaycan dilinə çevir
                                const getStatusLabel = (status) => {
                                    const statusMap = {
                                        'CHECKED_IN': 'Giriş edildi',
                                        'CHECKED_OUT': 'Bitmiş',
                                        'PENDING': 'Gözləyir',
                                        'CANCELED': 'Ləğv edilmiş'
                                    };
                                    return statusMap[status] || status;
                                };
                                
                                if (reservation.status === 'CHECKED_IN') {
                                    if (checkIn <= now && checkOut >= now) {
                                        statusLabel = 'Aktiv';
                                        statusClass = 'bg-green-100 text-green-800';
                                        bgClass = 'bg-green-50';
                                        borderClass = 'border-green-200';
                                    } else if (checkIn > now) {
                                        statusLabel = 'Gələcək';
                                        statusClass = 'bg-blue-100 text-blue-800';
                                        bgClass = 'bg-blue-50';
                                        borderClass = 'border-blue-200';
                                    } else {
                                        statusLabel = 'Bitmiş';
                                        statusClass = 'bg-gray-100 text-gray-800';
                                        bgClass = 'bg-gray-50';
                                        borderClass = 'border-gray-200';
                                    }
                                } else if (reservation.status === 'CHECKED_OUT') {
                                    statusLabel = 'Bitmiş';
                                    statusClass = 'bg-gray-100 text-gray-800';
                                    bgClass = 'bg-gray-50';
                                    borderClass = 'border-gray-200';
                                } else if (reservation.status === 'CANCELED') {
                                    statusLabel = 'Ləğv edilmiş';
                                    statusClass = 'bg-red-100 text-red-800';
                                    bgClass = 'bg-red-50';
                                    borderClass = 'border-red-200';
                                } else if (reservation.status === 'PENDING') {
                                    if (checkIn > now) {
                                        statusLabel = 'Gözləyir';
                                        statusClass = 'bg-yellow-100 text-yellow-800';
                                        bgClass = 'bg-yellow-50';
                                        borderClass = 'border-yellow-200';
                                    } else {
                                        statusLabel = 'Gözləyir (keçmiş)';
                                        statusClass = 'bg-orange-100 text-orange-800';
                                        bgClass = 'bg-orange-50';
                                        borderClass = 'border-orange-200';
                                    }
                                } else {
                                    statusLabel = 'Naməlum';
                                    statusClass = 'bg-gray-100 text-gray-800';
                                    bgClass = 'bg-gray-50';
                                    borderClass = 'border-gray-200';
                                }
                                
                                // Status label-i Azərbaycan dilinə çevir
                                // Əgər rezervasiya bitibsə (check-out tarixi keçibsə və ya status CHECKED_OUT/CANCELED), "Bitmiş" göstər
                                let statusText;
                                if (checkOut < now || reservation.status === 'CHECKED_OUT' || reservation.status === 'CANCELED') {
                                    statusText = 'Bitmiş';
                                } else {
                                    statusText = getStatusLabel(reservation.status);
                                }
                                
                                return (
                                    <div 
                                        key={reservation.id} 
                                        className={`p-3 rounded-md border ${bgClass} ${borderClass}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    Otaq: {reservation.room?.number || '-'}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    {checkIn.toLocaleDateString('az-AZ', { 
                                                        day: '2-digit', 
                                                        month: '2-digit', 
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })} - {checkOut.toLocaleDateString('az-AZ', { 
                                                        day: '2-digit', 
                                                        month: '2-digit', 
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })} | Status: {statusText}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    Qonaq sayı: {reservation.guestCount}
                                                </p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${statusClass}`}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Ləğv et
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isEditMode ? 'Yenilənir...' : 'Yaradılır...'}
                            </>
                        ) : (
                            isEditMode ? 'Yenilə' : 'Rezervasiya Yarat'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

