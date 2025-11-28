import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Input from '../../ui/Input';
import Alert from '../../ui/Alert';
import { MdRouter, MdSecurity, MdNetworkCheck } from 'react-icons/md';
import { routerAPI } from '../../../api';

const statusOptions = ['Active', 'Inactive', 'Maintenance'];
const networkInterfaceOptions = ['eth0', 'eth1', 'eth2', 'wlan0', 'wlan1'];

export default function RouterForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    
    // Check if coming from admin or reception
    const isAdmin = location.pathname.includes('/admin');
    const routerPagePath = isAdmin ? '/admin/router-management' : '/reception/router-management';
    
    // Determine mode: if id exists in query params, use edit mode, otherwise add mode
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        name: '',
        ip: '',
        port: '',
        username: '',
        password: '',
        networkInterface: '',
        status: 'Active'
    });
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });

    // Fetch router data (if edit mode)
    useEffect(() => {
        const fetchRouter = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await routerAPI.getById(id);
                    if (response.success && response.data) {
                        const router = response.data;
                        setFormData({
                            name: router.name || '',
                            ip: router.ip || '',
                            port: router.port || '',
                            username: router.username || '',
                            password: '', // Password göstərmə, yalnız dəyişdirilərsə daxil edilir
                            networkInterface: router.networkInterface || '',
                            status: router.status || 'Active'
                        });
                    }
                } catch (error) {
                    console.error('Error fetching router:', error);
                    Alert.error('Xəta!', 'Router məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchRouter();
    }, [id, isEditMode]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) {
            newErrors.name = 'Router adı tələb olunur';
        }
        
        if (!formData.ip.trim()) {
            newErrors.ip = 'IP ünvanı tələb olunur';
        } else {
            // IP formatını yoxla (sadə validasiya)
            const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
            if (!ipRegex.test(formData.ip.trim())) {
                newErrors.ip = 'Düzgün IP ünvanı daxil edin';
            }
        }
        
        if (!formData.port.trim()) {
            newErrors.port = 'Port tələb olunur';
        } else {
            const portNum = parseInt(formData.port);
            if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
                newErrors.port = 'Port 1-65535 aralığında olmalıdır';
            }
        }
        
        if (!formData.username.trim()) {
            newErrors.username = 'İstifadəçi adı tələb olunur';
        }
        
        // Password validation (only for create mode or if password is provided)
        if (!isEditMode) {
            if (!formData.password.trim()) {
                newErrors.password = 'Parol tələb olunur';
            } else if (formData.password.length < 6) {
                newErrors.password = 'Parol ən azı 6 simvol olmalıdır';
            }
        } else if (formData.password.trim() && formData.password.length < 6) {
            newErrors.password = 'Parol ən azı 6 simvol olmalıdır';
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
                name: formData.name.trim(),
                ip: formData.ip.trim(),
                port: formData.port.trim(),
                username: formData.username.trim(),
                networkInterface: formData.networkInterface?.trim() || null,
                status: formData.status
            };

            // Add password only if provided (create mode or update with password change)
            if (!isEditMode || formData.password.trim()) {
                payload.password = formData.password.trim();
            }

            if (isEditMode) {
                await routerAPI.update(id.toString(), payload);
                Alert.success('Uğurlu!', 'Router məlumatları uğurla yeniləndi');
            } else {
                await routerAPI.create(payload);
                Alert.success('Uğurlu!', 'Router uğurla əlavə edildi');
            }
            
            // Navigate back after success
            navigate(routerPagePath);
            
        } catch (error) {
            console.error('Router operation error:', error);
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
                    {isEditMode ? 'Router Məlumatlarını Redaktə Et' : 'Yeni Router'}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isEditMode ? 'Router məlumatlarını yeniləyin' : 'Router məlumatlarını daxil edin'}
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
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdRouter className="inline w-5 h-5 mr-2" />
                        Əsas Məlumatlar
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Router Adı"
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            error={errors.name}
                            placeholder="Router-001"
                            icon={<MdRouter />}
                            required
                        />
                        
                        <Input
                            label="IP Ünvanı"
                            type="text"
                            value={formData.ip}
                            onChange={(e) => handleInputChange('ip', e.target.value)}
                            error={errors.ip}
                            placeholder="192.168.1.1"
                            icon={<MdNetworkCheck />}
                            required
                        />
                        
                        <Input
                            label="Port"
                            type="text"
                            value={formData.port}
                            onChange={(e) => handleInputChange('port', e.target.value)}
                            error={errors.port}
                            placeholder="8080"
                            icon={<MdNetworkCheck />}
                            required
                        />
                        
                        <Input
                            label="İstifadəçi Adı"
                            type="text"
                            value={formData.username}
                            onChange={(e) => handleInputChange('username', e.target.value)}
                            error={errors.username}
                            placeholder="admin"
                            icon={<MdSecurity />}
                            required
                        />
                    </div>
                </div>

                {/* Network Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdNetworkCheck className="inline w-5 h-5 mr-2" />
                        Şəbəkə Məlumatları
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Şəbəkə Interfeysi
                            </label>
                            <select
                                value={formData.networkInterface}
                                onChange={(e) => handleInputChange('networkInterface', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seçin</option>
                                {networkInterfaceOptions.map(iface => (
                                    <option key={iface} value={iface}>
                                        {iface}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status - Only in edit mode */}
                        {isEditMode && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => handleInputChange('status', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {statusOptions.map(status => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Password Information - Only for create or if password is being changed */}
                {(!isEditMode || formData.password) && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                            <MdSecurity className="inline w-5 h-5 mr-2" />
                            Parol Məlumatları
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Parol"
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                error={errors.password}
                                placeholder="Parol daxil edin"
                                icon={<MdSecurity />}
                                required={!isEditMode}
                            />
                        </div>
                        {isEditMode && (
                            <p className="mt-2 text-xs text-gray-500">
                                Parol dəyişdirmək istəmirsinizsə, bu sahəni boş buraxın
                            </p>
                        )}
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(routerPagePath)}
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
                                {isEditMode ? 'Yenilənir...' : 'Əlavə edilir...'}
                            </>
                        ) : (
                            isEditMode ? 'Yenilə' : 'Router Əlavə Et'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

