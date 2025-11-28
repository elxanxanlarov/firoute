import React, { useState, useEffect, useRef } from 'react';
import {
    MdAccessTime,
    MdCheckCircle,
    MdEvent,
    MdCancel
} from 'react-icons/md';
import { Search } from 'lucide-react';
import { systemActivityAPI } from '../../api';
import { 
    initializeSocket, 
    joinActivityRoom, 
    leaveActivityRoom, 
    onNewActivity, 
    offNewActivity,
    disconnectSocket 
} from '../../utils/socket.js';

const ActivityLog = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const searchTimeoutRef = useRef(null);
    
    // Pagination and filter states
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
    });
    
    // Default date range to today
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };
    
    const [dateRange, setDateRange] = useState(() => {
        const today = getTodayDate();
        return { start: today, end: today };
    });
    const [datePreset, setDatePreset] = useState('today');

    const filterOptions = [
        { value: 'all', label: 'Hamısı' },
        { value: 'success', label: 'Uğurlu' },
        { value: 'info', label: 'Məlumat' },
        { value: 'warning', label: 'Xəbərdarlıq' }
    ];

    // Format time ago
    const getTimeAgo = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'İndi';
        if (minutes < 60) return `${minutes} dəqiqə əvvəl`;
        if (hours < 24) return `${hours} saat əvvəl`;
        return `${days} gün əvvəl`;
    };

    // Format date
    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('az-AZ', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Debounce search term - wait 500ms after user stops typing
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // 500ms delay

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchTerm]);

    // Fetch activities with pagination and filters
    const fetchActivities = async (page = pagination.page, limit = pagination.limit, startDate = dateRange.start, endDate = dateRange.end, search = debouncedSearchTerm, actionType = selectedFilter) => {
        try {
            setLoading(true);
            const params = {
                page,
                limit
            };
            
            // Only add date params if preset is not 'all'
            if (datePreset !== 'all') {
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
            }
            
            // Add search if it has value
            if (search && typeof search === 'string' && search.trim().length > 0) {
                params.search = search.trim();
            }
            
            if (actionType && actionType !== 'all') params.actionType = actionType;
            
            const result = await systemActivityAPI.getAll(params);
            
            if (result.success) {
                setActivities(result.data || []);
                setPagination(result.pagination);
            } else {
                console.error('Failed to fetch activities:', result);
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch activities when filters change - reset to page 1
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [debouncedSearchTerm, selectedFilter, datePreset, dateRange.start, dateRange.end]);

    // Fetch activities when pagination or filters change
    useEffect(() => {
        fetchActivities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, dateRange.start, dateRange.end, datePreset, debouncedSearchTerm, selectedFilter]);

    // WebSocket inteqrasiyası - real-time aktivlik yeniləməsi
    useEffect(() => {
        // Socket bağlantısını başlat
        const socket = initializeSocket();
        
        // Aktivlik room-una qoşul
        const connectAndJoin = () => {
            if (socket && socket.connected) {
                joinActivityRoom();
            }
        };
        
        connectAndJoin();
        
        // Əgər socket hələ bağlanmayıbsa, connect event-ini dinlə
        if (!socket.connected) {
            socket.on('connect', connectAndJoin);
        }

        // Yeni aktivlik event-ini dinlə
        const handleNewActivity = (newActivity) => {
            // Yalnız əgər filter-lərə uyğundursa əlavə et
            const matchesFilter = selectedFilter === 'all' || newActivity.actionType === selectedFilter;
            const matchesDateRange = () => {
                if (datePreset === 'all') return true;
                const activityDate = new Date(newActivity.createdAt).toISOString().split('T')[0];
                return activityDate >= dateRange.start && activityDate <= dateRange.end;
            };
            const matchesSearch = () => {
                if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) return true;
                const searchLower = debouncedSearchTerm.toLowerCase();
                const message = (newActivity.message || '').toLowerCase();
                const performedBy = (newActivity.performedBy || '').toLowerCase();
                const customerName = newActivity.customer 
                    ? `${newActivity.customer.firstName || ''} ${newActivity.customer.lastName || ''}`.toLowerCase()
                    : '';
                return message.includes(searchLower) || 
                       performedBy.includes(searchLower) || 
                       customerName.includes(searchLower);
            };

            if (matchesFilter && matchesDateRange() && matchesSearch()) {
                // Yeni aktivliyi siyahının başına əlavə et
                setActivities(prev => {
                    // Əgər aktivlik artıq varsa, əlavə etmə
                    if (prev.some(a => a.id === newActivity.id)) {
                        return prev;
                    }
                    // Yeni aktivliyi əlavə et və limit-ə görə kəsil
                    const updated = [newActivity, ...prev];
                    return updated.slice(0, pagination.limit);
                });
                
                // Pagination total-u artır
                setPagination(prev => ({
                    ...prev,
                    total: prev.total + 1
                }));
            }
        };

        onNewActivity(handleNewActivity);

        // Cleanup - yalnız event listener-ı sil, socket-i disconnect etmə
        return () => {
            offNewActivity(handleNewActivity);
            leaveActivityRoom();
        };
    }, [selectedFilter, dateRange, datePreset, debouncedSearchTerm, pagination.limit]);

    // Handle date preset change
    const handleDatePresetChange = (preset) => {
        setDatePreset(preset);
        const today = getTodayDate();
        const todayDate = new Date(today);
        
        switch (preset) {
            case 'today': {
                setDateRange({ start: today, end: today });
                break;
            }
            case 'week': {
                const weekAgo = new Date(todayDate);
                weekAgo.setDate(weekAgo.getDate() - 7);
                setDateRange({ start: weekAgo.toISOString().split('T')[0], end: today });
                break;
            }
            case 'month': {
                const monthAgo = new Date(todayDate);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                setDateRange({ start: monthAgo.toISOString().split('T')[0], end: today });
                break;
            }
            case '6months': {
                const sixMonthsAgo = new Date(todayDate);
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                setDateRange({ start: sixMonthsAgo.toISOString().split('T')[0], end: today });
                break;
            }
            case 'year': {
                const yearAgo = new Date(todayDate);
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                setDateRange({ start: yearAgo.toISOString().split('T')[0], end: today });
                break;
            }
            case 'all': {
                setDateRange({ start: '', end: '' });
                setPagination(prev => ({ ...prev, page: 1 }));
                return; // Return early to avoid setting pagination again
            }
            case 'custom': {
                // Keep current date range
                break;
            }
        }
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // Handle clear filters
    const handleClearFilters = () => {
        const today = getTodayDate();
        setDateRange({ start: today, end: today });
        setDatePreset('today');
        setSearchTerm('');
        // Reset debounced search immediately
        setDebouncedSearchTerm('');
        setSelectedFilter('all');
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // Handle page change
    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, page }));
    };

    // Handle limit change
    const handleLimitChange = (limit) => {
        setPagination(prev => ({ ...prev, limit, page: 1 }));
    };


    // Get customer name
    const getCustomerName = (activity) => {
        if (activity.customer) {
            return `${activity.customer.firstName} ${activity.customer.lastName}`;
        }
        // Extract from message if customer not loaded
        const match = activity.message?.match(/^([^-]+)/);
        return match ? match[1].trim() : 'Naməlum müştəri';
    };

    // Check if there are active filters
    const hasActiveFilters = searchTerm || 
                            (dateRange.start && dateRange.end && datePreset !== 'all') ||
                            selectedFilter !== 'all';

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Son Əməliyyatlar</h1>
                    <p className="text-gray-600">Sistem əməliyyatlarının tarixçəsi</p>
                </div>
            </div>

            {/* Filters Section */}
            <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    {/* Search Input */}
                    <div className="relative w-full lg:w-auto lg:min-w-[280px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Axtar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg bg-white transition-colors"
                        />
                    </div>

                    {/* Action Type Filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            Növ:
                        </label>
                        <select
                            onChange={(e) => {
                                setSelectedFilter(e.target.value);
                                setPagination(prev => ({ ...prev, page: 1 }));
                            }}
                            value={selectedFilter}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 focus:outline-none transition-colors min-w-[140px]"
                        >
                            {filterOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Preset Selector */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            Tarix:
                        </label>
                        <select
                            onChange={(e) => handleDatePresetChange(e.target.value)}
                            value={datePreset}
                            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 focus:outline-none transition-colors min-w-[140px]"
                        >
                            <option value="today">Bu gün</option>
                            <option value="week">Bu həftə</option>
                            <option value="month">Bu ay</option>
                            <option value="6months">Son 6 ay</option>
                            <option value="year">Bu il</option>
                            <option value="all">Hamısı</option>
                            <option value="custom">Xüsusi aralıq</option>
                        </select>
                    </div>

                    {/* Date Range Filter - Only show when "custom" preset is selected */}
                    {datePreset === 'custom' && (
                        <div className="flex gap-2 w-full lg:w-auto">
                            <div className="flex-1 lg:flex-none lg:min-w-[150px]">
                                <input
                                    type="date"
                                    value={dateRange.start || ''}
                                    onChange={(e) => {
                                        setDateRange(prev => ({ ...prev, start: e.target.value }));
                                        setPagination(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="flex-1 lg:flex-none lg:min-w-[150px]">
                                <input
                                    type="date"
                                    value={dateRange.end || ''}
                                    onChange={(e) => {
                                        setDateRange(prev => ({ ...prev, end: e.target.value }));
                                        setPagination(prev => ({ ...prev, page: 1 }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* Clear Filters Button */}
                    <button
                        onClick={handleClearFilters}
                        disabled={!hasActiveFilters}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                            hasActiveFilters
                                ? 'text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer'
                                : 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-60'
                        }`}
                    >
                        Təmizlə
                    </button>

                    {/* Results Count */}
                    {pagination.total > 0 && (
                        <div className="text-sm text-gray-600 ml-auto">
                            <span className="font-semibold text-gray-900">{pagination.total}</span> nəticə
                        </div>
                    )}
                </div>
            </div>

            {/* Activities List */}
            {loading ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <p className="text-gray-600">Yüklənir...</p>
                </div>
            ) : activities.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {hasActiveFilters ? 'Nəticə tapılmadı' : 'Əməliyyat tapılmadı'}
                        </h3>
                        <p className="text-gray-500 text-center max-w-sm">
                            {hasActiveFilters 
                                ? 'Axtarış və ya filter parametrlərinə uyğun nəticə tapılmadı'
                                : 'Hələ heç bir əməliyyat qeydiyyata alınmayıb'
                            }
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="divide-y divide-gray-200">
                        {activities.map((activity) => {
                            const customerName = getCustomerName(activity);
                            const timeAgo = getTimeAgo(activity.createdAt);
                            const dateStr = formatDate(activity.createdAt);
                            const actionMessage = activity.message || 'Əməliyyat';

                            // Extract action type from message
                            let displayAction = actionMessage;
                            if (actionMessage.includes(' - ')) {
                                displayAction = actionMessage.split(' - ')[1];
                            }

                            // Get user info if available
                            const user = activity.user;
                            const performedBy = activity.performedBy || 'System';
                            const isSystem = !user && (performedBy === 'System' || performedBy.toLowerCase() === 'sistem');
                            
                            // Get user display name
                            const userDisplayName = user 
                                ? `${user.firstName} ${user.lastName}${user.role?.name ? ` (${user.role.name})` : ''}`
                                : performedBy;

                            return (
                                <div key={activity.id} className="flex items-start gap-4 p-6 hover:bg-gray-50 transition-colors">
                                    <div className={`rounded-full p-2 ${activity.actionType === 'success' ? 'bg-green-100' :
                                            activity.actionType === 'info' ? 'bg-blue-100' :
                                                'bg-yellow-100'
                                        }`}>
                                        {activity.actionType === 'success' ? (
                                            <MdCheckCircle className="w-6 h-6 text-green-600" />
                                        ) : activity.actionType === 'info' ? (
                                            <MdEvent className="w-6 h-6 text-blue-600" />
                                        ) : (
                                            <MdCancel className="w-6 h-6 text-yellow-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="font-semibold text-gray-900">{customerName}</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${activity.actionType === 'success' ? 'bg-green-100 text-green-800' :
                                                        activity.actionType === 'info' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {displayAction}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span>{timeAgo}</span>
                                                <span>{dateStr}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                                            {isSystem && (
                                                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                                    Sistem tərəfindən
                                                </span>
                                            )}
                                            {!isSystem && (
                                                <span className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                                    İcra edən: {userDisplayName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-700">Göstər:</span>
                                    <select
                                        value={pagination.limit}
                                        onChange={(e) => handleLimitChange(Number(e.target.value))}
                                        className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                    <span className="text-sm text-gray-700">
                                        {((pagination.page - 1) * pagination.limit + 1)}-{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1 || !pagination.hasPrevPage}
                                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Əvvəlki
                                    </button>

                                    <div className="flex items-center gap-1">
                                        <span className="text-sm text-gray-700">Səhifə:</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max={pagination.totalPages}
                                            value={pagination.page}
                                            onChange={(e) => {
                                                const pageNum = parseInt(e.target.value);
                                                if (pageNum >= 1 && pageNum <= pagination.totalPages) {
                                                    handlePageChange(pageNum);
                                                }
                                            }}
                                            className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700">/ {pagination.totalPages}</span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (pagination.totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (pagination.page <= 3) {
                                                pageNum = i + 1;
                                            } else if (pagination.page >= pagination.totalPages - 2) {
                                                pageNum = pagination.totalPages - 4 + i;
                                            } else {
                                                pageNum = pagination.page - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => handlePageChange(pageNum)}
                                                    className={`px-3 py-1 border rounded-md text-sm ${
                                                        pagination.page === pageNum
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : 'border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages || !pagination.hasNextPage}
                                        className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Sonrakı
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ActivityLog;
