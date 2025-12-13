import { User, Wifi } from 'lucide-react';

// Atribut adlarını sadələşdir
const getAttributeLabel = (attr) => {
    const labels = {
        'Cleartext-Password': 'WiFi Şifrəsi',
        'Framed-IP-Address': 'IP Ünvanı',
        'Framed-IP-Netmask': 'IP Maskası',
        'Session-Timeout': 'Sessiya Müddəti',
        'Max-Daily-Session': 'Günlük Limit',
        'Max-All-Session': 'Maksimum Sessiya',
        'Simultaneous-Use': 'Eyni Vaxtda İstifadə',
        'Auth-Type': 'Təsdiq Növü'
    };
    return labels[attr] || attr;
};

export const getInternetUsersColumns = (t) => [
    {
        key: 'username',
        label: t('username', 'İstifadəçi adı'),
        render: (value) => (
            <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                    <User className="w-4 h-4" />
                </div>
                <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{value || '-'}</div>
                </div>
            </div>
        )
    },
    {
        key: 'internet',
        label: t('wifi_parameters', 'İnternet'),
        render: (value, item) => {
            const rate = (item.replies || []).find(r => r.attribute === 'Mikrotik-Rate-Limit');
            const sess = (item.replies || []).find(r => r.attribute === 'Session-Timeout');
            const auth = (item.checks || []).find(c => c.attribute === 'Auth-Type');
            const speed = rate && rate.value ? rate.value : '50ms';
            const session = sess && sess.value ? Number(sess.value) : 86400;
            const isActive = !(auth && auth.value && auth.value.toLowerCase() === 'reject');
            const sessionLabel = session % 3600 === 0 ? `${session/3600} saat` : `${session} s`;
            return (
                <div className="text-sm text-gray-900">
                    <div><strong>Sürət:</strong> {speed}</div>
                    <div><strong>Sessiya:</strong> {sessionLabel}</div>
                    <div><strong>Aktiv:</strong> {isActive ? 'Bəli' : 'Xeyr'}</div>
                </div>
            );
        }
    }
    ,
    {
        key: 'speed',
        label: 'Sürət',
        render: (v, item) => {
            // axtarış: Mikrotik-Rate-Limit cavab parametri
            const rate = (item.replies || []).find(r => r.attribute === 'Mikrotik-Rate-Limit');
            const display = rate && rate.value ? rate.value : '50ms';
            return <div className="text-sm text-gray-900">{display}</div>;
        }
    },
    {
        key: 'session',
        label: 'Sessiya (s)',
        render: (v, item) => {
            // Session-Timeout varsa göstər, yoxsa 86400 (24 saat)
            const s = (item.replies || []).find(r => r.attribute === 'Session-Timeout');
            const display = s && s.value ? s.value : '86400';
            return <div className="text-sm text-gray-900">{display}</div>;
        }
    },
    {
        key: 'active',
        label: 'Aktiv',
        render: (v, item) => {
            // Auth-Type=Reject isə deaktiv hesab et
            const auth = (item.checks || []).find(c => c.attribute === 'Auth-Type');
            const isActive = !(auth && auth.value && auth.value.toLowerCase() === 'reject');
            return (
                <div>
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={async (e) => {
                                // toggle: əgər aktivdirsə -> Auth-Type=Reject; aktiv et -> Auth-Type=Accept
                                const newVal = e.target.checked ? 'Accept' : 'Reject';
                                try {
                                    await (await import('../../api/radiusUsersAPI')).radiusUsersAPI.createOrUpdateUser({
                                        username: item.username,
                                        checks: [{ attribute: 'Auth-Type', value: newVal }]
                                    });
                                    window.location.reload();
                                } catch (error) {
                                    console.error('Toggle active error', error);
                                    alert('Xəta oldu');
                                }
                            }}
                        />
                        <span className="ml-2 text-sm">{isActive ? 'Bəli' : 'Xeyr'}</span>
                    </label>
                </div>
            );
        }
    }
];
