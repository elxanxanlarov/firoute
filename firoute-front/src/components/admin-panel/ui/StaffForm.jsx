import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Input from '../../ui/Input';
import Alert from '../../ui/Alert';
import { MdPerson, MdEmail, MdPhone, MdLocationOn, MdSecurity } from 'react-icons/md';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { userAPI, roleAPI, authApi } from '../../../api';

export default function StaffForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    
    // Check if coming from admin or reception
    const isAdmin = location.pathname.includes('/admin');
    const staffPagePath = isAdmin ? '/admin/staff' : '/reception/staff';
    
    // Determine mode: if id exists in query params, use edit mode, otherwise add mode
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        confirmPassword: '',
        roleId: '',
        isActive: true
    });
    
    const [roles, setRoles] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    console.log("currentUser", currentUser);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });

    // Fetch current user
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const response = await authApi.me();
                if (response.success && response.data) {
                    setCurrentUser(response.data);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };
        fetchCurrentUser();
    }, []);
    // Fetch roles
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await roleAPI.getAll();
                if (response.success && response.data) {
                    // Filter out Superadmin role if current user is not Superadmin
                    let filteredRoles = response.data;
                    const currentRoleName = currentUser?.role || '';
                    if (currentRoleName.toLowerCase() !== 'superadmin') {
                        filteredRoles = response.data.filter(role => 
                            role.name.toLowerCase() !== 'superadmin'
                        );
                    }
                    setRoles(filteredRoles);
                }
            } catch (error) {
                console.error('Error fetching roles:', error);
            }
        };

        if (currentUser) {
            fetchRoles();
        }
    }, [currentUser]);

    // Fetch user data (if edit mode) - only after currentUser is set
    useEffect(() => {
        const fetchUser = async () => {
            if (isEditMode && id && currentUser) {
                try {
                    setIsLoading(true);
                    const response = await userAPI.getById(id);
                    if (response.success && response.data) {
                        const user = response.data;
                        
                        const currentRoleName = currentUser?.role || '';
                        const isCurrentSuperadmin = currentRoleName.toLowerCase() === 'superadmin';
                        
                        console.log('Current user:', currentUser);
                        console.log('Current user role:', currentRoleName);
                        console.log('Is current superadmin:', isCurrentSuperadmin);
                        console.log('Target user role:', user.role?.name || user.role);
                        
                        const roleName = user.role?.name || user.role || '';
                        if (roleName.toLowerCase() === 'superadmin' && !isCurrentSuperadmin) {
                            Alert.error('Xəta!', 'Superadmin yalnız Superadmin tərəfindən redaktə edilə bilər');
                            navigate(staffPagePath);
                            return;
                        }
                        
                        setFormData({
                            firstName: user.firstName || '',
                            lastName: user.lastName || '',
                            email: user.email || '',
                            phone: user.phone || '',
                            address: user.address || '',
                            password: '',
                            confirmPassword: '',
                            roleId: user.roleId?.toString() || '',
                            isActive: user.isActive !== undefined ? user.isActive : true
                        });
                    }
                } catch (error) {
                    console.error('Error fetching user:', error);
                    Alert.error('Xəta!', 'İşçi məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchUser();
    }, [id, isEditMode, currentUser, navigate, staffPagePath]);

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
        
        if (!formData.roleId) {
            newErrors.roleId = 'Rol seçilməlidir';
        }
        
        // Password validation (only for create mode or if password is provided)
        if (!isEditMode) {
            if (!formData.password.trim()) {
                newErrors.password = 'Parol tələb olunur';
            } else if (formData.password.length < 6) {
                newErrors.password = 'Parol ən azı 6 simvol olmalıdır';
            }
            
            if (formData.password !== formData.confirmPassword) {
                newErrors.confirmPassword = 'Parollar uyğun gəlmir';
            }
        } else if (formData.password.trim() && formData.password.length < 6) {
            newErrors.password = 'Parol ən azı 6 simvol olmalıdır';
        } else if (formData.password && formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Parollar uyğun gəlmir';
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
        
        // Check if user is trying to assign Superadmin role
        const selectedRole = roles.find(role => role.id.toString() === formData.roleId.toString());
        if (selectedRole && selectedRole.name.toLowerCase() === 'superadmin') {
            // Double check - even if Superadmin role is in the list, verify current user is Superadmin
            const currentRoleName = currentUser?.role || '';
            if (!currentUser || currentRoleName.toLowerCase() !== 'superadmin') {
                Alert.error('Xəta!', 'Yalnız Superadmin Superadmin roluna sahib istifadəçi yarada bilər');
                return;
            }
        }
        
        setIsLoading(true);
        
        try {
            const payload = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                phone: formData.phone?.trim() || null,
                address: formData.address?.trim() || null,
                roleId: formData.roleId.toString(),
                isActive: formData.isActive
            };

            // Add password only if provided (create mode or update with password change)
            if (!isEditMode || formData.password.trim()) {
                payload.password = formData.password.trim();
            }

            if (isEditMode) {
                await userAPI.update(id.toString(), payload);
                Alert.success('Uğurlu!', 'İşçi məlumatları uğurla yeniləndi');
            } else {
                await userAPI.create(payload);
                Alert.success('Uğurlu!', 'İşçi uğurla əlavə edildi');
            }
            
            // Navigate back after success
            navigate(staffPagePath);
            
        } catch (error) {
            console.error('Staff operation error:', error);
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
                    {isEditMode ? 'İşçi Məlumatlarını Redaktə Et' : 'Yeni İşçi'}
                </h1>
                <p className="text-gray-600 mt-1">
                    {isEditMode ? 'İşçi məlumatlarını yeniləyin' : 'İşçi məlumatlarını daxil edin'}
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
                        
                        <div className="md:col-span-2">
                            <Input
                                label="Ünvan"
                                type="text"
                                value={formData.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                error={errors.address}
                                placeholder="Ünvanınızı daxil edin"
                                icon={<MdLocationOn />}
                            />
                        </div>
                    </div>
                </div>

                {/* Role Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                        <MdSecurity className="inline w-5 h-5 mr-2" />
                        İcazə Məlumatları
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rol <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.roleId}
                                onChange={(e) => handleInputChange('roleId', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.roleId ? 'border-red-500' : 'border-gray-300'
                                }`}
                            >
                                <option value="">Rol seçin</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id.toString()}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            {errors.roleId && (
                                <p className="mt-1 text-sm text-red-600">{errors.roleId}</p>
                            )}
                        </div>

                        {/* Active Status - Only in edit mode */}
                        {isEditMode && (
                            <div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        İşçi aktivdir
                                    </span>
                                </label>
                                <p className="mt-1 text-xs text-gray-500">
                                    Deaktiv işçilər sistemə giriş edə bilməzlər
                                </p>
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
                            
                            <Input
                                label="Parolu Təsdiqlə"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                error={errors.confirmPassword}
                                placeholder="Parolu yenidən daxil edin"
                                icon={<MdSecurity />}
                                required={!isEditMode}
                            />
                        </div>
                        {isEditMode && (
                            <p className="mt-2 text-xs text-gray-500">
                                Parol dəyişdirmək istəmirsinizsə, bu sahələri boş buraxın
                            </p>
                        )}
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(staffPagePath)}
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
                            isEditMode ? 'Yenilə' : 'İşçi Əlavə Et'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
