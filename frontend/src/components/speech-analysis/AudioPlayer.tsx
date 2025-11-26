import React, { useEffect, useState } from 'react';

interface AudioPlayerProps {
    sentence: string;
    volume: number;
    onPlaybackEnd: () => void;
    autoPlay?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ sentence, volume, onPlaybackEnd, autoPlay = false }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasPlayed, setHasPlayed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const playAudio = () => {
        console.log("🔊 Attempting to play:", sentence);
        setError(null);
        setIsPlaying(true);

        // Check if speech synthesis is available
        if (!window.speechSynthesis) {
            const err = "Speech synthesis not supported in this browser";
            console.error(err);
            setError(err);
            setIsPlaying(false);
            return;
        }

        try {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(sentence);
            utterance.volume = volume;
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.lang = 'en-US';

            utterance.onstart = () => {
                console.log("✅ Speech started");
            };

            utterance.onend = () => {
                console.log("✅ Speech ended");
                setIsPlaying(false);
                setHasPlayed(true);
                onPlaybackEnd();
            };

            utterance.onerror = (e) => {
                console.error("❌ Speech synthesis error:", e);
                setError(`Speech error: ${e.error}`);
                setIsPlaying(false);
            };

            console.log("📢 Speaking now...");
            window.speechSynthesis.speak(utterance);

            // Fallback timeout in case onend doesn't fire
            setTimeout(() => {
                if (isPlaying) {
                    console.warn("⚠️ Speech timeout - forcing end");
                    setIsPlaying(false);
                    setHasPlayed(true);
                    onPlaybackEnd();
                }
            }, 10000); // 10 second timeout

        } catch (err) {
            console.error("❌ Error in playAudio:", err);
            setError(String(err));
            setIsPlaying(false);
        }
    };

    useEffect(() => {
        console.log("🎯 AudioPlayer mounted for sentence:", sentence);

        // Reset when sentence changes
        setHasPlayed(false);
        setIsPlaying(false);
        setError(null);

        // Auto-play if requested
        if (autoPlay) {
            console.log("🎬 Auto-play enabled, will play in 300ms");
            const timer = setTimeout(() => {
                playAudio();
            }, 300);
            return () => {
                console.log("🧹 Cleaning up timer");
                clearTimeout(timer);
            };
        }
    }, [sentence]);

    useEffect(() => {
        return () => {
            console.log("🧹 AudioPlayer unmounting, canceling speech");
            window.speechSynthesis.cancel();
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg">
            <p className="text-xl font-medium text-gray-800 mb-4 text-center">"{sentence}"</p>

            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                    {error}
                </div>
            )}

            <button
                onClick={playAudio}
                disabled={isPlaying}
                className={`px-6 py-3 rounded-full font-bold text-white transition-colors ${
                    isPlaying
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
                }`}
            >
                {isPlaying ? 'Playing...' : hasPlayed ? '🔊 Play Again' : '🔊 Play Sentence'}
            </button>

            <div className="mt-4 w-full max-w-xs">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Volume</span>
                    <span>{Math.round(volume * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${volume * 100}%` }}
                    />
                </div>
            </div>

            <p className="mt-4 text-xs text-gray-500">
                {isPlaying ? "🎵 Audio is playing..." : "Click the button to hear the sentence"}
            </p>
        </div>
    );
};

export default AudioPlayer;
