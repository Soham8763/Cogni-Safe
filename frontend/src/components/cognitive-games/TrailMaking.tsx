import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';

interface TrailMakingProps {
  onComplete: (results: GameResults) => void;
}

interface GameResults {
  attempts: Array<{
    from_node: string;
    to_node: string;
    is_correct: boolean;
    time_taken_ms: number;
  }>;
  total_time_ms: number;
  errors: number;
}

interface Node {
  id: string;
  x: number;
  y: number;
  visited: boolean;
}

const TrailMaking: React.FC<TrailMakingProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'instructions' | 'part-a' | 'part-b' | 'complete'>('instructions');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<GameResults['attempts']>([]);
  const [errors, setErrors] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [attemptStartTime, setAttemptStartTime] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate random positions for nodes
  const generateNodes = (isPartB: boolean) => {
    const newNodes: Node[] = [];
    const padding = 60;
    const width = 600;
    const height = 400;

    if (isPartB) {
      // Part B: Alternate between numbers and letters (1-A-2-B-3-C-4-D-5)
      const sequence = ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5'];
      sequence.forEach((id, index) => {
        newNodes.push({
          id,
          x: padding + Math.random() * (width - 2 * padding),
          y: padding + Math.random() * (height - 2 * padding),
          visited: false
        });
      });
    } else {
      // Part A: Numbers 1-8
      for (let i = 1; i <= 8; i++) {
        newNodes.push({
          id: i.toString(),
          x: padding + Math.random() * (width - 2 * padding),
          y: padding + Math.random() * (height - 2 * padding),
          visited: false
        });
      }
    }

    return newNodes;
  };

  // Start game
  const startGame = (partB: boolean = false) => {
    const newNodes = generateNodes(partB);
    setNodes(newNodes);
    setCurrentNode(null);
    setPath([]);
    setAttempts([]);
    setErrors(0);
    setStartTime(Date.now());
    setAttemptStartTime(Date.now());
    setPhase(partB ? 'part-b' : 'part-a');
  };

  // Get next expected node
  const getNextExpectedNode = (): string => {
    if (path.length === 0) {
      return phase === 'part-b' ? '1' : '1';
    }

    const lastNode = path[path.length - 1];

    if (phase === 'part-b') {
      // Alternate: 1-A-2-B-3-C-4-D-5
      const sequence = ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5'];
      const currentIndex = sequence.indexOf(lastNode);
      return currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : '';
    } else {
      // Sequential: 1-2-3-4-5-6-7-8
      const nextNum = parseInt(lastNode) + 1;
      return nextNum <= 8 ? nextNum.toString() : '';
    }
  };

  // Handle node click
  const handleNodeClick = (nodeId: string) => {
    const expectedNode = getNextExpectedNode();
    const timeTaken = Date.now() - attemptStartTime;
    const isCorrect = nodeId === expectedNode;

    // Record attempt
    const newAttempt = {
      from_node: path.length > 0 ? path[path.length - 1] : 'start',
      to_node: nodeId,
      is_correct: isCorrect,
      time_taken_ms: timeTaken
    };
    setAttempts(prev => [...prev, newAttempt]);

    if (isCorrect) {
      // Correct node
      setPath(prev => [...prev, nodeId]);
      setCurrentNode(nodeId);
      setAttemptStartTime(Date.now());

      // Update visited status
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, visited: true } : n
      ));

      // Check if complete
      const isComplete = phase === 'part-b'
        ? nodeId === '5'
        : nodeId === '8';

      if (isComplete) {
        if (phase === 'part-a') {
          // Move to Part B
          setTimeout(() => {
            alert('Part A Complete! Now try Part B with alternating numbers and letters.');
            startGame(true);
          }, 500);
        } else {
          // Game complete
          const totalTime = Date.now() - startTime;
          onComplete({
            attempts: [...attempts, newAttempt],
            total_time_ms: totalTime,
            errors
          });
        }
      }
    } else {
      // Wrong node
      setErrors(prev => prev + 1);
      // Visual feedback (shake animation handled by CSS)
    }
  };

  // Draw canvas connections
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw lines between visited nodes
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let i = 0; i < path.length - 1; i++) {
      const fromNode = nodes.find(n => n.id === path[i]);
      const toNode = nodes.find(n => n.id === path[i + 1]);

      if (fromNode && toNode) {
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
      }
    }

    ctx.stroke();
  }, [path, nodes]);

  if (phase === 'instructions') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 max-w-3xl mx-auto p-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Trail Making Test</h2>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 text-left">
            <p className="font-semibold mb-4 text-lg">Instructions:</p>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-blue-700 mb-2">Part A: Connect the Numbers</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Click the circles in numerical order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8</li>
                  <li>Work as quickly and accurately as possible</li>
                  <li>Lines will connect the circles you click</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-purple-700 mb-2">Part B: Alternate Numbers and Letters</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>Click circles alternating between numbers and letters</li>
                  <li>Sequence: 1 → A → 2 → B → 3 → C → 4 → D → 5</li>
                  <li>This tests your ability to switch between tasks</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 text-left">
            <p className="font-semibold mb-2">Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>If you make a mistake, keep going - errors are tracked</li>
              <li>Speed matters, but accuracy is important too</li>
              <li>Part B is harder - it measures task-switching ability</li>
            </ul>
          </div>
        </div>
        <Button onClick={() => startGame(false)} size="lg">
          Start Part A
        </Button>
      </div>
    );
  }

  const expectedNext = getNextExpectedNode();

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            Trail Making Test - {phase === 'part-a' ? 'Part A' : 'Part B'}
          </h2>
          <p className="text-sm text-gray-600">
            {phase === 'part-a'
              ? 'Connect numbers in order: 1 → 2 → 3...'
              : 'Alternate: 1 → A → 2 → B → 3...'
            }
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Next: <span className="font-bold text-blue-600">{expectedNext || 'Complete!'}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Errors: {errors}</p>
          <p className="text-2xl font-bold">{Math.floor((Date.now() - startTime) / 1000)}s</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-white rounded-xl shadow-lg p-4 mb-4">
        <canvas
          ref={canvasRef}
          width={600}
          height={400}
          className="absolute top-4 left-4 pointer-events-none"
        />
        <div className="relative" style={{ width: 600, height: 400 }}>
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className={`
                absolute w-12 h-12 rounded-full font-bold text-lg
                transform -translate-x-1/2 -translate-y-1/2
                transition-all duration-200
                ${node.visited
                  ? 'bg-blue-600 text-white scale-90'
                  : 'bg-white border-4 border-gray-800 text-gray-800 hover:scale-110 hover:border-blue-600'
                }
                ${node.id === expectedNext ? 'ring-4 ring-green-400 animate-pulse' : ''}
              `}
              style={{
                left: node.x,
                top: node.y
              }}
            >
              {node.id}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        💡 Tip: Click the circles in the correct sequence as fast as you can!
      </div>
    </div>
  );
};

export default TrailMaking;
