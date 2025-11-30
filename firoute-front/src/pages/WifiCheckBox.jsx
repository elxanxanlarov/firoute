import React, { useState } from 'react';
import { Wifi, CheckCircle, ArrowRight, Shield, AlertCircle, Info } from 'lucide-react';

export default function WifiCheckBox() {
    const [accepted, setAccepted] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (accepted) {
            setSubmitted(true);
        }
    };

    const handleReset = () => {
        setAccepted(false);
        setSubmitted(false);
    };

    // Uğurlu səhifəsi
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Uğurlu!
                        </h1>
                        <p className="text-gray-600">
                            Müştəri internetə qoşuldu
                        </p>
                    </div>

                    {/* Uğur Kartı */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <Wifi className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">
                                İnternetə qoşulduğunuz üçün təşəkkürlər!
                            </h2>
                            <p className="text-gray-600">
                                Müştəri məlumatlarınız qeydə alındı və internetə qoşulma prosesi başladı.
                            </p>
                        </div>
                    </div>

                    {/* Düymə */}
                    <button
                        onClick={handleReset}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Yeni Giriş
                    </button>
                </div>
            </div>
        );
    }

    // Əsas səhifə - Qaydalar və Checkbox
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
                        <Wifi className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        WiFi Giriş
                    </h1>
                    <p className="text-gray-600">
                        İnternetə qoşulmaq üçün qaydaları oxuyun və qəbul edin
                    </p>
                </div>

                {/* Qaydalar Kartı */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Info className="w-6 h-6 text-blue-600" />
                        İstifadə Qaydaları
                    </h2>
                    
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-gray-900 mb-1">Təhlükəsizlik</p>
                                <p className="text-sm text-gray-600">
                                    WiFi şifrənizi başqaları ilə paylaşmayın və təhlükəsiz saxlayın.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-gray-900 mb-1">Məsuliyyət</p>
                                <p className="text-sm text-gray-600">
                                    İnternet istifadəsi zamanı qanunlara riayət edin və məsuliyyətli davranın.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Wifi className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-gray-900 mb-1">Bağlantı</p>
                                <p className="text-sm text-gray-600">
                                    WiFi şəbəkəsinə qoşulduqdan sonra internetə daxil ola bilərsiniz.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-gray-900 mb-1">Qaydalar</p>
                                <p className="text-sm text-gray-600">
                                    Bütün istifadə qaydalarını qəbul etdiyinizi təsdiq edin.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Qəbul Checkbox */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={accepted}
                            onChange={(e) => setAccepted(e.target.checked)}
                            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                            Yuxarıda göstərilən bütün istifadə qaydalarını oxudum və qəbul edirəm. İnternetə qoşulmaq istəyirəm.
                        </span>
                    </label>
                </div>

                {/* Düymə */}
                <form onSubmit={handleSubmit}>
                    <button
                        type="submit"
                        disabled={!accepted}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" />
                        Qəbul edirəm və davam edirəm
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
