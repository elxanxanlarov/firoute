import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Printer, ArrowLeft, Wifi } from 'lucide-react';

export default function WifiCredentials() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    
    // Check if coming from admin or reception
    const isAdmin = location.pathname.includes('/admin');
    const customerPagePath = isAdmin ? '/admin/customers' : '/reception/customers';
    
    // URL-dən məlumatları al
    const roomNumber = searchParams.get('roomNumber');
    const guestCount = searchParams.get('guestCount');
    const wifiAccountsParam = searchParams.get('wifiAccounts');
    
    // WiFi accounts-ləri parse et
    let wifiAccounts = [];
    try {
        if (wifiAccountsParam) {
            wifiAccounts = JSON.parse(decodeURIComponent(wifiAccountsParam));
        }
    } catch (error) {
        console.error('WiFi accounts parse xəta:', error);
    }

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>WiFi Credentials - Otaq ${roomNumber || ''}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    h1 {
                        color: #1f2937;
                        border-bottom: 2px solid #3b82f6;
                        padding-bottom: 10px;
                    }
                    .account-card {
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        padding: 15px;
                        margin: 15px 0;
                        background-color: #f9fafb;
                    }
                    .account-card h3 {
                        margin: 0 0 10px 0;
                        color: #3b82f6;
                    }
                    .credential-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    .credential-label {
                        font-weight: bold;
                        color: #6b7280;
                    }
                    .credential-value {
                        font-family: monospace;
                        color: #1f2937;
                        font-size: 16px;
                    }
                    @media print {
                        body {
                            padding: 10px;
                        }
                        .account-card {
                            page-break-inside: avoid;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>WiFi Giriş Məlumatları</h1>
                <p><strong>Otaq:</strong> ${roomNumber || ''}</p>
                <p><strong>Qonaq sayı:</strong> ${guestCount || wifiAccounts.length}</p>
                <hr>
                ${wifiAccounts.map((account, index) => `
                    <div class="account-card">
                        <h3>Qonaq ${index + 1}</h3>
                        <div class="credential-row">
                            <span class="credential-label">İstifadəçi adı:</span>
                            <span class="credential-value">${account.username}</span>
                        </div>
                        <div class="credential-row">
                            <span class="credential-label">Şifrə:</span>
                            <span class="credential-value">${account.password}</span>
                        </div>
                    </div>
                `).join('')}
            </body>
            </html>
        `;
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    const handleBack = () => {
        navigate(customerPagePath);
    };

    if (!wifiAccounts || wifiAccounts.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
                    <Wifi className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">WiFi Məlumatları Tapılmadı</h2>
                    <p className="text-gray-600 mb-6">Bu rezervasiya üçün WiFi məlumatları mövcud deyil.</p>
                    <button
                        onClick={handleBack}
                        className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Geri qayıt
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBack}
                                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <Wifi className="w-6 h-6 text-blue-600" />
                                    WiFi Giriş Məlumatları
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Otaq: {roomNumber || '-'} | Qonaq sayı: {guestCount || wifiAccounts.length}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Printer className="w-4 h-4" />
                            Çap et
                        </button>
                    </div>
                </div>

                {/* WiFi Accounts Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {wifiAccounts.map((account, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-blue-600">
                                    Qonaq {index + 1}
                                </h3>
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="border-b border-gray-200 pb-3">
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        İstifadəçi adı
                                    </label>
                                    <p className="mt-1 text-lg font-mono font-semibold text-gray-900">
                                        {account.username}
                                    </p>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                        Şifrə
                                    </label>
                                    <p className="mt-1 text-lg font-mono font-semibold text-gray-900">
                                        {account.password}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                        <strong>Qeyd:</strong> Bu məlumatları qonaqlarınıza təqdim edin. Şifrəni təhlükəsiz saxlayın və başqaları ilə paylaşmayın.
                    </p>
                </div>
            </div>
        </div>
    );
}

