import React, { useState } from 'react';
import { Wifi, Lock, Home, Eye, EyeOff } from 'lucide-react';

export default function WifiPassword() {
    const [roomNumber, setRoomNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Sadəcə form submit-i maneə törədir, backend çağırışı yoxdur
        console.log('Otaq nömrəsi:', roomNumber);
        console.log('Şifrə:', password);
    };

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
                        Otaq nömrəsi və şifrə ilə internetə daxil olun
                    </p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                <Home className="inline w-4 h-4 mr-2" />
                                Otaq Nömrəsi
                            </label>
                            <input
                                id="roomNumber"
                                type="text"
                                value={roomNumber}
                                onChange={(e) => setRoomNumber(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="Məs: 101"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                <Lock className="inline w-4 h-4 mr-2" />
                                Şifrə
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                                    placeholder="WiFi şifrəsi"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Wifi className="w-5 h-5" />
                            Giriş Et
                        </button>
                    </form>

                    {/* Info Box */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Qeyd:</strong> Otaq nömrəsi və WiFi şifrəsini daxil edərək internetə daxil ola bilərsiniz.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
