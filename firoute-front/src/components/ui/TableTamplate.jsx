import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';
import LoadingSpinner from './LoadingSpinner';
import { useClickOutside } from '../../hooks';
import {
  Search,
  Filter,
  Calendar,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
  Check,
  X
} from 'lucide-react';

export default function TableTamplate({
  data = [],
  columns = [],
  onEdit,
  onDelete,
  onView,
  onBulkDelete,
  searchFields = [],
  filterOptions = {},
  title = "Data Table",
  showBulkActions = true,
  showFilters = true,
  showSearch = true,
  showDateFilter = true,
  loading = false,
  emptyState = {
    icon: 'users',
    title: 'No data found',
    description: 'There are no items to display at the moment.',
    actionText: 'Add new item',
    onAction: null,
    showAction: false
  }
}) {
  const { t } = useTranslation('admin-panel');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(() => {
    // Default filter: əgər status filterOptions varsa və 'active' seçimi varsa, default olaraq aktiv seç
    const defaultFilters = {};
    if (filterOptions.status && filterOptions.status.length > 0) {
      // 'active' və ya 'Active' tap
      const activeOption = filterOptions.status.find(opt =>
        opt.toLowerCase().includes('active') || opt.toLowerCase().includes('aktiv')
      );
      if (activeOption) {
        defaultFilters.status = activeOption;
      }
    }
    return defaultFilters;
  });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Use custom hook for click outside functionality
  const filterDropdownRef = useClickOutside(showFilterDropdown, () => setShowFilterDropdown(false));

  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchTerm && searchFields.length > 0) {
      filtered = filtered.filter(item =>
        searchFields.some(field =>
          item[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (key === 'status') {
          // Status filter üçün dəqiq uyğunluq
          filtered = filtered.filter(item => {
            const itemStatus = item.isActive !== undefined
              ? (item.isActive ? 'Active' : 'Inactive')
              : (item.status || '');
            const filterValue = value.toLowerCase();
            const itemStatusLower = itemStatus.toLowerCase();

            // 'active' və ya 'aktiv' uyğunluğu
            if (filterValue.includes('active') || filterValue.includes('aktiv')) {
              return itemStatusLower.includes('active') || item.isActive === true;
            }
            // 'inactive' və ya 'qeyri-aktiv' uyğunluğu
            if (filterValue.includes('inactive') || filterValue.includes('qeyri-aktiv')) {
              return itemStatusLower.includes('inactive') || item.isActive === false;
            }
            // Digər hallarda dəqiq uyğunluq
            return itemStatusLower === filterValue;
          });
        } else {
          filtered = filtered.filter(item =>
            item[key]?.toString().toLowerCase().includes(value.toLowerCase())
          );
        }
      }
    });

    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.createdAt || item.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    return filtered;
  }, [data, searchTerm, filters, dateRange, searchFields]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  console.log(paginatedData);
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        <LoadingSpinner
          size="lg"
          text={t('loading', 'Loading...')}
          className="py-16"
        />
      </div>
    );
  }

  // Show empty state only when there's no data at all (not filtered)
  if (!loading && data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        <EmptyState {...emptyState} />
      </div>
    );
  }

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map(item => item.id));
    }
  };

  // Handle bulk actions
  const handleBulkDelete = () => {
    if (selectedRows.length > 0 && onBulkDelete) {
      onBulkDelete(selectedRows);
      setSelectedRows([]);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({});
    setDateRange({ start: '', end: '' });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                />
              </div>
            )}

            {showFilters && (
              <div className="relative" ref={filterDropdownRef}>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                >
                  <Filter className="w-4 h-4" />
                  {t('filters')}
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
                    <div className="space-y-4">
                      {/* Date Range Filter */}
                      {showDateFilter && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('date_range')}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              value={dateRange.start}
                              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="date"
                              value={dateRange.end}
                              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Column Filters */}
                      {Object.entries(filterOptions).map(([key, options]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </label>
                          <select
                            value={filters[key] || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">{t('all')}</option>
                            {options.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                      ))}

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                        >
                          {t('clear_all')}
                        </button>
                        <button
                          onClick={() => setShowFilterDropdown(false)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          {t('apply')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && selectedRows.length > 0 && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedRows.length} {t('items_selected')}
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              {t('delete_selected')}
            </button>
            <button
              onClick={() => setSelectedRows([])}
              className="flex items-center gap-2 px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              <X className="w-4 h-4" />
              {t('clear_selection')}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {showBulkActions && (
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {sortConfig.key === column.key && (
                      <span className="text-blue-600">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((item, index) => (
              <tr
                key={item.id || item.username || `row-${index}`}
                className={`hover:bg-gray-50 cursor-pointer ${selectedRows.includes(item.id) ? 'bg-blue-50' : ''}`}
                onClick={() => showBulkActions && handleSelectRow(item.id)}
              >
                {showBulkActions && (
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item.id)}
                      onChange={() => handleSelectRow(item.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {column.render ? column.render(item[column.key], item) : item[column.key]}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <button
                        onClick={() => onView(item)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title={t('view')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(item)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                        title={t('edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(item)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {/* No results found row */}
            {paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (showBulkActions ? 2 : 1)}
                  className="px-6 py-12 text-center"
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('alert.no_results_found')}
                    </h3>
                    <p className="text-gray-500 text-center max-w-sm">
                      {t('alert.no_results_description')}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">{t('show')}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-700">
              {t('of')} {sortedData.length} {t('results')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {t('previous')}
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded-md text-sm ${currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {t('next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}