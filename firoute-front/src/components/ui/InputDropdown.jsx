import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export default function InputDropdown({
    options = [],
    value,
    onChange,
    placeholder = 'Seçin və ya axtarın...',
    searchPlaceholder = 'Axtarış...',
    label,
    error,
    required = false,
    multiple = false,
    getOptionLabel = (option) => option.label || option.name || option.toString(),
    getOptionValue = (option) => option.value || option.id || option,
    renderOption = null,
    disabled = false,
    className = '',
    isOptionDisabled = null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Filter options based on search term
    const filteredOptions = options.filter(option => {
        const label = getOptionLabel(option).toLowerCase();
        return label.includes(searchTerm.toLowerCase());
    });

    // Get selected values
    const selectedValues = multiple 
        ? (Array.isArray(value) ? value : [])
        : (value ? [value] : []);

    // Get display text
    const getDisplayText = () => {
        if (multiple) {
            if (selectedValues.length === 0) return placeholder;
            if (selectedValues.length === 1) {
                const option = options.find(opt => getOptionValue(opt) === selectedValues[0]);
                return option ? getOptionLabel(option) : placeholder;
            }
            return `${selectedValues.length} element seçildi`;
        } else {
            if (!value) return placeholder;
            const option = options.find(opt => getOptionValue(opt) === value);
            return option ? getOptionLabel(option) : placeholder;
        }
    };

    // Handle option selection
    const handleSelect = (option) => {
        const optionValue = getOptionValue(option);
        
        if (multiple) {
            const currentValues = Array.isArray(value) ? value : [];
            if (currentValues.includes(optionValue)) {
                // Deselect
                onChange(currentValues.filter(v => v !== optionValue));
            } else {
                // Select
                onChange([...currentValues, optionValue]);
            }
        } else {
            onChange(optionValue);
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    // Handle remove selected item (for multiple)
    const handleRemove = (optionValue, e) => {
        e.stopPropagation();
        if (multiple && Array.isArray(value)) {
            onChange(value.filter(v => v !== optionValue));
        }
    };

    // Check if option is selected
    const isSelected = (option) => {
        const optionValue = getOptionValue(option);
        if (multiple) {
            return Array.isArray(value) && value.includes(optionValue);
        } else {
            return value === optionValue;
        }
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`relative w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                    error ? 'border-red-500' : 'border-gray-300'
                } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            >
                <div className="flex items-center justify-between">
                    <span className={`${!value || (multiple && selectedValues.length === 0) ? 'text-gray-400' : 'text-gray-900'}`}>
                        {getDisplayText()}
                    </span>
                    <div className="flex items-center gap-1">
                        {multiple && selectedValues.length > 0 && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                {selectedValues.length}
                            </span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
                    </div>
                </div>
            </div>

            {error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            )}

            {/* Selected items (for multiple) */}
            {multiple && selectedValues.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {selectedValues.map(val => {
                        const option = options.find(opt => getOptionValue(opt) === val);
                        if (!option) return null;
                        return (
                            <span
                                key={val}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md"
                            >
                                {getOptionLabel(option)}
                                <button
                                    type="button"
                                    onClick={(e) => handleRemove(val, e)}
                                    className="hover:text-blue-900"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Dropdown menu */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {/* Search input */}
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options list */}
                    <div className="py-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                Nəticə tapılmadı
                            </div>
                        ) : (
                            filteredOptions.map((option, index) => {
                                const optionValue = getOptionValue(option);
                                const selected = isSelected(option);
                                const isDisabled = isOptionDisabled ? isOptionDisabled(option) : false;
                                
                                return (
                                    <div
                                        key={index}
                                        onClick={() => !isDisabled && handleSelect(option)}
                                        className={`px-3 py-2 transition-colors ${
                                            isDisabled 
                                                ? 'bg-gray-100 cursor-not-allowed opacity-50' 
                                                : 'cursor-pointer hover:bg-blue-50'
                                        } ${
                                            selected ? 'bg-blue-100' : ''
                                        }`}
                                    >
                                        {renderOption ? (
                                            renderOption(option, selected, isDisabled)
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className={`text-sm ${selected ? 'font-medium text-blue-900' : isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                                                    {getOptionLabel(option)}
                                                    {isDisabled && (
                                                        <span className="ml-2 text-xs text-red-600">(Məşğul)</span>
                                                    )}
                                                </span>
                                                {selected && !isDisabled && (
                                                    <span className="text-blue-600">✓</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

