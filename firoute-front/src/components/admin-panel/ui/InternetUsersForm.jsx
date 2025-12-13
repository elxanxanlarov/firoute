import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Input from '../../ui/Input';
import Alert from '../../ui/Alert';
import { User, Wifi, Info, Plus, Trash2 } from 'lucide-react';
import { radiusUsersAPI } from '../../../api/radiusUsersAPI';

export default function InternetUsersForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const username = searchParams.get('username');
    const isAdmin = location.pathname.includes('/admin');
    const usersPagePath = isAdmin ? '/admin/internet-users' : '/reception/internet-users';
    const isEditMode = !!username;
    const [formData, setFormData] = useState({
        username: '',
        checks: [],
        replies: []
    });
    const [checksToDelete, setChecksToDelete] = useState([]);
    const [repliesToDelete, setRepliesToDelete] = useState([]);
    
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [speedValue, setSpeedValue] = useState('50ms');
    const [sessionValue, setSessionValue] = useState('86400');
    const [isActiveValue, setIsActiveValue] = useState(true);

    const ATTRIBUTE_OPTIONS = [
        { label: 'WiFi Şifrəsi', attribute: 'Cleartext-Password', type: 'check', example: '1234' },
        { label: 'MAC yoxlaması', attribute: 'Calling-Station-Id', type: 'check', example: 'AA:BB:CC:DD:EE:FF' },
        { label: 'Vaxt limiti', attribute: 'Expiration', type: 'reply', example: '2025-01-01' },
        { label: 'Sessiya limiti (günlük)', attribute: 'Max-Daily-Session', type: 'reply', example: '3600' },
        { label: 'Giriş qadağası', attribute: 'Auth-Type', type: 'check', example: 'Reject' },
        { label: 'Sürət limiti', attribute: 'Mikrotik-Rate-Limit', type: 'reply', example: '50ms' },
        { label: 'Sessiya vaxtı', attribute: 'Session-Timeout', type: 'reply', example: '3600' },
        { label: 'VLAN', attribute: 'Tunnel-Private-Group-Id', type: 'reply', example: '100' },
        { label: 'IP', attribute: 'Framed-IP-Address', type: 'reply', example: '10.0.0.55' },
        { label: 'Idle timeout', attribute: 'Idle-Timeout', type: 'reply', example: '300' }
    ];

    useEffect(() => {
        const fetchData = async () => {
            if (isEditMode && username) {
                try {
                    setIsLoading(true);
                    const response = await radiusUsersAPI.getUserDetails(username);
                    if (response) {
                        setFormData({
                            username: response.username || '',
                            checks: response.checks || [],
                            replies: response.replies || []
                        });
                        setChecksToDelete([]);
                        setRepliesToDelete([]);
                        // populate only the three editable fields
                        const rate = (response.replies || []).find(r => r.attribute === 'Mikrotik-Rate-Limit');
                        const sess = (response.replies || []).find(r => r.attribute === 'Session-Timeout');
                        const auth = (response.checks || []).find(c => c.attribute === 'Auth-Type');
                        if (rate && rate.value) setSpeedValue(rate.value);
                        if (sess && sess.value) setSessionValue(String(sess.value));
                        setIsActiveValue(!(auth && auth.value && auth.value.toLowerCase() === 'reject'));
                    }
                } catch (error) {
                    console.error('Error fetching user:', error);
                    Alert.error('Xəta!', 'İstifadəçi məlumatlarını əldə etmək mümkün olmadı');
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchData();
    }, [username, isEditMode]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.username.trim()) {
            newErrors.username = 'İstifadəçi adı tələb olunur';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            Alert.error('Xəta!', 'Zəhmət olmasa bütün tələb olunan sahələri doldurun');
            return;
        }

        try {
            setIsLoading(true);
            // Only send the three allowed parameters
            const userData = {
                username: formData.username,
                checks: [
                    { attribute: 'Auth-Type', op: ':=', value: isActiveValue ? 'Accept' : 'Reject' }
                ],
                replies: [
                    { attribute: 'Mikrotik-Rate-Limit', op: ':=', value: speedValue },
                    { attribute: 'Session-Timeout', op: ':=', value: sessionValue }
                ],
                deleteChecks: checksToDelete,
                deleteReplies: repliesToDelete
            };

            const response = await radiusUsersAPI.createOrUpdateUser(userData);
            
            if (response.ok) {
                Alert.success(
                    'Uğurlu!',
                    isEditMode ? 'İstifadəçi uğurla yeniləndi' : 'İstifadəçi uğurla yaradıldı'
                );
                // Tam yenilənmiş görünüş üçün list səhifəsinə yönləndir və tam səhifə yeniləmə et
                window.location.href = usersPagePath;
            } else {
                throw new Error(response.error || 'Xəta baş verdi');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            Alert.error(
                'Xəta!',
                error.response?.data?.error || error.message || 'İstifadəçi yaratmaq/yeniləmək mümkün olmadı'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };
    if (isLoading && isEditMode) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Yüklənir...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? 'İnternet İstifadəçisini Redaktə Et' : 'Yeni İnternet İstifadəçisi'}
                </h1>
                <p className="text-gray-600">
                    {isEditMode 
                        ? 'İstifadəçinin WiFi və internet parametrlərini yeniləyin' 
                        : 'Yeni internet istifadəçisi əlavə edin və WiFi parametrlərini təyin edin'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
                {/* Username */}
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="inline w-4 h-4 mr-2" />
                        İstifadəçi Adı *
                    </label>
                    <Input
                        id="username"
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Məs: room101, guest123"
                        disabled={isEditMode}
                        error={errors.username}
                        label=""
                        showLabel={false}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Bu ad WiFi-yə qoşulmaq üçün istifadə olunacaq
                    </p>
                </div>

                {/* WiFi Parametrləri - Bütün atributlar bir yerdə */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                            <Wifi className="inline w-4 h-4 mr-2" />
                            WiFi və İnternet Parametrləri
                        </label>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Info className="w-4 h-4" />
                            <span>Bu parametrlər istifadəçinin internetə qoşulmasını idarə edir</span>
                        </div>
                    </div>
                    
                    {/* Info Box */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Nə edirik?</strong> Burada WiFi şifrəsi, IP ünvanı, sürət limitləri və digər internet parametrlərini təyin edirik. 
                            Hər parametr istifadəçinin internetə necə qoşulacağını müəyyən edir.
                        </p>
                    </div>
                    
                    {/* Only allow editing three parameters: Sürət, Sessiya, Aktiv (no new params) */}
                    <div className="space-y-4 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">İnternet Sürəti</label>
                            <select
                                value={speedValue}
                                onChange={(e) => setSpeedValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                                <option value="10ms">10ms</option>
                                <option value="20ms">20ms</option>
                                <option value="30ms">30ms</option>
                                <option value="40ms">40ms</option>
                                <option value="50ms">50ms</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Sürəti seçin (ms-lə).</p>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Sessiya müddəti</label>
                            <select
                                value={sessionValue}
                                onChange={(e) => setSessionValue(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                                <option value="3600">1 saat</option>
                                <option value="21600">6 saat</option>
                                <option value="43200">12 saat</option>
                                <option value="86400">24 saat</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Sessiya müddətini seçin (məs: 24 saat).</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="mr-2" checked={isActiveValue} onChange={(e) => setIsActiveValue(e.target.checked)} />
                                <span className="text-sm">Aktiv</span>
                            </label>
                            <p className="text-xs text-gray-500">Aktivdirsə istifadəçi internetə qoşula bilir, deaktivdirsə qadağan olunur.</p>
                        </div>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Ləğv et
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Yüklənir...' : (isEditMode ? 'Yenilə' : 'Yarat')}
                    </button>
                </div>
            </form>
        </div>
    );
}
