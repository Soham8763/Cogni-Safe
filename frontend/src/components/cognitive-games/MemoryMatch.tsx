import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

interface MemoryMatchProps {
  onComplete: (results: GameResults) => void;
}

interface GameResults {
  attempts: Array<{
    card1_index: number;
    card2_index: number;
    is_match: boolean;
    time_taken_ms: number;
  }>;
  total_time_ms: number;
  errors: number;
}

interface CardState {
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MemoryMatch: React.FC<MemoryMatchProps> = ({ onComplete }) => {
  const [cards, setCards] = useState<CardState[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [attempts, setAttempts] = useState<GameResults['attempts']>([]);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [attemptStartTime, setAttemptStartTime] = useState<number>(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);

  // Initialize game
  const initializeGame = () => {
    const emojis = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉'];
    const duplicated = [...emojis, ...emojis];
    const shuffled = duplicated.sort(() => Math.random() - 0.5);

    setCards(shuffled.map(emoji => ({
      emoji,
      isFlipped: false,
      isMatched: false
    })));

    setFlippedIndices([]);
    setAttempts([]);
    setErrors(0);
    setMatchedPairs(0);
    setStartTime(Date.now());
    setIsGameStarted(true);
  };

  // Handle card click
  const handleCardClick = (index: number) => {
    if (!isGameStarted) return;
    if (flippedIndices.length === 2) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 1) {
      setAttemptStartTime(Date.now());
    }

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      const isMatch = cards[first].emoji === cards[second].emoji;
      const timeTaken = Date.now() - attemptStartTime;

      // Record attempt
      setAttempts(prev => [...prev, {
        card1_index: first,
        card2_index: second,
        is_match: isMatch,
        time_taken_ms: timeTaken
      }]);

      if (isMatch) {
        // Match found
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[first].isMatched = true;
          matchedCards[second].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          setMatchedPairs(prev => prev + 1);
        }, 500);
      } else {
        // No match
        setErrors(prev => prev + 1);
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // Check if game is complete
  useEffect(() => {
    if (matchedPairs === 6 && isGameStarted) {
      const totalTime = Date.now() - startTime;
      onComplete({
        attempts,
        total_time_ms: totalTime,
        errors
      });
    }
  }, [matchedPairs, isGameStarted]);

  if (!isGameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Memory Match</h2>
          <p className="text-gray-600 mb-2">Find all matching pairs of emojis</p>
          <p className="text-sm text-gray-500">Click two cards to flip them and find matches</p>
        </div>
        <Button onClick={initializeGame} size="lg">
          Start Game
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Memory Match</h2>
          <p className="text-sm text-gray-600">Matches: {matchedPairs}/6 | Errors: {errors}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Time</p>
          <p className="text-2xl font-bold">{Math.floor((Date.now() - startTime) / 1000)}s</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={() => handleCardClick(index)}
            className={`
              aspect-square rounded-lg cursor-pointer transition-all duration-300 transform
              ${card.isFlipped || card.isMatched
                ? 'bg-white shadow-lg scale-105'
                : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:scale-105'
              }
              ${card.isMatched ? 'opacity-50' : ''}
            `}
          >
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {(card.isFlipped || card.isMatched) ? card.emoji : '?'}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center text-sm text-gray-500">
        💡 Tip: Try to remember the positions of cards you've seen
      </div>
    </div>
  );
};

export default MemoryMatch;
