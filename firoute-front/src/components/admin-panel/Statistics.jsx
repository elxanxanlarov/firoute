import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTranslation } from 'react-i18next';

const Statistics = () => {
    const { t } = useTranslation('admin-panel');

    // Customer Statistics Data
    const customerStatsData = {
        title: {
            text: t('customer_statistics', 'Müştəri Statistikaları'),
            left: 'center',
            textStyle: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#374151'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            }
        },
        legend: {
            data: [t('active_customers', 'Aktiv müştərilər'), t('inactive_customers', 'Qeyri-aktiv müştərilər')],
            top: 30
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyun', 'İyul', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek']
        },
        yAxis: {
            type: 'value',
            name: t('customers', 'Müştərilər')
        },
        series: [
            {
                name: t('active_customers', 'Aktiv müştərilər'),
                type: 'bar',
                data: [120, 132, 101, 134, 90, 230, 210, 180, 200, 220, 190, 250],
                itemStyle: {
                    color: '#10B981'
                }
            },
            {
                name: t('inactive_customers', 'Qeyri-aktiv müştərilər'),
                type: 'bar',
                data: [20, 32, 21, 34, 10, 30, 20, 15, 25, 30, 20, 25],
                itemStyle: {
                    color: '#EF4444'
                }
            }
        ]
    };

    // Router Performance Data
    const routerPerformanceData = {
        title: {
            text: t('router_performance', 'Router Performansı'),
            left: 'center',
            textStyle: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#374151'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            }
        },
        legend: {
            data: [t('uptime', 'İş vaxtı'), t('latency', 'Gecikmə'), t('throughput', 'Ötürmə qabiliyyəti')],
            top: 30
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['Router-001', 'Router-002', 'Router-003', 'Router-004', 'Router-005']
        },
        yAxis: [
            {
                type: 'value',
                name: '%',
                position: 'left'
            },
            {
                type: 'value',
                name: 'ms',
                position: 'right'
            }
        ],
        series: [
            {
                name: t('uptime', 'İş vaxtı'),
                type: 'bar',
                data: [99.9, 98.5, 99.2, 97.8, 99.5],
                itemStyle: {
                    color: '#3B82F6'
                }
            },
            {
                name: t('latency', 'Gecikmə'),
                type: 'line',
                yAxisIndex: 1,
                data: [12, 15, 8, 22, 18],
                itemStyle: {
                    color: '#8B5CF6'
                }
            },
            {
                name: t('throughput', 'Ötürmə qabiliyyəti'),
                type: 'line',
                data: [85, 92, 78, 88, 95],
                itemStyle: {
                    color: '#10B981'
                }
            }
        ]
    };

    // Network Traffic Data
    const networkTrafficData = {
        title: {
            text: t('network_traffic', 'Şəbəkə Trafiki'),
            left: 'center',
            textStyle: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#374151'
            }
        },
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c}GB ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            top: 'middle'
        },
        series: [
            {
                name: t('traffic_by_router', 'Router üzrə trafik'),
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['60%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '20',
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: [
                    { value: 35, name: 'Router-001', itemStyle: { color: '#10B981' } },
                    { value: 28, name: 'Router-002', itemStyle: { color: '#3B82F6' } },
                    { value: 20, name: 'Router-003', itemStyle: { color: '#8B5CF6' } },
                    { value: 12, name: 'Router-004', itemStyle: { color: '#F59E0B' } },
                    { value: 5, name: 'Router-005', itemStyle: { color: '#EF4444' } }
                ]
            }
        ]
    };

    // System Overview Data
    const systemOverviewData = {
        title: {
            text: t('system_overview', 'Sistem Ümumi Görünüşü'),
            left: 'center',
            textStyle: {
                fontSize: 18,
                fontWeight: 'bold',
                color: '#374151'
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            }
        },
        legend: {
            data: [t('total_customers', 'Ümumi müştərilər'), t('active_routers', 'Aktiv routerlər'), t('total_traffic', 'Ümumi trafik')],
            top: 30
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
        },
        yAxis: {
            type: 'value'
        },
        series: [
            {
                name: t('total_customers', 'Ümumi müştərilər'),
                type: 'line',
                smooth: true,
                data: [150, 155, 160, 165, 170, 175, 180],
                itemStyle: {
                    color: '#10B981'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0, color: 'rgba(16, 185, 129, 0.3)'
                        }, {
                            offset: 1, color: 'rgba(16, 185, 129, 0.1)'
                        }]
                    }
                }
            },
            {
                name: t('active_routers', 'Aktiv routerlər'),
                type: 'line',
                smooth: true,
                data: [5, 5, 5, 5, 5, 5, 5],
                itemStyle: {
                    color: '#3B82F6'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0, color: 'rgba(59, 130, 246, 0.3)'
                        }, {
                            offset: 1, color: 'rgba(59, 130, 246, 0.1)'
                        }]
                    }
                }
            },
            {
                name: t('total_traffic', 'Ümumi trafik'),
                type: 'line',
                smooth: true,
                data: [120, 140, 160, 180, 200, 220, 240],
                itemStyle: {
                    color: '#8B5CF6'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0, color: 'rgba(139, 92, 246, 0.3)'
                        }, {
                            offset: 1, color: 'rgba(139, 92, 246, 0.1)'
                        }]
                    }
                }
            }
        ]
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('general_statistics', 'Ümumi Statistikalar')}</h1>
                <p className="text-gray-600">{t('monitor_system_performance', 'Sistem performansını izləyin və analiz edin')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Customer Statistics */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <ReactECharts 
                        option={customerStatsData} 
                        style={{ height: '400px' }}
                        opts={{ renderer: 'svg' }}
                    />
                </div>

                {/* Router Performance */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <ReactECharts 
                        option={routerPerformanceData} 
                        style={{ height: '400px' }}
                        opts={{ renderer: 'svg' }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Network Traffic */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <ReactECharts 
                        option={networkTrafficData} 
                        style={{ height: '400px' }}
                        opts={{ renderer: 'svg' }}
                    />
                </div>

                {/* System Overview */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <ReactECharts 
                        option={systemOverviewData} 
                        style={{ height: '400px' }}
                        opts={{ renderer: 'svg' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Statistics;