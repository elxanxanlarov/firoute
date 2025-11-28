import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Input from '../../ui/Input';
import Alert from '../../ui/Alert';
import { Settings, ArrowLeft } from 'lucide-react';
import { radiusProfileAPI } from '../../../api';

// Sürət seçimləri (Mbit)
const speedOptions = [
    { value: 10, label: '10 Mbit' },
    { value: 20, label: '20 Mbit' },
    { value: 50, label: '50 Mbit' }
];

// Session müddəti seçimləri
const sessionOptions = [
    { value: 1, label: '1 saat' },
    { value: 12, label: '12 saat' },
    { value: 24, label: '24 saat' },
    { value: null, label: 'Limitsiz' }
];

export default function RadiusProfileForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const groupname = searchParams.get('groupname');
    
    // Check if coming from admin or reception
    const isAdmin = location.pathname.includes('/admin');
    const profilePagePath = isAdmin ? '/admin/radius-profiles' : '/reception/radius-profiles';
    
    // Determine mode: if groupname exists in query params, use edit mode, otherwise add mode
    const isEditMode = !!groupname;
    
    const [formData, setFormData] = useState({
        displayName: '',
        maxGuests: '',
        downloadMbps: '',
        uploadMbps: '',
        sessionHours: ''
    });
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Fetch profile data (if edit mode)
    useEffect(() => {
        const fetchProfile = async () => {
            if (isEditMode && groupname) {
                try {
                    setIsLoading(true);
                    const response = await radiusProfileAPI.getByGroupname(groupname);
                    if (response.success && response.data) {
                        const profile = response.data;
                        
                        // Attribute-lardan məlumatları çıxar
                        let downloadMbps = '';
                        let uploadMbps = '';
                        let sessionHours = '';
                        let displayName = profile.displayName || profile.groupname;
                        
                        profile.attributes.forEach(attr => {
                            if (attr.attribute === 'WISPr-Bandwidth-Max-Down') {
                                downloadMbps = (parseInt(attr.value) / 1000000).toString();
                            } else if (attr.attribute === 'WISPr-Bandwidth-Max-Up') {
                                uploadMbps = (parseInt(attr.value) / 1000000).toString();
                            } else if (attr.attribute === 'Session-Timeout') {
                                const hours = parseInt(attr.value) / 3600;
                                sessionHours = hours.toString();
                            }
                        });
                        
                        setFormData({
                            displayName: displayName,
                            maxGuests: '',
                            downloadMbps: downloadMbps,
                            uploadMbps: uploadMbps,
                            sessionHours: sessionHours || '24'
                        });
                    }
                } catch (error) {
                    console.error('Error fetching profile:', error);
                    Alert.error('Xəta!', 'Profil məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchProfile();
    }, [groupname, isEditMode]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.displayName.trim()) {
            newErrors.displayName = 'Profil adı tələb olunur';
        }
        
        if (!formData.maxGuests || parseInt(formData.maxGuests) < 1) {
            newErrors.maxGuests = 'Nəfər sayı ən azı 1 olmalıdır';
        }
        
        if (!formData.downloadMbps) {
            newErrors.downloadMbps = 'Download sürəti seçilməlidir';
        }
        
        if (!formData.uploadMbps) {
            newErrors.uploadMbps = 'Upload sürəti seçilməlidir';
        }
        
        if (formData.sessionHours === '') {
            newErrors.sessionHours = 'Session müddəti seçilməlidir';
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
                displayName: formData.displayName.trim(),
                maxGuests: parseInt(formData.maxGuests),
                downloadMbps: parseInt(formData.downloadMbps),
                uploadMbps: parseInt(formData.uploadMbps),
                sessionHours: formData.sessionHours === 'null' || formData.sessionHours === '' ? null : parseInt(formData.sessionHours)
            };

            if (isEditMode) {
                await radiusProfileAPI.update(groupname, payload);
                Alert.success('Uğurlu!', 'Profil məlumatları uğurla yeniləndi');
            } else {
                await radiusProfileAPI.create(payload);
                Alert.success('Uğurlu!', 'Profil uğurla əlavə edildi');
            }
            
            // Navigate back after success
            navigate(profilePagePath);
            
        } catch (error) {
            console.error('Profile operation error:', error);
            const errorMessage = error.response?.data?.message || 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.';
            Alert.error('Xəta!', errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center gap-4">
                <button
                    onClick={() => navigate(profilePagePath)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? 'Profil Məlumatlarını Redaktə Et' : 'Yeni Radius Profili'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditMode ? 'Profil məlumatlarını yeniləyin' : 'Radius profil məlumatlarını daxil edin'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        Əsas Məlumatlar
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Profil Adı (Görünən ad)"
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => handleInputChange('displayName', e.target.value)}
                            error={errors.displayName}
                            placeholder="3 nəfərlik otaq"
                            icon={<Settings />}
                            required
                        />
                        
                        <Input
                            label="Neçə nəfər istifadə edə bilər"
                            type="number"
                            value={formData.maxGuests}
                            onChange={(e) => handleInputChange('maxGuests', e.target.value)}
                            error={errors.maxGuests}
                            placeholder="3"
                            icon={<Settings />}
                            required
                            min="1"
                        />
                    </div>
                </div>

                {/* Network Settings */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        Şəbəkə Parametrləri
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Download Sürəti <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.downloadMbps}
                                onChange={(e) => handleInputChange('downloadMbps', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                    errors.downloadMbps ? 'border-red-500' : 'border-gray-300'
                                }`}
                                required
                            >
                                <option value="">Seçin</option>
                                {speedOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            {errors.downloadMbps && (
                                <p className="mt-1 text-xs text-red-600">{errors.downloadMbps}</p>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Upload Sürəti <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.uploadMbps}
                                onChange={(e) => handleInputChange('uploadMbps', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                    errors.uploadMbps ? 'border-red-500' : 'border-gray-300'
                                }`}
                                required
                            >
                                <option value="">Seçin</option>
                                {speedOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            {errors.uploadMbps && (
                                <p className="mt-1 text-xs text-red-600">{errors.uploadMbps}</p>
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Session Müddəti <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.sessionHours}
                                onChange={(e) => handleInputChange('sessionHours', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                    errors.sessionHours ? 'border-red-500' : 'border-gray-300'
                                }`}
                                required
                            >
                                <option value="">Seçin</option>
                                {sessionOptions.map(opt => (
                                    <option key={opt.value || 'null'} value={opt.value || 'null'}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                            {errors.sessionHours && (
                                <p className="mt-1 text-xs text-red-600">{errors.sessionHours}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(profilePagePath)}
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Ləğv et
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-3 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
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
                            isEditMode ? 'Yenilə' : 'Profil Əlavə Et'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
