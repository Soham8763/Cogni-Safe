import React, { useState } from 'react';
import MemoryMatch from './MemoryMatch';
import StroopTest from './StroopTest';
import TrailMaking from './TrailMaking';
import PatternRecognition from './PatternRecognition';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface GameResult {
  game_type: string;
  score: number;
  accuracy: number;
  avg_reaction_time_ms: number;
  performance_level: string;
}

interface CognitiveGamesPageProps {
  userId: string;
  onComplete?: () => void;
}

const CognitiveGamesPage: React.FC<CognitiveGamesPageProps> = ({ userId, onComplete }) => {
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGameComplete = async (gameType: string, gameResults: any) => {
    setIsSubmitting(true);

    try {
      // Submit to backend
      const response = await fetch('http://localhost:8000/api/games/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: localStorage.getItem(`${gameType}_session_id`),
          game_type: gameType,
          ...gameResults
        }),
      });

      if (!response.ok) throw new Error('Failed to submit game results');

      const result = await response.json();
      setResults(prev => [...prev, result]);
      setCurrentGame(null);
    } catch (error) {
      console.error('Error submitting game:', error);
      alert('Failed to submit game results. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startGame = async (gameType: string) => {
    try {
      // Start game session
      const response = await fetch('http://localhost:8000/api/games/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          game_type: gameType
        }),
      });

      if (!response.ok) throw new Error('Failed to start game');

      const data = await response.json();
      localStorage.setItem(`${gameType}_session_id`, data.session_id);
      setCurrentGame(gameType);
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game. Please try again.');
    }
  };

  // Game selection screen
  if (!currentGame) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Cognitive Games</h1>
          <p className="text-gray-600">
            Test your cognitive abilities with these scientifically-designed games
          </p>
        </div>

        {/* Results summary */}
        {results.length > 0 && (
          <div className="mb-8 bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <h3 className="font-semibold mb-2">Completed Games:</h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="capitalize">{result.game_type.replace('_', ' ')}</span>
                  <span className="font-bold">
                    {result.score.toFixed(0)}/100 - {result.performance_level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Memory Match */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="text-6xl mb-4">🧠</div>
              <h2 className="text-2xl font-bold mb-2">Memory Match</h2>
              <p className="text-gray-600 mb-4">
                Find matching pairs of emojis. Tests short-term memory and visual processing.
              </p>
              <div className="space-y-2 text-sm text-gray-500 mb-4">
                <p>⏱️ Duration: ~2 minutes</p>
                <p>🎯 Measures: Memory, Attention</p>
                <p>📊 Difficulty: Easy</p>
              </div>
              <Button
                onClick={() => startGame('memory_match')}
                className="w-full"
                disabled={results.some(r => r.game_type === 'memory_match')}
              >
                {results.some(r => r.game_type === 'memory_match') ? '✓ Completed' : 'Start Game'}
              </Button>
            </CardContent>
          </Card>

          {/* Stroop Test */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="text-6xl mb-4">🎨</div>
              <h2 className="text-2xl font-bold mb-2">Stroop Test</h2>
              <p className="text-gray-600 mb-4">
                Identify the color of the text, not the word. Tests cognitive control and processing speed.
              </p>
              <div className="space-y-2 text-sm text-gray-500 mb-4">
                <p>⏱️ Duration: ~1 minute</p>
                <p>🎯 Measures: Attention, Executive Function</p>
                <p>📊 Difficulty: Medium</p>
              </div>
              <Button
                onClick={() => startGame('stroop_test')}
                className="w-full"
                disabled={results.some(r => r.game_type === 'stroop_test')}
              >
                {results.some(r => r.game_type === 'stroop_test') ? '✓ Completed' : 'Start Game'}
              </Button>
            </CardContent>
          </Card>

          {/* Trail Making */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="text-6xl mb-4">🔢</div>
              <h2 className="text-2xl font-bold mb-2">Trail Making</h2>
              <p className="text-gray-600 mb-4">
                Connect numbers in sequence, then alternate numbers and letters. Tests executive function and task-switching.
              </p>
              <div className="space-y-2 text-sm text-gray-500 mb-4">
                <p>⏱️ Duration: ~3 minutes</p>
                <p>🎯 Measures: Executive Function, Attention</p>
                <p>📊 Difficulty: Hard</p>
              </div>
              <Button
                onClick={() => startGame('trail_making')}
                className="w-full"
                disabled={results.some(r => r.game_type === 'trail_making')}
              >
                {results.some(r => r.game_type === 'trail_making') ? '✓ Completed' : 'Start Game'}
              </Button>
            </CardContent>
          </Card>

          {/* Pattern Recognition */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="text-6xl mb-4">🔮</div>
              <h2 className="text-2xl font-bold mb-2">Pattern Recognition</h2>
              <p className="text-gray-600 mb-4">
                Identify patterns in sequences of shapes. Tests abstract reasoning and pattern detection.
              </p>
              <div className="space-y-2 text-sm text-gray-500 mb-4">
                <p>⏱️ Duration: ~2 minutes</p>
                <p>🎯 Measures: Abstract Reasoning, Attention</p>
                <p>📊 Difficulty: Medium-Hard</p>
              </div>
              <Button
                onClick={() => startGame('pattern_recognition')}
                className="w-full"
                disabled={results.some(r => r.game_type === 'pattern_recognition')}
              >
                {results.some(r => r.game_type === 'pattern_recognition') ? '✓ Completed' : 'Start Game'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* View Results button */}
        {results.length === 4 && (
          <div className="mt-8 text-center space-x-4">
            {onComplete && (
              <Button size="lg" onClick={onComplete} className="bg-blue-600 hover:bg-blue-700">
                Return to Dashboard
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={() => window.location.href = '/results'}>
              View Complete Results
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Game screen
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <p className="text-lg">Submitting results...</p>
          </div>
        </div>
      )}

      {currentGame === 'memory_match' && (
        <MemoryMatch
          onComplete={(results) => handleGameComplete('memory_match', results)}
        />
      )}

      {currentGame === 'stroop_test' && (
        <StroopTest
          onComplete={(results) => handleGameComplete('stroop_test', results)}
        />
      )}

      {currentGame === 'trail_making' && (
        <TrailMaking
          onComplete={(results) => handleGameComplete('trail_making', results)}
        />
      )}

      {currentGame === 'pattern_recognition' && (
        <PatternRecognition
          onComplete={(results) => handleGameComplete('pattern_recognition', results)}
        />
      )}
    </div>
  );
};

export default CognitiveGamesPage;
