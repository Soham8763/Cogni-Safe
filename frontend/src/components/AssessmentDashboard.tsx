import React, { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface AssessmentDashboardProps {
  setActiveTab: (tab: 'dashboard' | 'upload' | 'live' | 'speech' | 'games' | 'results') => void;
}

interface TestStatus {
  eeg_completed: boolean;
  speech_completed: boolean;
  games_completed: boolean;
  total_completed: number;
  all_complete: boolean;
  eeg_score: number | null;
  speech_score: number | null;
  games_score: number | null;
}

const AssessmentDashboard: React.FC<AssessmentDashboardProps> = ({ setActiveTab }) => {
  const [status, setStatus] = useState<TestStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate or retrieve user ID from session storage
  const [userId] = useState(() => {
    let id = sessionStorage.getItem('cogni_safe_user_id');
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('cogni_safe_user_id', id);
    }
    return id;
  });

  useEffect(() => {
    fetchStatus();

    // Refresh status when tab becomes visible (user returns from test)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/unified/status/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = () => {
    setActiveTab('results');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading assessment status...</div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-500">Failed to load assessment status</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Cognitive Health Assessment
          </h1>
          <p className="text-xl text-gray-600">
            Complete all 3 tests for comprehensive analysis
          </p>
          <div className="mt-4 text-2xl font-semibold text-gray-700">
            Progress: {status.total_completed}/3 tests completed
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 transition-all duration-500 ease-out"
              style={{ width: `${(status.total_completed / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Test Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* EEG Test Card */}
          <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-400">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">🧠</div>
                <h2 className="text-2xl font-bold mb-2">EEG Test</h2>
                <p className="text-gray-600 mb-4">Brain wave analysis</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-lg">⏱️</span>
                  <span className="text-gray-700">~5 minutes</span>
                </div>

                {status.eeg_completed ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-600 text-lg font-semibold">
                      <span>✅</span>
                      <span>Complete</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      Score: {status.eeg_score}/100
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-lg">
                      <span>❌</span>
                      <span>Not Done</span>
                    </div>
                    <Button
                      onClick={() => setActiveTab('upload')}
                      className="w-full mt-4"
                    >
                      Start Test
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Speech Test Card */}
          <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-400">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">🗣️</div>
                <h2 className="text-2xl font-bold mb-2">Speech Analysis</h2>
                <p className="text-gray-600 mb-4">Voice pattern assessment</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-lg">⏱️</span>
                  <span className="text-gray-700">~10 minutes</span>
                </div>

                {status.speech_completed ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-600 text-lg font-semibold">
                      <span>✅</span>
                      <span>Complete</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      Score: {status.speech_score}/100
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-lg">
                      <span>❌</span>
                      <span>Not Done</span>
                    </div>
                    <Button
                      onClick={() => setActiveTab('speech')}
                      className="w-full mt-4"
                    >
                      Start Test
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cognitive Games Card */}
          <Card className="hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-pink-400">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">🎮</div>
                <h2 className="text-2xl font-bold mb-2">Cognitive Games</h2>
                <p className="text-gray-600 mb-4">Interactive brain exercises</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-lg">⏱️</span>
                  <span className="text-gray-700">~15 minutes</span>
                </div>

                {status.games_completed ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-green-600 text-lg font-semibold">
                      <span>✅</span>
                      <span>Complete</span>
                    </div>
                    <div className="text-2xl font-bold text-pink-600">
                      Score: {status.games_score?.toFixed(1)}/100
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-lg">
                      <span>❌</span>
                      <span>Not Done</span>
                    </div>
                    <Button
                      onClick={() => setActiveTab('games')}
                      className="w-full mt-4"
                    >
                      Start Games
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Results Button */}
        {status.all_complete && (
          <div className="text-center">
            <Card className="inline-block bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-400">
              <CardContent className="p-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-green-700 mb-4">
                  All Tests Complete!
                </h2>
                <p className="text-lg text-gray-700 mb-6">
                  View your comprehensive cognitive health report
                </p>
                <Button
                  onClick={handleViewResults}
                  className="text-xl px-12 py-6 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                >
                  View Comprehensive Results
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions */}
        {!status.all_complete && (
          <div className="mt-12">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-3 text-blue-900">📋 Instructions</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Complete all three tests in any order</li>
                  <li>• Each test takes 5-15 minutes</li>
                  <li>• Find a quiet environment for best results</li>
                  <li>• Your progress is automatically saved</li>
                  <li>• Comprehensive results available after completing all tests</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentDashboard;
