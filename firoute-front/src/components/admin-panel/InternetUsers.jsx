import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import TableTemplate from '../ui/TableTamplate';
import Alert from '../ui/Alert';
import { UserPlus } from 'lucide-react';
import { getInternetUsersColumns } from '../../data/table-columns/InternetUsersColumns';
import { radiusUsersAPI } from '../../api/radiusUsersAPI';

export default function InternetUsers() {
    const { t } = useTranslation('admin-panel');
    const [usersData, setUsersData] = useState([]);
    const [loading, setLoading] = useState(true);

    const columns = getInternetUsersColumns(t);

    // Default user məlumatı
    const [defaultUser, setDefaultUser] = useState(null);

    // Fetch users data
    useEffect(() => {
        const fetchOnlineUsers = async () => {
            try {
                setLoading(true);

                const data = await radiusUsersAPI.getOnlineUsers();

                const transformedData = (data || []).map((u, index) => ({
                    ...u,
                    id: u.acctsessionid || index
                }));

                setUsersData(transformedData);
            } catch (error) {
                console.error(error);
                Alert.error('Xəta!', 'Online istifadəçiləri yükləmək olmadı');
            } finally {
                setLoading(false);
            }
        };

        fetchOnlineUsers();

        // istəsən auto refresh
        const interval = setInterval(fetchOnlineUsers, 10000);
        return () => clearInterval(interval);
    }, []);


    // Edit/view formu tam deaktiv
    const handleDelete = async (user) => {
        if (user?.username === 'user') {
            Alert.error('Xəta!', 'Default istifadəçi silinə bilməz.');
            return;
        }
        try {
            setLoading(true);
            const res = await radiusUsersAPI.deleteUser(user.username);
            if (res.ok) {
                Alert.success('Uğurlu!', 'İstifadəçi və onun parametrləri silindi');
                const data = await radiusUsersAPI.getAllUsers();
                const transformedData = (data || []).map(u => ({ ...u, id: u.username || `user-${Math.random()}` }));
                setUsersData(transformedData);
            } else {
                throw new Error(res.error || 'Silinmə zamanı xəta');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            Alert.error('Xəta!', error.response?.data?.error || error.message || 'İstifadəçini silmək mümkün olmadı');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('internet_users', 'İnternet İstifadəçiləri')}</h1>
                    <p className="text-gray-600">{t('manage_internet_users', 'İnternet istifadəçilərini idarə edin')}</p>
                </div>
            </div>

            {/* Default user banner – yuxarıda, cədvəldən kənar */}
            <div className="mb-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-yellow-800">Default İnternet İstifadəçisi</h2>
                            <p className="text-sm text-yellow-700">
                                Bu istifadəçi sistem tərəfindən qorunur və dəyişdirilə/silinilə bilməz.
                            </p>
                        </div>
                    </div>
                    {defaultUser && (
                        <div className="mt-3 text-sm text-gray-800">
                            <div className="flex flex-wrap gap-6">
                                <div>
                                    <span className="font-medium">Username:</span> {defaultUser.username}
                                </div>
                                <div>
                                    <span className="font-medium">Şifrə:</span>{' '}
                                    {defaultUser.checks?.find(c => c.attribute === 'Cleartext-Password')?.value || '*****'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <TableTemplate
                data={usersData}
                columns={columns}
                title={t('internet_users', 'İnternet İstifadəçiləri')}
                searchFields={['username']}
                onDelete={handleDelete}
                showBulkActions={false}
                showFilters={false}
                showSearch={true}
                showDateFilter={false}
                loading={loading}
                emptyState={{
                    icon: 'users',
                    title: t('no_users_found', 'İstifadəçi tapılmadı'),
                    description: t('no_users_description', 'Hələlik göstəriləcək istifadəçi yoxdur.'),
                    showAction: false
                }}
            />
        </div>
    );
}
