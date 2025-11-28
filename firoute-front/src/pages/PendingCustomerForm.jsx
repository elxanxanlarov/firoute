import React, { useState } from 'react';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import { MdPerson, MdCalendarToday, MdPeople, MdEvent, MdSend, MdInfo } from 'react-icons/md';
import { pendingCustomerAPI } from '../api/pendingCustomerAPI';

export default function PendingCustomerForm() {
    
    // Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        activityStartDate: getTodayDate(), // Default: bu gün
        activityEndDate: '',
        maxConnections: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'Ad tələb olunur';
        }
        
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Soyad tələb olunur';
        }
        
        if (!formData.activityStartDate) {
            newErrors.activityStartDate = 'Aktivlik başlanğıc tarixi tələb olunur';
        } else {
            // Keçən günləri yoxla
            const startDate = new Date(formData.activityStartDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (startDate < today) {
                newErrors.activityStartDate = 'Keçən günləri seçmək olmaz';
            }
        }
        
        if (formData.activityEndDate && formData.activityStartDate) {
            const startDate = new Date(formData.activityStartDate);
            const endDate = new Date(formData.activityEndDate);
            if (endDate < startDate) {
                newErrors.activityEndDate = 'Bitiş tarixi başlanğıc tarixindən kiçik ola bilməz';
            }
        }
        
        if (formData.maxConnections && (isNaN(formData.maxConnections) || parseInt(formData.maxConnections) < 1)) {
            newErrors.maxConnections = 'Maksimum giriş ən azı 1 olmalıdır';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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
                activityStartDate: formData.activityStartDate || getTodayDate(),
                activityEndDate: formData.activityEndDate || null,
                maxConnections: formData.maxConnections ? parseInt(formData.maxConnections) : null
            };

            await pendingCustomerAPI.create(payload);
            
            Alert.success(
                'Müştəri sorğusu göndərildi!',
                'Müştəri sorğusu gözləmə siyahısına əlavə edildi. Təsdiq gözləyir.'
            );
            
            // Reset form instead of navigating away
            setFormData({
                firstName: '',
                lastName: '',
                activityStartDate: getTodayDate(),
                activityEndDate: '',
                maxConnections: ''
            });
            setErrors({});
            
        } catch (error) {
            console.error('Pending customer creation error:', error);
            
            // Handle backend validation errors
            const errorResponse = error.response?.data;
            let errorMessage = errorResponse?.message || 'Müştəri sorğusu göndərilərkən xəta baş verdi.';
            const errorField = errorResponse?.field;
            
            // Check if it's a duplicate phone or email error
            const isPhoneOrEmailError = errorField === 'phone' || errorField === 'email' || 
                                       errorMessage.toLowerCase().includes('telefon') || 
                                       errorMessage.toLowerCase().includes('email') ||
                                       errorMessage.toLowerCase().includes('nömrə');
            
            // Set field-specific errors
            if (errorField && errorResponse?.message) {
                setErrors(prev => ({
                    ...prev,
                    [errorField]: errorMessage
                }));
            }
            
            // Don't show swal for phone/email errors, only show in form
            if (!isPhoneOrEmailError) {
                Alert.error('Xəta!', errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-4 sm:py-6 md:py-8 px-3 sm:px-4">
            <div className="max-w-5xl mx-auto">
                {/* Header with gradient */}
                <div className="mb-6 sm:mb-8 text-center px-2">
                    <div className="inline-block p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-lg mb-3 sm:mb-4">
                        <MdEvent className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 px-2 break-words">
                        Yeni Müştəri Sorğusu
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base md:text-lg px-2 break-words">Müştəri sorğusu məlumatlarını daxil edin</p>
                </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Personal Information */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-gradient-to-r from-blue-500 to-indigo-500 border-b-blue-200">
                        <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg mr-2 sm:mr-3 flex-shrink-0">
                            <MdPerson className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 break-words">
                            Şəxsi Məlumatlar
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="transform transition-all duration-200 hover:scale-[1.02]">
                            <Input
                                label="Ad"
                                type="text"
                                placeholder="Adınızı daxil edin"
                                value={formData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                leftIcon={<MdPerson />}
                                error={errors.firstName}
                                errorMessage={errors.firstName}
                                required
                            />
                        </div>
                        
                        <div className="transform transition-all duration-200 hover:scale-[1.02]">
                            <Input
                                label="Soyad"
                                type="text"
                                placeholder="Soyadınızı daxil edin"
                                value={formData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                leftIcon={<MdPerson />}
                                error={errors.lastName}
                                errorMessage={errors.lastName}
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                        <div className="transform transition-all duration-200 hover:scale-[1.02]">
                            <Input
                                label="Maksimum Giriş"
                                type="number"
                                placeholder="Maksimum giriş sayı"
                                value={formData.maxConnections}
                                onChange={(e) => handleInputChange('maxConnections', e.target.value)}
                                leftIcon={<MdPeople />}
                                error={errors.maxConnections}
                                errorMessage={errors.maxConnections}
                                min="1"
                            />
                        </div>
                    </div>
                </div>

                {/* Aktivlik Məlumatları */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 md:p-8 hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-b-indigo-200">
                        <div className="p-1.5 sm:p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg mr-2 sm:mr-3 flex-shrink-0">
                            <MdEvent className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800 break-words">
                            Aktivlik Məlumatları
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div className="transform transition-all duration-200 hover:scale-[1.02]">
                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex-wrap">
                                <MdCalendarToday className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-indigo-600 flex-shrink-0" />
                                <span className="break-words">Aktivlik Başlanğıc Tarixi</span>
                                <span className="text-red-500 ml-1 flex-shrink-0">*</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-indigo-500 group-hover:text-indigo-600 transition-colors">
                                    <MdCalendarToday className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <input
                                    type="date"
                                    value={formData.activityStartDate}
                                    onChange={(e) => handleInputChange('activityStartDate', e.target.value)}
                                    min={getTodayDate()}
                                    className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base ${
                                        errors.activityStartDate 
                                            ? 'border-red-400 bg-red-50' 
                                            : 'border-gray-200 bg-white hover:border-indigo-300'
                                    }`}
                                    required
                                />
                            </div>
                            {errors.activityStartDate && (
                                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-600 flex items-start sm:items-center break-words">
                                    <MdInfo className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5 sm:mt-0" />
                                    <span>{errors.activityStartDate}</span>
                                </p>
                            )}
                            <p className="mt-1.5 sm:mt-2 text-xs text-gray-500 flex items-start sm:items-center break-words">
                                <MdInfo className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5 sm:mt-0" />
                                <span>Keçən günləri seçmək olmaz</span>
                            </p>
                        </div>
                        
                        <div className="transform transition-all duration-200 hover:scale-[1.02]">
                            <label className="flex items-center text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex-wrap">
                                <MdCalendarToday className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-indigo-600 flex-shrink-0" />
                                <span className="break-words">Aktivlik Bitiş Tarixi</span>
                            </label>
                            <div className="relative group">
                                <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-indigo-500 group-hover:text-indigo-600 transition-colors">
                                    <MdCalendarToday className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <input
                                    type="date"
                                    value={formData.activityEndDate}
                                    onChange={(e) => handleInputChange('activityEndDate', e.target.value)}
                                    min={formData.activityStartDate || getTodayDate()}
                                    className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border-2 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm sm:text-base ${
                                        errors.activityEndDate 
                                            ? 'border-red-400 bg-red-50' 
                                            : 'border-gray-200 bg-white hover:border-indigo-300'
                                    }`}
                                />
                            </div>
                            {errors.activityEndDate && (
                                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-red-600 flex items-start sm:items-center break-words">
                                    <MdInfo className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0 mt-0.5 sm:mt-0" />
                                    <span>{errors.activityEndDate}</span>
                                </p>
                            )}
                            <p className="mt-1.5 sm:mt-2 text-xs text-gray-500 flex items-start sm:items-center break-words">
                                <MdInfo className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5 sm:mt-0" />
                                <span>Boş buraxıla bilər</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-center pt-6 sm:pt-8 px-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 sm:py-3.5 md:py-4 text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-lg sm:rounded-xl shadow-lg hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center overflow-hidden"
                    >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white mr-2 sm:mr-3 relative z-10" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="relative z-10 whitespace-nowrap">Göndərilir...</span>
                            </>
                        ) : (
                            <>
                                <MdSend className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 relative z-10 transform group-hover:translate-x-1 transition-transform flex-shrink-0" />
                                <span className="relative z-10 whitespace-nowrap">Sorğu Göndər</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
            </div>
        </div>
    );
}
