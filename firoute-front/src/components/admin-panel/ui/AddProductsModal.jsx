import React, { useState } from 'react';
import ModalLayout from '../../ui/ModalLayout';
import Input from '../../ui/Input';

export default function AddProductsModal({ isOpen, onClose, onSubmit, isLoading = false }) {
    const [formData, setFormData] = useState({
        barcode: '',
        name: '',
        imageUrl: '',
        halalStatus: 'UNKNOWN',
        halalNotes: '',
        isActive: true,
        locales: [
            { lang: 'en', name: '' },
            { lang: 'az', name: '' }
        ]
    });

    const [errors, setErrors] = useState({});

    const halalStatusOptions = [
        { value: 'UNKNOWN', label: 'Naməlum' },
        { value: 'HALAL', label: 'Halal' },
        { value: 'NON_HALAL', label: 'Halal deyil' },
        { value: 'DOUBTFUL', label: 'Şübhəli' }
    ];

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

    const handleLocaleChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            locales: prev.locales.map((locale, i) => 
                i === index ? { ...locale, [field]: value } : locale
            )
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.name.trim()) {
            newErrors.name = 'Məhsul adı tələb olunur';
        }
        
        if (formData.barcode && !/^\d+$/.test(formData.barcode)) {
            newErrors.barcode = 'Barkod yalnız rəqəmlərdən ibarət olmalıdır';
        }
        
        if (formData.imageUrl && !/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(formData.imageUrl)) {
            newErrors.imageUrl = 'Düzgün şəkil URL-i daxil edin';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (validateForm()) {
            onSubmit(formData);
            // Reset form
            setFormData({
                barcode: '',
                name: '',
                imageUrl: '',
                halalStatus: 'UNKNOWN',
                halalNotes: '',
                isActive: true,
                locales: [
                    { lang: 'en', name: '' },
                    { lang: 'az', name: '' }
                ]
            });
            setErrors({});
            onClose();
        }
    };

    return (
        <ModalLayout 
            isOpen={isOpen} 
            onClose={onClose}
            title="Yeni Məhsul Əlavə Et"
            className="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Əsas Məlumatlar</h3>
                    
                    {/* Product Name */}
                    <Input
                        label="Məhsul Adı"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Məhsul adını daxil edin"
                        required
                        error={errors.name}
                        errorMessage={errors.name}
                    />

                    {/* Barcode */}
                    <Input
                        label="Barkod"
                        value={formData.barcode}
                        onChange={(e) => handleInputChange('barcode', e.target.value)}
                        placeholder="Barkod nömrəsini daxil edin"
                        error={errors.barcode}
                        errorMessage={errors.barcode}
                    />

                    {/* Image URL */}
                    <Input
                        label="Şəkil URL-i"
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        error={errors.imageUrl}
                        errorMessage={errors.imageUrl}
                    />
                </div>

                {/* Halal Information */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Halal Məlumatları</h3>
                    
                    {/* Halal Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Halal Statusu
                        </label>
                        <select
                            value={formData.halalStatus}
                            onChange={(e) => handleInputChange('halalStatus', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {halalStatusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Halal Notes */}
                    <Input
                        label="Halal Qeydləri"
                        value={formData.halalNotes}
                        onChange={(e) => handleInputChange('halalNotes', e.target.value)}
                        placeholder="Halal statusu haqqında əlavə məlumatlar"
                        containerClassName="col-span-full"
                    />
                </div>

                {/* Localization */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Tərcümələr</h3>
                    
                    {formData.locales.map((locale, index) => (
                        <div key={index} className="flex gap-2">
                            <div className="w-20">
                                <Input
                                    label="Dil"
                                    value={locale.lang}
                                    onChange={(e) => handleLocaleChange(index, 'lang', e.target.value)}
                                    placeholder="en"
                                    size="sm"
                                />
                            </div>
                            <div className="flex-1">
                                <Input
                                    label="Ad"
                                    value={locale.name}
                                    onChange={(e) => handleLocaleChange(index, 'name', e.target.value)}
                                    placeholder="Product name"
                                    size="sm"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                        Məhsul aktivdir
                    </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    >
                        Ləğv Et
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Əlavə edilir...
                            </>
                        ) : (
                            'Əlavə Et'
                        )}
                    </button>
                </div>
            </form>
        </ModalLayout>
    );
}