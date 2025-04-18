import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import axios from 'axios';

function App() {
    const companies = [
        { name: 'Reliance Industries Ltd.', ticker: 'RELIANCE.NS' },
        { name: 'HDFC Bank Ltd.', ticker: 'HDFCBANK.NS' },
        { name: 'ICICI Bank Ltd.', ticker: 'ICICIBANK.NS' },
        { name: 'Infosys Ltd.', ticker: 'INFY.NS' },
        { name: 'Tata Consultancy Services Ltd.', ticker: 'TCS.NS' },
        { name: 'Hindustan Unilever Ltd.', ticker: 'HINDUNILVR.NS' },
        { name: 'Asian Paints Ltd.', ticker: 'ASIANPAINT.NS' },
        { name: 'ITC Ltd.', ticker: 'ITC.NS' },
        { name: 'Kotak Mahindra Bank Ltd.', ticker: 'KOTAKBANK.NS' },
        { name: 'Titan Company Ltd.', ticker: 'TITAN.NS' },
        { name: 'Bajaj Auto Ltd.', ticker: 'BAJAJ-AUTO.NS' },
        { name: 'Havells India Ltd.', ticker: 'HAVELLS.NS' },
        { name: 'Britannia Industries Ltd.', ticker: 'BRITANNIA.NS' },
        { name: 'HDFC Life Insurance Co. Ltd.', ticker: 'HDFCLIFE.NS' },
        { name: 'Pidilite Industries Ltd.', ticker: 'PIDILITIND.NS' },
        { name: 'ICICI Lombard General Insurance Co. Ltd.', ticker: 'ICICIGI.NS' },
        { name: 'Avenue Supermarts Ltd. (DMart)', ticker: 'DMART.NS' },
        { name: 'Jubilant FoodWorks Ltd.', ticker: 'JUBLFOOD.NS' },
        { name: 'Zomato Ltd.', ticker: 'ZOMATO.NS' },
        { name: 'Relaxo Footwears Ltd.', ticker: 'RELAXO.NS' },
        { name: 'Devyani International Ltd.', ticker: 'DEVYANI.NS' },
        { name: 'VIP Industries Ltd.', ticker: 'VIPIND.NS' },
        { name: 'Restaurant Brands Asia Ltd.', ticker: 'RBA.NS' },
        { name: 'Berger Paints India Ltd.', ticker: 'BERGEPAINT.NS' },
    ];

    const [selectedCompany, setSelectedCompany] = useState(companies[0].ticker);
    const [timeframe, setTimeframe] = useState('1d');
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const response = await axios.get(
                    `http://localhost:5000/api/data?ticker=${selectedCompany}&interval=${timeframe}`
                );
                const data = response.data;
                const dates = data.map((d) => new Date(d.Datetime));
                const closes = data.map((d) => d.Close || 0);
                const supports = data
                    .filter((d) => d.support)
                    .map((d) => ({
                        x: new Date(d.Datetime),
                        yMin: d.supportMin || 0,
                        yMax: d.supportMax || 0,
                    }));

                setChartData({
                    labels: dates,
                    datasets: [
                        {
                            label: 'Close Price',
                            data: closes.map((c, i) => ({ x: dates[i], y: c })),
                            borderColor: 'blue',
                            fill: false,
                            tension: 0.1,
                        },
                        ...supports.map((s, i) => ({
                            label: `Support ${i + 1} (${s.yMin}-${s.yMax})`,
                            data: dates.map((date) => ({ x: date, y: s.yMin })), // Horizontal line at yMin across all dates
                            backgroundColor: 'rgba(0, 255, 0, 0.3)',
                            borderColor: 'rgba(0, 255, 0, 1)',
                            fill: false, // Remove fill to avoid overlap
                            borderWidth: 2,
                            pointRadius: 0, // Hide points
                        })),
                    ],
                });
            } catch (error) {
                console.error('Error fetching data:', error);
            }
            setLoading(false);
        }
        fetchData();
    }, [selectedCompany, timeframe]);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Stock Support Analyzer</h1>
            <div className="mb-4 flex space-x-4">
                <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    className="p-2 border rounded"
                >
                    {companies.map((company) => (
                        <option key={company.ticker} value={company.ticker}>
                            {company.name}
                        </option>
                    ))}
                </select>
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="p-2 border rounded">
                    <option value="1h">1 Hour</option>
                    <option value="1d">1 Day</option>
                </select>
            </div>
            {loading ? (
                <p className="text-center">Loading...</p>
            ) : (
                <div style={{ position: 'relative', height: '400px' }}>
                    <Line
                        data={chartData}
                        options={{
                            scales: { x: { type: 'time', time: { unit: 'day' } }, y: { beginAtZero: false } },
                            plugins: { legend: { position: 'top' } },
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default App;
