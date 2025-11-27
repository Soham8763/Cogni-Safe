import React, { useState } from 'react';
import { Button } from '../ui/button';

interface PatternRecognitionProps {
  onComplete: (results: GameResults) => void;
}

interface GameResults {
  attempts: Array<{
    pattern: string[];
    user_answer: string;
    correct_answer: string;
    is_correct: boolean;
    reaction_time_ms: number;
  }>;
  total_time_ms: number;
  errors: number;
}

interface Pattern {
  sequence: string[];
  options: string[];
  correctAnswer: string;
  rule: string;
}

const SHAPES = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⬛', '⬜', '🔺', '🔻', '⭐', '❤️'];

const PatternRecognition: React.FC<PatternRecognitionProps> = ({ onComplete }) => {
  const [showInstructions, setShowInstructions] = useState(true);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [attempts, setAttempts] = useState<GameResults['attempts']>([]);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [trialStartTime, setTrialStartTime] = useState<number>(0);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Generate patterns
  const generatePatterns = (): Pattern[] => {
    const newPatterns: Pattern[] = [];

    // Pattern 1: Simple repetition (A-B-A-B-A-?)
    const shape1 = SHAPES[0];
    const shape2 = SHAPES[1];
    newPatterns.push({
      sequence: [shape1, shape2, shape1, shape2, shape1],
      options: [shape1, shape2, SHAPES[2], SHAPES[3]],
      correctAnswer: shape2,
      rule: 'Alternating pattern'
    });

    // Pattern 2: Increasing sequence (1-2-3-4-?)
    newPatterns.push({
      sequence: ['🔴', '🔴🔴', '🔴🔴🔴', '🔴🔴🔴🔴'],
      options: ['🔴', '🔴🔴🔴🔴🔴', '🔴🔴🔴', '🔴🔴'],
      correctAnswer: '🔴🔴🔴🔴🔴',
      rule: 'Increasing by one'
    });

    // Pattern 3: A-A-B-A-A-B-A-A-?
    newPatterns.push({
      sequence: ['⭐', '⭐', '❤️', '⭐', '⭐', '❤️', '⭐', '⭐'],
      options: ['⭐', '❤️', '🔵', '🟢'],
      correctAnswer: '❤️',
      rule: 'Two-one pattern'
    });

    // Pattern 4: Color rotation
    newPatterns.push({
      sequence: ['🔴', '🔵', '🟢', '🔴', '🔵'],
      options: ['🟢', '🔴', '🔵', '🟡'],
      correctAnswer: '🟢',
      rule: 'Repeating cycle'
    });

    // Pattern 5: Decreasing
    newPatterns.push({
      sequence: ['🔵🔵🔵🔵', '🔵🔵🔵', '🔵🔵'],
      options: ['🔵', '🔵🔵', '🔵🔵🔵', '🔵🔵🔵🔵'],
      correctAnswer: '🔵',
      rule: 'Decreasing by one'
    });

    // Pattern 6: A-B-C-A-B-C-A-B-?
    newPatterns.push({
      sequence: ['🟣', '🟠', '⬛', '🟣', '🟠', '⬛', '🟣', '🟠'],
      options: ['⬛', '🟣', '🟠', '⬜'],
      correctAnswer: '⬛',
      rule: 'Three-part cycle'
    });

    // Pattern 7: Alternating with skip
    newPatterns.push({
      sequence: ['🔺', '🔻', '🔻', '🔺', '🔻', '🔻', '🔺'],
      options: ['🔺', '🔻', '⭐', '❤️'],
      correctAnswer: '🔻',
      rule: 'One-two pattern'
    });

    // Pattern 8: Complex alternation
    newPatterns.push({
      sequence: ['⬜', '⬛', '⬜', '⬜', '⬛', '⬜', '⬜', '⬛'],
      options: ['⬜', '⬛', '🔴', '🔵'],
      correctAnswer: '⬜',
      rule: 'Increasing white squares'
    });

    // Pattern 9: Mirror pattern
    newPatterns.push({
      sequence: ['🟡', '🟢', '🔵', '🔵', '🟢'],
      options: ['🟡', '🟢', '🔵', '🔴'],
      correctAnswer: '🟡',
      rule: 'Mirror/palindrome'
    });

    // Pattern 10: Double alternation
    newPatterns.push({
      sequence: ['❤️', '❤️', '⭐', '⭐', '❤️', '❤️', '⭐'],
      options: ['❤️', '⭐', '🔴', '🔵'],
      correctAnswer: '⭐',
      rule: 'Pairs alternating'
    });

    return newPatterns;
  };

  // Start game
  const startGame = () => {
    const newPatterns = generatePatterns();
    setPatterns(newPatterns);
    setCurrentPatternIndex(0);
    setAttempts([]);
    setErrors(0);
    setStartTime(Date.now());
    setTrialStartTime(Date.now());
    setShowInstructions(false);
    setShowFeedback(null);
  };

  // Handle answer selection
  const handleAnswer = (selectedAnswer: string) => {
    if (showFeedback) return; // Prevent multiple clicks

    const currentPattern = patterns[currentPatternIndex];
    const reactionTime = Date.now() - trialStartTime;
    const isCorrect = selectedAnswer === currentPattern.correctAnswer;

    // Record attempt
    const newAttempt = {
      pattern: currentPattern.sequence,
      user_answer: selectedAnswer,
      correct_answer: currentPattern.correctAnswer,
      is_correct: isCorrect,
      reaction_time_ms: reactionTime
    };
    setAttempts(prev => [...prev, newAttempt]);

    if (!isCorrect) {
      setErrors(prev => prev + 1);
    }

    // Show feedback
    setShowFeedback(isCorrect ? 'correct' : 'wrong');

    // Move to next pattern after delay
    setTimeout(() => {
      const nextIndex = currentPatternIndex + 1;
      if (nextIndex < patterns.length) {
        setCurrentPatternIndex(nextIndex);
        setTrialStartTime(Date.now());
        setShowFeedback(null);
      } else {
        // Game complete
        const totalTime = Date.now() - startTime;
        onComplete({
          attempts: [...attempts, newAttempt],
          total_time_ms: totalTime,
          errors: isCorrect ? errors : errors + 1
        });
      }
    }, 1500);
  };

  if (showInstructions) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 max-w-3xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Pattern Recognition</h2>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 text-left">
            <p className="font-semibold mb-4 text-lg">Instructions:</p>
            <ul className="list-disc list-inside space-y-3 text-gray-700">
              <li>You will see a sequence of shapes or symbols</li>
              <li>Identify the pattern and predict what comes next</li>
              <li>Click the shape that should complete the sequence</li>
              <li>There are 10 different patterns to solve</li>
              <li>Work as quickly and accurately as possible</li>
            </ul>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-6 text-left">
            <p className="font-semibold mb-3">Example Patterns:</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-600 w-24">Alternating:</span>
                <span className="text-2xl">🔴 🔵 🔴 🔵 🔴 <span className="text-blue-600 font-bold">?</span></span>
                <span className="ml-4 text-sm text-gray-500">→ Answer: 🔵</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 w-24">Increasing:</span>
                <span className="text-2xl">⭐ ⭐⭐ ⭐⭐⭐ <span className="text-blue-600 font-bold">?</span></span>
                <span className="ml-4 text-sm text-gray-500">→ Answer: ⭐⭐⭐⭐</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 w-24">Repeating:</span>
                <span className="text-2xl">🟢 🟡 🔵 🟢 🟡 <span className="text-blue-600 font-bold">?</span></span>
                <span className="ml-4 text-sm text-gray-500">→ Answer: 🔵</span>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-left">
            <p className="font-semibold mb-2">Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Look for repeating patterns, cycles, or sequences</li>
              <li>Count the number of items in each group</li>
              <li>Some patterns may increase, decrease, or alternate</li>
            </ul>
          </div>
        </div>
        <Button onClick={startGame} size="lg">
          Start Test
        </Button>
      </div>
    );
  }

  if (currentPatternIndex >= patterns.length) {
    return null;
  }

  const currentPattern = patterns[currentPatternIndex];
  const progress = ((currentPatternIndex + 1) / patterns.length) * 100;

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Pattern {currentPatternIndex + 1} of {patterns.length}</span>
          <span>Errors: {errors}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pattern Display */}
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <p className="text-sm text-gray-500 mb-4 text-center">What comes next in this sequence?</p>
        <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
          {currentPattern.sequence.map((item, index) => (
            <div key={index} className="text-5xl">
              {item}
            </div>
          ))}
          <div className="text-5xl text-blue-600 font-bold animate-pulse">
            ?
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">
          Hint: Look for {currentPattern.rule}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {currentPattern.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(option)}
            disabled={showFeedback !== null}
            className={`
              p-8 rounded-xl text-6xl transition-all duration-200
              ${showFeedback === null
                ? 'bg-white hover:bg-blue-50 hover:scale-105 shadow-md hover:shadow-lg'
                : 'opacity-50 cursor-not-allowed'
              }
              ${showFeedback === 'correct' && option === currentPattern.correctAnswer
                ? 'bg-green-100 ring-4 ring-green-500'
                : ''
              }
              ${showFeedback === 'wrong' && option === currentPattern.correctAnswer
                ? 'bg-green-100 ring-4 ring-green-500'
                : ''
              }
            `}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className={`text-center p-4 rounded-lg ${
          showFeedback === 'correct'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          <p className="text-lg font-semibold">
            {showFeedback === 'correct' ? '✓ Correct!' : '✗ Incorrect'}
          </p>
          {showFeedback === 'wrong' && (
            <p className="text-sm mt-1">
              The correct answer was: {currentPattern.correctAnswer}
            </p>
          )}
        </div>
      )}

      {!showFeedback && (
        <div className="text-center text-sm text-gray-500">
          💡 Tip: Take your time to identify the pattern before answering
        </div>
      )}
    </div>
  );
};

export default PatternRecognition;
