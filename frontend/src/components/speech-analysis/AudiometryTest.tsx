import React, { useState, useRef } from 'react';
import { performAudiometryTest } from '../../services/speechApi';

interface AudiometryTestProps {
    onComplete: (thresholdDb: number) => void;
    onSkip: () => void;
}

const AudiometryTest: React.FC<AudiometryTestProps> = ({ onComplete, onSkip }) => {
    const [step, setStep] = useState<'intro' | 'playing' | 'response'>('intro');
    const [volume, setVolume] = useState(0.3);
    const [frequency] = useState(1000);
    const audioContext = useRef<AudioContext | null>(null);

    const [history, setHistory] = useState<number[]>([]);

    const playTone = () => {
        setStep('playing');
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioContext.current.createOscillator();
        const gain = audioContext.current.createGain();

        osc.frequency.value = frequency;
        gain.gain.value = volume;

        osc.connect(gain);
        gain.connect(audioContext.current.destination);

        osc.start();
        setTimeout(() => {
            osc.stop();
            audioContext.current?.close();
            setStep('response');
        }, 1000); // Play for 1 second
    };

    const handleResponse = async (heard: boolean) => {
        // Update history
        const newHistory = [...history, volume];
        setHistory(newHistory);

        // Safety break: Max 10 attempts
        if (newHistory.length >= 10) {
            onComplete(volume * 100);
            return;
        }

        try {
            const result = await performAudiometryTest(frequency, volume, heard);

            if (!result.continue_test) {
                onComplete(result.threshold_db);
            } else if (result.next_volume !== null) {
                // Loop detection: If we are going back to a volume we already tested
                if (newHistory.includes(result.next_volume)) {
                    // We found the boundary (toggling between heard/not heard)
                    // Return the higher volume (safer estimate) or current
                    onComplete(Math.max(volume, result.next_volume) * 100);
                    return;
                }

                setVolume(result.next_volume);
                // Small delay before next tone
                setTimeout(playTone, 1000);
            }
        } catch (e) {
            console.error(e);
            onSkip(); // Skip on error
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Hearing Check</h2>

            {step === 'intro' && (
                <div>
                    <p className="text-gray-600 mb-6">
                        We'll play a short tone. Please ensure your volume is on and you are in a quiet room.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={onSkip} className="text-gray-500 hover:text-gray-700">Skip</button>
                        <button
                            onClick={playTone}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Start Test
                        </button>
                    </div>
                </div>
            )}

            {step === 'playing' && (
                <div className="py-12">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-500">Playing tone...</p>
                </div>
            )}

            {step === 'response' && (
                <div>
                    <p className="text-lg font-medium mb-8">Did you hear the tone?</p>
                    <div className="flex gap-6 justify-center">
                        <button
                            onClick={() => handleResponse(false)}
                            className="px-8 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold"
                        >
                            No
                        </button>
                        <button
                            onClick={() => handleResponse(true)}
                            className="px-8 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-semibold"
                        >
                            Yes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudiometryTest;
