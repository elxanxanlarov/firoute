import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, userAPI } from "../api";
import Alert from "../components/ui/Alert";
import {
    ArrowLeft,
    Mail,
    Phone,
    Shield,
    CalendarDays,
    RefreshCw,
    Edit3,
} from "lucide-react";

const buildFormState = (data) => ({
    firstName: data?.firstName || "",
    lastName: data?.lastName || "",
    email: data?.email || "",
    phone: data?.phone || "",
});

const buildMetaState = (data) => ({
    role: data?.role?.name || data?.role || "",
    lastLogin: data?.lastLogin || null,
    department: data?.department || "",
    position: data?.position || "",
    status: data?.isActive ?? true,
});

export default function Profile() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState(buildFormState(null));
    const [metaData, setMetaData] = useState(buildMetaState(null));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const hydrateProfile = useCallback((data) => {
        setProfile(data);
        setFormData(buildFormState(data));
        setMetaData(buildMetaState(data));
    }, []);

    useEffect(() => {
        let active = true;

        const fetchProfile = async () => {
            setLoading(true);
            setError("");
            try {
                const meResponse = await authApi.me();
                if (!active) return;

                if (!meResponse.success || !meResponse.data?.id) {
                    setError("İstifadəçi məlumatlarını əldə etmək mümkün olmadı.");
                    setProfile(null);
                    return;
                }

                let detailedUser = meResponse.data;
                try {
                    const detailResponse = await userAPI.getById(meResponse.data.id);
                    if (detailResponse.success && detailResponse.data) {
                        detailedUser = detailResponse.data;
                    }
                } catch {
                    // fallback to minimal data
                }

                hydrateProfile(detailedUser);
            } catch (err) {
                if (!active) return;
                const message =
                    err?.response?.data?.message ||
                    "Profil məlumatları yüklənərkən xəta baş verdi.";
                setError(message);
                setProfile(null);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        fetchProfile();
        return () => {
            active = false;
        };
    }, [hydrateProfile]);

    const initials = useMemo(() => {
        if (!profile) return "??";
        const parts = [profile.firstName, profile.lastName]
            .filter(Boolean)
            .map((part) => part.trim()[0]?.toUpperCase())
            .join("");
        return parts || "??";
    }, [profile]);

    const fullName = useMemo(() => {
        if (!profile) return "";
        return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    }, [profile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!profile?.id || !isEditing) return;

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            Alert.error("Xəta", "Ad və soyad tələb olunur.");
            return;
        }

        if (!formData.email.trim() && !formData.phone.trim()) {
            Alert.error("Xəta", "Email və ya telefon ən azı biri tələb olunur.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                department: metaData.department,
                position: metaData.position,
                isActive: metaData.status,
            };

            const response = await userAPI.update(profile.id, payload);
            if (response.success && response.data) {
                hydrateProfile(response.data);
                setIsEditing(false);
                Alert.success("Profil yeniləndi", "Məlumatlar uğurla saxlanıldı.");
            } else {
                Alert.error(
                    "Xəta",
                    response.message || "Məlumatları yeniləmək mümkün olmadı."
                );
            }
        } catch (err) {
            const message =
                err?.response?.data?.message ||
                "Yeniləmə zamanı gözlənilməz xəta baş verdi.";
            Alert.error("Xəta", message);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        hydrateProfile(profile);
    };

    const handleRefresh = () => window.location.reload();

    const toggleEditing = () => {
        if (isEditing) {
            hydrateProfile(profile);
        }
        setIsEditing((prev) => !prev);
    };

    const renderStatus = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center py-24 text-gray-500">
                    Profil məlumatları yüklənir...
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center gap-4 py-24 text-center">
                    <p className="text-red-500 font-medium">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
                    >
                        <RefreshCw size={16} /> Yenidən yoxla
                    </button>
                </div>
            );
        }

        if (!profile) {
            return (
                <div className="flex flex-col items-center gap-4 py-24 text-gray-500">
                    İstifadəçi məlumatı tapılmadı.
                </div>
            );
        }

        return null;
    };

    if (!profile || loading || error) {
        return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="rounded-2xl bg-white shadow border border-gray-100">
                    {renderStatus()}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
                <ArrowLeft size={16} />
                Geri
            </button>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-2xl font-semibold text-indigo-600">
                        {initials}
                    </div>
                    <div className="flex-1 space-y-1">
                        <h2 className="text-2xl font-semibold text-gray-900">{fullName}</h2>
                        <p className="text-sm text-gray-500">
                            {formData.email || "Email qeyd edilməyib"}
                        </p>
                    </div>
                    <div className="grid min-w-[220px] gap-3 text-sm sm:text-right">
                        <div>
                            <p className="text-gray-400">Rol</p>
                            <p className="font-medium text-gray-900">
                                {metaData.role || "Təyin edilməyib"}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-400">Son fəaliyyət</p>
                            <p className="font-medium text-gray-900">
                                {metaData.lastLogin
                                    ? new Date(metaData.lastLogin).toLocaleString("az-AZ")
                                    : "Məlumat yoxdur"}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
                            Məlumatların yenilənməsi
                            </p>
                            <h2 className="text-xl font-semibold text-gray-900">
                                Profil forması
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={toggleEditing}
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200"
                        >
                            <Edit3 size={16} /> {isEditing ? "Redaktəni bağla" : "Redaktə et"}
                        </button>
                </div>
                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">
                                    Ad
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    placeholder="Adınızı daxil edin"
                                    disabled={!isEditing}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">
                                    Soyad
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    placeholder="Soyadınızı daxil edin"
                                    disabled={!isEditing}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />
                            </div>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="nümunə@firoute.az"
                                    disabled={!isEditing}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600">
                                    Telefon
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+994 xx xxx xx xx"
                                    disabled={!isEditing}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />
                            </div>
                        </div>

                        {isEditing && (
                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                                >
                                    {saving ? "Yenilənir..." : "Yeniləməni yadda saxla"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                                >
                                    Dəyişiklikləri sıfırla
                                </button>
                            </div>
                        )}
                    </form>
            </section>
        </div>
    );
}