import React, { useEffect, useState, useRef } from 'react';
import { LineChart, Line, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

interface SimulationData {
    timestamp: number;
    status_class: number;
    probability: number;
    risk_level: string;
    raw_chunk: number[][];
}

const LiveMonitor: React.FC = () => {
    const [data, setData] = useState<SimulationData | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Connect to WebSocket
        ws.current = new WebSocket('ws://localhost:8000/ws/simulate');

        ws.current.onopen = () => {
            setIsConnected(true);
            setError(null);
        };

        ws.current.onclose = () => {
            setIsConnected(false);
        };

        ws.current.onerror = (event) => {
            setError('WebSocket error. Ensure backend is running.');
            console.error(event);
        };

        ws.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.error) {
                    setError(message.error);
                    return;
                }

                setData(message);

                // Process raw chunk for visualization
                // We'll just take the first 100 points of the first channel for demo
                // In a real app, we'd have a more sophisticated buffer
                const chunk = message.raw_chunk;
                if (chunk && chunk.length > 0) {
                    const newPoints = chunk.slice(0, 50).map((row: number[], index: number) => ({
                        time: index,
                        ch1: row[0], // Fp1
                        ch2: row[1], // Fp2
                        ch3: row[2], // F7
                    }));
                    setChartData(newPoints);
                }

            } catch (e) {
                console.error('Error parsing message', e);
            }
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Low': return 'text-green-600';
            case 'Medium': return 'text-yellow-600';
            case 'High': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Live EEG Monitor</h2>
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-gray-600">{isConnected ? 'Live' : 'Disconnected'}</span>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-500 mb-1">Current Risk Level</p>
                        <p className={`text-3xl font-bold ${data ? getRiskColor(data.risk_level) : 'text-gray-400'}`}>
                            {data ? data.risk_level : '--'}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-500 mb-1">Dementia Probability</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {data ? `${(data.probability * 100).toFixed(1)}%` : '--'}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-500 mb-1">Status Class</p>
                        <p className="text-3xl font-bold text-purple-600">
                            {data ? data.status_class : '--'}
                        </p>
                    </div>
                </div>

                <div className="h-64 w-full bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 mb-4">Real-time Signal (First 3 Channels)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Line type="monotone" dataKey="ch1" stroke="#8884d8" dot={false} strokeWidth={2} />
                            <Line type="monotone" dataKey="ch2" stroke="#82ca9d" dot={false} strokeWidth={2} />
                            <Line type="monotone" dataKey="ch3" stroke="#ffc658" dot={false} strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-4 text-xs text-gray-400 text-center">
                    * Simulating live data stream from backend. Updates every second.
                </div>
            </div>
        </div>
    );
};

export default LiveMonitor;
