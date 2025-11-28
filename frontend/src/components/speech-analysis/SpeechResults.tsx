import React, { useEffect, useState } from 'react';
import type { SpeechRiskScore } from '../../types/speech';
import { getSpeechResults } from '../../services/speechApi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface SpeechResultsProps {
    sessionId: string;
    onRestart: () => void;
    onComplete?: () => void;
}

const SpeechResults: React.FC<SpeechResultsProps> = ({ sessionId, onRestart, onComplete }) => {
    const [results, setResults] = useState<SpeechRiskScore | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await getSpeechResults(sessionId);
                setResults(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [sessionId]);

    if (loading) return <div className="text-center p-12">Loading results...</div>;
    if (!results) return <div className="text-center p-12 text-red-500">Failed to load results.</div>;

    const chartData = [
        { name: 'Reaction', score: results.reaction_time_score },
        { name: 'Speech', score: results.speech_quality_score },
        { name: 'Hearing', score: results.hearing_score },
    ];

    const getRiskColor = (score: number) => {
        if (score < 30) return 'text-green-600';
        if (score < 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Assessment Complete</h2>
                <div className="relative inline-flex items-center justify-center mt-6 mb-8">
                    <svg className="w-48 h-48 transform -rotate-90">
                        <circle
                            className="text-gray-200"
                            strokeWidth="12"
                            stroke="currentColor"
                            fill="transparent"
                            r="88"
                            cx="96"
                            cy="96"
                        />
                        <circle
                            className={`${results.overall_risk_score < 30 ? 'text-green-500' : results.overall_risk_score < 60 ? 'text-yellow-500' : 'text-red-500'}`}
                            strokeWidth="12"
                            strokeDasharray={553}
                            strokeDashoffset={553 - (553 * results.overall_risk_score) / 100}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="88"
                            cx="96"
                            cy="96"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className={`text-5xl font-bold ${getRiskColor(results.overall_risk_score)}`}>
                            {results.overall_risk_score.toFixed(0)}
                        </span>
                        <span className="text-gray-500 text-sm uppercase tracking-wide mt-1">Risk Score</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div>
                        <h3 className="font-bold text-gray-700 mb-4">Component Analysis</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Bar dataKey="score" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-gray-700 mb-4">Recommendations</h3>
                        <ul className="space-y-3">
                            {results.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                                    <span className="text-blue-500 mt-1">ℹ️</span>
                                    <span className="text-gray-700 text-sm">{rec}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="text-center space-x-4">
                {onComplete && (
                    <button
                        onClick={onComplete}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                    >
                        Return to Dashboard
                    </button>
                )}
                <button
                    onClick={onRestart}
                    className="px-6 py-2 text-gray-500 hover:text-gray-700 underline"
                >
                    Start New Assessment
                </button>
            </div>
        </div>
    );
};

export default SpeechResults;
