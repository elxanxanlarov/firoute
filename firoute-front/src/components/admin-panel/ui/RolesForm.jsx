import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Input from '../../ui/Input';
import Alert from '../../ui/Alert';
import { Shield, ArrowLeft } from 'lucide-react';
import { roleAPI, authApi } from '../../../api';

export default function RolesForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    
    // Check if coming from admin or reception
    const isAdmin = location.pathname.includes('/admin');
    const rolesPagePath = isAdmin ? '/admin/roles-management' : '/reception/roles-management';
    
    // Determine mode: if id exists in query params, use edit mode, otherwise add mode
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isActive: true,
        isCore: false
    });
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSuperadmin, setIsSuperadmin] = useState(false);

    // Fetch current user to check if Superadmin
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await authApi.me();
                if (response.success && response.data) {
                    const roleName = response.data.role?.name || response.data.role || '';
                    setIsSuperadmin(roleName.toLowerCase() === 'superadmin');
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        fetchCurrentUser();
    }, []);

    // Fetch role data (if edit mode)
    useEffect(() => {
        const fetchData = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await roleAPI.getById(id);
                    if (response.success && response.data) {
                        const role = response.data;
                        setFormData({
                            name: role.name || '',
                            description: role.description || '',
                            isActive: role.isActive !== undefined ? role.isActive : true,
                            isCore: role.isCore || false
                        });
                    }
                } catch (error) {
                    console.error('Error fetching role:', error);
                    Alert.error('Xəta!', 'Rol məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
    }, [id, isEditMode]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) {
            newErrors.name = 'Rol adı tələb olunur';
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
                description: formData.description.trim() || null,
            };

            // Only Superadmin can set isCore
            if (isSuperadmin) {
                payload.isCore = formData.isCore;
            }

            // For update, include isActive
            if (isEditMode) {
                payload.isActive = formData.isActive;
            }

            if (isEditMode) {
                await roleAPI.update(id, payload);
                Alert.success('Uğurlu!', 'Rol məlumatları uğurla yeniləndi');
                navigate(rolesPagePath);
            } else {
                await roleAPI.create(payload);
                Alert.success('Uğurlu!', 'Rol uğurla əlavə edildi');
                navigate(rolesPagePath);
            }
            
        } catch (error) {
            console.error('Role operation error:', error);
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
                    onClick={() => navigate(rolesPagePath)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? 'Rol Məlumatlarını Redaktə Et' : 'Yeni Rol'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditMode ? 'Rol məlumatlarını yeniləyin' : 'Rol məlumatlarını daxil edin'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Role Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4 flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        Rol Məlumatları
                    </h3>
                    
                    <div className="space-y-6">
                        <Input
                            label="Rol adı"
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            error={errors.name}
                            placeholder="Məsələn: Manager, Operator"
                            icon={<Shield />}
                            required
                        />
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Təsvir
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Rolun təsvirini daxil edin (istəyə bağlı)"
                                rows={4}
                                className={`w-full px-3 py-2 text-base border rounded-md focus:outline-none focus:ring-2 transition-all ${
                                    errors.description 
                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
                                }`}
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                            )}
                        </div>

                        {isEditMode && (
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                                    Aktiv
                                </label>
                            </div>
                        )}

                        {isSuperadmin && (
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isCore"
                                    checked={formData.isCore}
                                    onChange={(e) => handleInputChange('isCore', e.target.checked)}
                                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                                />
                                <label htmlFor="isCore" className="ml-2 block text-sm text-gray-700">
                                    <span className="font-medium">Əsas Rol</span>
                                    <span className="text-gray-500 text-xs block mt-1">
                                        Əsas rollar silinə bilməz və yalnız Superadmin tərəfindən idarə oluna bilər
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(rolesPagePath)}
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
                            isEditMode ? 'Yenilə' : 'Rol Əlavə Et'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}