import React, { useState } from 'react';
import { Button } from '../ui/button';

interface StroopTestProps {
  onComplete: (results: GameResults) => void;
}

interface GameResults {
  attempts: Array<{
    word: string;
    color: string;
    user_response: string;
    is_correct: boolean;
    reaction_time_ms: number;
  }>;
  total_time_ms: number;
  errors: number;
}

interface Trial {
  word: string;
  color: string;
}

const WORDS = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
const COLORS = ['red', 'blue', 'green', 'yellow'];
const COLOR_NAMES: Record<string, string> = {
  'red': 'Red',
  'blue': 'Blue',
  'green': 'Green',
  'yellow': 'Yellow'
};

const StroopTest: React.FC<StroopTestProps> = ({ onComplete }) => {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [attempts, setAttempts] = useState<GameResults['attempts']>([]);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [trialStartTime, setTrialStartTime] = useState<number>(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Initialize game
  const initializeGame = () => {
    const newTrials: Trial[] = [];
    for (let i = 0; i < 20; i++) {
      newTrials.push({
        word: WORDS[Math.floor(Math.random() * WORDS.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }
    setTrials(newTrials);
    setCurrentTrialIndex(0);
    setAttempts([]);
    setErrors(0);
    setStartTime(Date.now());
    setTrialStartTime(Date.now());
    setIsGameStarted(true);
    setShowInstructions(false);
  };

  // Handle color selection
  const handleColorSelect = (selectedColor: string) => {
    if (!isGameStarted || currentTrialIndex >= trials.length) return;

    const currentTrial = trials[currentTrialIndex];
    const reactionTime = Date.now() - trialStartTime;
    const isCorrect = selectedColor === currentTrial.color;

    // Record attempt
    setAttempts(prev => [...prev, {
      word: currentTrial.word,
      color: currentTrial.color,
      user_response: selectedColor,
      is_correct: isCorrect,
      reaction_time_ms: reactionTime
    }]);

    if (!isCorrect) {
      setErrors(prev => prev + 1);
    }

    // Move to next trial
    const nextIndex = currentTrialIndex + 1;
    if (nextIndex < trials.length) {
      setCurrentTrialIndex(nextIndex);
      setTrialStartTime(Date.now());
    } else {
      // Game complete
      const totalTime = Date.now() - startTime;
      onComplete({
        attempts: [...attempts, {
          word: currentTrial.word,
          color: currentTrial.color,
          user_response: selectedColor,
          is_correct: isCorrect,
          reaction_time_ms: reactionTime
        }],
        total_time_ms: totalTime,
        errors: isCorrect ? errors : errors + 1
      });
    }
  };

  if (showInstructions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-6 max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Stroop Test</h2>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
            <p className="font-semibold mb-2">Instructions:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>You will see words displayed in different colors</li>
              <li><strong>Ignore the word</strong> - click the button matching the <strong>color of the text</strong></li>
              <li>For example: If you see <span className="text-red-600 font-bold">BLUE</span>, click "Red"</li>
              <li>Respond as quickly and accurately as possible</li>
              <li>There are 20 trials</li>
            </ul>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 text-left">
            <p className="font-semibold mb-2">Example:</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">You see:</p>
                <p className="text-4xl font-bold text-green-600">RED</p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">You click:</p>
                <Button className="bg-green-600 hover:bg-green-700">Green</Button>
              </div>
            </div>
          </div>
        </div>
        <Button onClick={initializeGame} size="lg">
          Start Test
        </Button>
      </div>
    );
  }

  if (!isGameStarted || currentTrialIndex >= trials.length) {
    return null;
  }

  const currentTrial = trials[currentTrialIndex];
  const progress = ((currentTrialIndex + 1) / trials.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Trial {currentTrialIndex + 1} of {trials.length}</span>
          <span>Errors: {errors}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stimulus */}
      <div className="bg-white rounded-xl shadow-lg p-12 mb-8 text-center">
        <p className="text-sm text-gray-500 mb-4">What COLOR is this text?</p>
        <p
          className="text-7xl font-bold mb-4"
          style={{ color: currentTrial.color }}
        >
          {currentTrial.word}
        </p>
        <p className="text-xs text-gray-400">Ignore the word, focus on the color</p>
      </div>

      {/* Response buttons */}
      <div className="grid grid-cols-2 gap-4">
        {COLORS.map(color => (
          <Button
            key={color}
            onClick={() => handleColorSelect(color)}
            className="h-16 text-lg font-semibold"
            style={{
              backgroundColor: color,
              color: 'white'
            }}
          >
            {COLOR_NAMES[color]}
          </Button>
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        💡 Tip: Focus on the color, not the word!
      </div>
    </div>
  );
};

export default StroopTest;
