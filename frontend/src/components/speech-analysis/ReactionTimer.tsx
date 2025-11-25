import React, { useEffect, useState } from 'react';

interface ReactionTimerProps {
    startTime: number;
    isRunning: boolean;
}

const ReactionTimer: React.FC<ReactionTimerProps> = ({ startTime, isRunning }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isRunning) {
            interval = setInterval(() => {
                setElapsed(Date.now() - startTime);
            }, 50);
        }
        return () => clearInterval(interval);
    }, [isRunning, startTime]);

    const getColor = () => {
        if (elapsed < 2000) return 'text-green-600';
        if (elapsed < 3000) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="text-center p-4">
            <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">Reaction Time</p>
            <div className={`text-4xl font-mono font-bold ${getColor()}`}>
                {(elapsed / 1000).toFixed(2)}s
            </div>
            {isRunning && (
                <p className="text-sm text-gray-400 mt-2 animate-pulse">
                    Speak now!
                </p>
            )}
        </div>
    );
};

export default ReactionTimer;
