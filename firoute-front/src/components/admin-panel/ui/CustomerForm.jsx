import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Input from '../../ui/Input';
import Alert from '../../ui/Alert';
import { MdPerson, MdEmail, MdPhone, MdRouter, MdHome, MdEdit, MdEvent } from 'react-icons/md';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { customerAPI, pendingCustomerAPI, reservationAPI } from '../../../api';

export default function CustomerForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const pending = searchParams.get('pending') === 'true';
    
    // Check if coming from admin or reception
    const isAdmin = location.pathname.includes('/admin');
    const customerPagePath = isAdmin ? '/admin/customers' : '/reception/customers';
    
    // Determine mode: if id exists in query params, use edit mode, otherwise add mode
    // If pending=true, we're creating customer from pending customer
    const isEditMode = !!id && !pending;
    const isPendingMode = !!id && pending;
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        isActive: true
    });
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });
    const [reservations, setReservations] = useState([]);

    // Fetch customer data (if edit mode) or pending customer data (if pending mode)
    useEffect(() => {
        const fetchData = async () => {
            if (isEditMode && id) {
                // Fetch existing customer data
                try {
                    setIsLoading(true);
                    const response = await customerAPI.getById(id);
                    if (response.success && response.data) {
                        const customer = response.data;
                        setFormData({
                            firstName: customer.firstName || '',
                            lastName: customer.lastName || '',
                            email: customer.email || '',
                            phone: customer.phone || '',
                            isActive: customer.isActive !== undefined ? customer.isActive : true
                        });
                    }
                    
                    // Fetch customer reservations
                    const reservationsResponse = await reservationAPI.getAll({ customerId: id });
                    if (reservationsResponse.success && reservationsResponse.data) {
                        setReservations(reservationsResponse.data);
                    }
                    
                } catch (error) {
                    console.error('Error fetching customer:', error);
                    Alert.error('Xəta!', 'Müştəri məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            } else if (isPendingMode && id) {
                // Fetch pending customer data
                try {
                    setIsLoading(true);
                    const response = await pendingCustomerAPI.getById(id);
                    if (response.success && response.data) {
                        const pendingCustomer = response.data;
                        setFormData({
                            firstName: pendingCustomer.firstName || '',
                            lastName: pendingCustomer.lastName || '',
                            email: pendingCustomer.email || '',
                            phone: pendingCustomer.phone || '',
                            isActive: true
                        });
                    }
                } catch (error) {
                    console.error('Error fetching pending customer:', error);
                    Alert.error('Xəta!', 'Pending müştəri məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
    }, [id, isEditMode, isPendingMode]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Ad tələb olunur';
        }
        
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Soyad tələb olunur';
        }
        
        // Email və ya telefon ən azı biri tələb olunur
        const hasEmail = formData.email.trim();
        const hasPhone = formData.phone.trim();
        
        if (!hasEmail && !hasPhone) {
            newErrors.email = 'Email və ya telefon nömrəsi tələb olunur';
            newErrors.phone = 'Email və ya telefon nömrəsi tələb olunur';
        } else {
            // Email daxil edilərsə, formatını yoxla
            if (hasEmail && !/\S+@\S+\.\S+/.test(formData.email)) {
                newErrors.email = 'Düzgün email formatı daxil edin';
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setIsLoading(true);
        
        try {
            const payload = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                phone: formData.phone?.trim() || null,
                isActive: formData.isActive
            };

            if (isEditMode) {
                await customerAPI.update(id.toString(), payload);
                Alert.success('Uğurlu!', 'Müştəri məlumatları uğurla yeniləndi');
                navigate(customerPagePath);
            } else if (isPendingMode) {
                // Create customer from pending customer
                await customerAPI.create(payload);
                
                // Update pending customer status to approved
                try {
                    await pendingCustomerAPI.updateStatus(id, 'approved');
                } catch (error) {
                    console.error('Error updating pending customer status:', error);
                    // Don't fail the whole operation if status update fails
                }
                
                Alert.success('Uğurlu!', 'Müştəri uğurla əlavə edildi və pending tələb təsdiq edildi');
                navigate(customerPagePath);
            } else {
                const response = await customerAPI.create(payload);
                if (response.success && response.data) {
                Alert.success('Uğurlu!', 'Müştəri uğurla əlavə edildi');
                    // Yeni müştəri yaradıldıqdan sonra rezervasiya formuna yönləndir
                    const reservationFormPath = isAdmin 
                        ? `/admin/reservation-form?customerId=${response.data.id}` 
                        : `/reception/reservation-form?customerId=${response.data.id}`;
                    navigate(reservationFormPath);
                } else {
                navigate(customerPagePath);
                }
            }
            
        } catch (error) {
            console.error('Customer operation error:', error);
            const errorMessage = error.response?.data?.message || 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.';
            Alert.error('Xəta!', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? 'Müştəri Məlumatlarını Redaktə Et' : isPendingMode ? 'Pending Müştəri Təsdiq Et' : 'Yeni Müştəri'}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isEditMode ? 'Müştəri məlumatlarını yeniləyin' : isPendingMode ? 'Pending müştəri məlumatlarını yoxlayın və təsdiq edin' : 'Müştəri məlumatlarını daxil edin'}
                </p>
            </div>

            {/* Alert */}
            {alert.show && (
                <Alert
                    message={alert.message}
                    type={alert.type}
                    onClose={() => setAlert({ show: false, message: '', type: '' })}
                />
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdPerson className="inline w-5 h-5 mr-2" />
                        Şəxsi Məlumatlar
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Ad"
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange('firstName', e.target.value)}
                            error={errors.firstName}
                            placeholder="Adınızı daxil edin"
                            icon={<MdPerson />}
                            required
                        />
                        
                        <Input
                            label="Soyad"
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange('lastName', e.target.value)}
                            error={errors.lastName}
                            placeholder="Soyadınızı daxil edin"
                            icon={<MdPerson />}
                            required
                        />
                        
                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            error={errors.email}
                            placeholder="email@example.com"
                            icon={<MdEmail />}
                        />
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Telefon
                            </label>
                            <PhoneInput
                                country={'az'}
                                value={formData.phone}
                                onChange={(phone) => handleInputChange('phone', phone)}
                                inputStyle={{
                                    width: '100%',
                                    height: '42px',
                                    border: errors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    paddingLeft: '48px'
                                }}
                                buttonStyle={{
                                    border: errors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                                    borderRadius: '6px 0 0 6px'
                                }}
                                containerStyle={{
                                    width: '100%'
                                }}
                                placeholder="+994XXXXXXXXX"
                            />
                            {errors.phone && (
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                    <span className="text-red-500">⚠</span>
                                    {errors.phone}
                                </p>
                            )}
                        </div>
                        

                    </div>
                </div>

                {/* Reservations Section (only in edit mode) */}
                {isEditMode && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                <MdEvent className="inline w-5 h-5 mr-2" />
                                Rezervasiyalar
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    const isAdmin = location.pathname.includes('/admin');
                                    const reservationFormPath = isAdmin 
                                        ? `/admin/reservation-form?customerId=${id}` 
                                        : `/reception/reservation-form?customerId=${id}`;
                                    navigate(reservationFormPath);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2"
                            >
                                <MdEdit className="w-4 h-4" />
                                {reservations.length > 0 ? 'Yeni Rezervasiya' : 'Rezervasiya Əlavə Et'}
                            </button>
                        </div>
                        
                        {reservations.length > 0 ? (
                            <div className="space-y-3">
                                {reservations.map(reservation => {
                                    const checkIn = new Date(reservation.checkIndate).toLocaleDateString('az-AZ', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    const checkOut = new Date(reservation.checkOutdate).toLocaleDateString('az-AZ', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });
                                    const now = new Date();
                                    const checkInDate = new Date(reservation.checkIndate);
                                    const checkOutDate = new Date(reservation.checkOutdate);
                                    
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
                                    
                                    // Rezervasiya bitmişdirsə (check-out tarixi keçib və ya status CHECKED_OUT/CANCELED)
                                    const isFinished = reservation.status === 'CHECKED_OUT' || 
                                                      reservation.status === 'CANCELED' || 
                                                      (checkOutDate < now);
                                    
                                    const isActive = reservation.status === 'CHECKED_IN' && checkInDate <= now && checkOutDate >= now;
                                    
                                    return (
                                        <div 
                                            key={reservation.id} 
                                            className={`border rounded-lg p-4 ${
                                                isActive ? 'border-green-200 bg-green-50' : 
                                                isFinished ? 'border-gray-200 bg-gray-50' : 
                                                'border-gray-200 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Otaq: {reservation.room?.number || '-'} | Qonaq: {reservation.guestCount} nəfər
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        {checkIn} - {checkOut} | Status: {getStatusLabel(reservation.status)}
                                                    </p>
                                                </div>
                                                {!isFinished && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const isAdmin = location.pathname.includes('/admin');
                                                        const reservationFormPath = isAdmin 
                                                            ? `/admin/reservation-form?id=${reservation.id}` 
                                                            : `/reception/reservation-form?id=${reservation.id}`;
                                                        navigate(reservationFormPath);
                                                    }}
                                                    className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 flex items-center gap-1"
                                                >
                                                    <MdEdit className="w-4 h-4" />
                                                    Redaktə et
                                                </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>Hələlik rezervasiya yoxdur</p>
                            </div>
                        )}
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
                        className="px-6 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {isEditMode ? 'Yenilənir...' : 'Əlavə edilir...'}
                            </>
                        ) : (
                            isEditMode ? 'Yenilə' : isPendingMode ? 'Təsdiq Et və Müştəri Əlavə Et' : 'Müştəri Əlavə Et'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

