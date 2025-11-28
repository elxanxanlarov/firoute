import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { Edit, Trash2, Eye, Plus, Settings, ArrowLeft } from 'lucide-react';
import { radiusProfileAPI } from '../../api';

export default function RadiusProfileManagement() {
    const { t } = useTranslation('admin-panel');
    const navigate = useNavigate();
    const location = useLocation();
    const [profileData, setProfileData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch profiles data
    useEffect(() => {
        const fetchProfiles = async () => {
            setLoading(true);
            try {
                const response = await radiusProfileAPI.getAll();
                if (response.success && response.data) {
                    // Transform data for table
                    const transformedData = response.data.map(profile => {
                        // Attribute-lardan məlumatları çıxar
                        let downloadMbps = '';
                        let uploadMbps = '';
                        let sessionHours = '';
                        
                        profile.attributes?.forEach(attr => {
                            if (attr.attribute === 'WISPr-Bandwidth-Max-Down') {
                                downloadMbps = (parseInt(attr.value) / 1000000).toString();
                            } else if (attr.attribute === 'WISPr-Bandwidth-Max-Up') {
                                uploadMbps = (parseInt(attr.value) / 1000000).toString();
                            } else if (attr.attribute === 'Session-Timeout') {
                                sessionHours = (parseInt(attr.value) / 3600).toString();
                            }
                        });
                        
                        return {
                            id: profile.groupname, // TableTemplate üçün id lazımdır
                            displayName: profile.displayName || profile.groupname,
                            groupname: profile.groupname,
                            attributes: profile.attributes || [],
                            downloadMbps: downloadMbps,
                            uploadMbps: uploadMbps,
                            sessionHours: sessionHours,
                            ...profile
                        };
                    });
                    setProfileData(transformedData);
                } else {
                    setProfileData([]);
                }
            } catch (error) {
                console.error('Error fetching profiles:', error);
                Alert.error('Xəta!', 'Profilləri əldə etmək mümkün olmadı');
                setProfileData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProfiles();
    }, []);

    const columns = [
        {
            key: 'displayName',
            label: t('profile_name', 'Profil adı'),
            render: (value, item) => (
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        <Settings className="w-4 h-4" />
                    </div>
                    <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{value || item.groupname}</div>
                        <div className="text-sm text-gray-500">{item.groupname}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'downloadMbps',
            label: t('download_speed', 'Download'),
            render: (value) => (
                <span className="text-sm text-gray-900">
                    {value ? `${value} Mbit` : '-'}
                </span>
            )
        },
        {
            key: 'uploadMbps',
            label: t('upload_speed', 'Upload'),
            render: (value) => (
                <span className="text-sm text-gray-900">
                    {value ? `${value} Mbit` : '-'}
                </span>
            )
        },
        {
            key: 'sessionHours',
            label: t('session_duration', 'Session'),
            render: (value) => (
                <span className="text-sm text-gray-900">
                    {value ? `${value} saat` : 'Limitsiz'}
                </span>
            )
        }
    ];

    const handleEdit = async (profile) => {
        const isAdmin = location.pathname.includes('/admin');
        if (!isAdmin) return;
        const editPath = `/admin/radius-profile-form?groupname=${encodeURIComponent(profile.groupname)}`;
        navigate(editPath);
    };

    const handleDelete = async (profile) => {
        const result = await Alert.confirm(
            t('alert.delete_confirm', 'Silmə təsdiqi'),
            `${t('delete_profile_confirm', 'Bu profili silmək istədiyinizə əminsiniz?')} ${profile.groupname}?`,
            {
                confirmText: t('alert.yes', 'Bəli'),
                cancelText: t('alert.no', 'Xeyr'),
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading', 'Yüklənir...'));
                await radiusProfileAPI.delete(profile.groupname);
                setProfileData(prev => prev.filter(item => item.groupname !== profile.groupname));
                Alert.close();
                Alert.success(t('alert.delete_success', 'Uğurlu'), t('alert.delete_success_text', 'Silindi'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error', 'Xəta'), error.response?.data?.message || t('alert.error_text', 'Xəta baş verdi'));
            }
        }
    };

    const handleView = (profile) => {
        const attributesList = profile.attributes?.map(attr => 
            `${attr.attribute} (${attr.op}) = ${attr.value}`
        ).join('\n') || '-';
        
        Alert.info(
            `${t('profile_name', 'Profil adı')}: ${profile.groupname}`,
            `${t('attributes', 'Attribute-lar')}:\n${attributesList}`
        );
    };

    const handleBulkDelete = async (selectedGroupnames) => {
        const result = await Alert.confirm(
            t('alert.bulk_delete_confirm', 'Toplu silmə təsdiqi'),
            `${t('alert.bulk_delete_confirm_text', 'Seçilmiş elementləri silmək istədiyinizə əminsiniz?')} ${selectedGroupnames.length} ${t('items_selected', 'element')}?`,
            {
                confirmText: t('alert.yes', 'Bəli'),
                cancelText: t('alert.no', 'Xeyr'),
                confirmColor: '#EF4444',
                cancelColor: '#6B7280'
            }
        );

        if (result.isConfirmed) {
            try {
                Alert.loading(t('loading', 'Yüklənir...'));
                await Promise.all(selectedGroupnames.map(groupname => radiusProfileAPI.delete(groupname)));
                setProfileData(prev => prev.filter(item => !selectedGroupnames.includes(item.groupname)));
                Alert.close();
                Alert.success(t('alert.bulk_delete_success', 'Uğurlu'), t('alert.bulk_delete_success_text', 'Silindi'));
            } catch (error) {
                Alert.close();
                Alert.error(t('alert.error', 'Xəta'), error.response?.data?.message || t('alert.error_text', 'Xəta baş verdi'));
            }
        }
    };

    const handleAddProfile = () => {
        const isAdmin = location.pathname.includes('/admin');
        const addProfilePath = isAdmin ? '/admin/radius-profile-form' : '/reception/radius-profile-form';
        navigate(addProfilePath);
    };

    const handleBack = () => {
        const isAdmin = location.pathname.includes('/admin');
        navigate(isAdmin ? '/admin/settings' : '/reception/settings');
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('radius_profiles', 'Radius Profilləri')}</h1>
                        <p className="text-gray-600">{t('manage_radius_profiles', 'Radius profillərini yaradın və idarə edin')}</p>
                    </div>
                </div>
                <button
                    onClick={handleAddProfile}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('add_profile', 'Profil əlavə et')}
                </button>
            </div>

            <TableTemplate
                data={profileData}
                columns={columns}
                title={t('profiles', 'Profillər')}
                searchFields={['groupname']}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onBulkDelete={(selectedIds) => {
                    const selectedGroupnames = selectedIds.map(id => {
                        const profile = profileData.find(p => p.id === id);
                        return profile?.groupname;
                    }).filter(Boolean);
                    handleBulkDelete(selectedGroupnames);
                }}
                showBulkActions={true}
                showFilters={false}
                showSearch={true}
                showDateFilter={false}
                loading={loading}
                emptyState={{
                    icon: 'settings',
                    title: t('no_profiles_found', 'Profil tapılmadı'),
                    description: t('no_profiles_description', 'Hələlik göstəriləcək profil yoxdur.'),
                    actionText: t('add_first_profile', 'İlk profili əlavə et'),
                    onAction: handleAddProfile,
                    showAction: true
                }}
            />
        </div>
    );
}

