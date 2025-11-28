import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Input from '../../ui/Input';
import Alert from '../../ui/Alert';
import { Home, ArrowLeft } from 'lucide-react';
import { roomAPI } from '../../../api';

export default function RoomsForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    
    // Check if coming from admin or reception
    const isAdmin = location.pathname.includes('/admin');
    const roomPagePath = isAdmin ? '/admin/room-management' : '/reception/room-management';
    
    // Determine mode: if id exists in query params, use edit mode, otherwise add mode
    const isEditMode = !!id;
    
    const [formData, setFormData] = useState({
        number: '',
        floor: ''
    });
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    // Fetch room data (if edit mode)
    useEffect(() => {
        const fetchRoom = async () => {
            if (isEditMode && id) {
                try {
                    setIsLoading(true);
                    const response = await roomAPI.getById(id);
                    if (response.success && response.data) {
                        const room = response.data;
                        setFormData({
                            number: room.number || '',
                            floor: room.floor ? room.floor.toString() : ''
                        });
                    }
                } catch (error) {
                    console.error('Error fetching room:', error);
                    Alert.error('Xəta!', 'Otaq məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchRoom();
    }, [id, isEditMode]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.number.trim()) {
            newErrors.number = 'Otaq nömrəsi tələb olunur';
        }
        
        // Floor validasiyası (əgər daxil edilibsə)
        if (formData.floor && formData.floor.trim()) {
            const floorNum = parseInt(formData.floor);
            if (isNaN(floorNum) || floorNum < 0) {
                newErrors.floor = 'Mərtəbə müsbət rəqəm olmalıdır';
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
                number: formData.number.trim(),
                floor: formData.floor && formData.floor.trim() ? parseInt(formData.floor) : null
            };

            if (isEditMode) {
                await roomAPI.update(id.toString(), payload);
                Alert.success('Uğurlu!', 'Otaq məlumatları uğurla yeniləndi');
            } else {
                await roomAPI.create(payload);
                Alert.success('Uğurlu!', 'Otaq uğurla əlavə edildi');
            }
            
            // Navigate back after success
            navigate(roomPagePath);
            
        } catch (error) {
            console.error('Room operation error:', error);
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
                    onClick={() => navigate(roomPagePath)}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? 'Otaq Məlumatlarını Redaktə Et' : 'Yeni Otaq'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {isEditMode ? 'Otaq məlumatlarını yeniləyin' : 'Otaq məlumatlarını daxil edin'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4 flex items-center">
                        <Home className="w-5 h-5 mr-2" />
                        Əsas Məlumatlar
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Otaq Nömrəsi"
                            type="text"
                            value={formData.number}
                            onChange={(e) => handleInputChange('number', e.target.value)}
                            error={errors.number}
                            placeholder="101, 201, A101"
                            icon={<Home />}
                            required
                        />
                        
                        <Input
                            label="Mərtəbə"
                            type="number"
                            value={formData.floor}
                            onChange={(e) => handleInputChange('floor', e.target.value)}
                            error={errors.floor}
                            placeholder="1, 2, 3..."
                            icon={<Home />}
                        />
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => navigate(roomPagePath)}
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
                            isEditMode ? 'Yenilə' : 'Otaq Əlavə Et'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

