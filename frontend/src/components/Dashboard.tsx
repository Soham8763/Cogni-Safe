import { useState } from 'react';
import TestEEGPage from './TestEEGPage'
import LiveMonitor from './LiveMonitor'
import SpeechTest from './speech-analysis/SpeechTest'
import CognitiveGamesPage from './cognitive-games/CognitiveGamesPage'
import AssessmentDashboard from './AssessmentDashboard'
import UnifiedResults from './UnifiedResults'

function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'live' | 'speech' | 'games' | 'results'>('dashboard');

  // Global user ID management
  const [userId] = useState<string>(() => {
    let id = sessionStorage.getItem('cogni_safe_user_id');
    if (!id) {
      id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('cogni_safe_user_id', id);
    }
    return id;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">CogniSafe</span>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Assessment Dashboard
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'upload'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setActiveTab('live')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'live'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Live Monitor
              </button>
              <button
                onClick={() => setActiveTab('speech')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'speech'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Speech Analysis
              </button>
              <button
                onClick={() => setActiveTab('games')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'games'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Cognitive Games
              </button>
            </div>

            <div className="flex items-center">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure? This will clear all current progress.')) {
                    sessionStorage.removeItem('cogni_safe_user_id');
                    window.location.reload();
                  }
                }}
                className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200"
              >
                Start New Session
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        {activeTab === 'dashboard' && <AssessmentDashboard setActiveTab={setActiveTab} />}
        {activeTab === 'upload' && (
          <TestEEGPage
            userId={userId}
            onComplete={() => setActiveTab('dashboard')}
          />
        )}
        {activeTab === 'live' && <LiveMonitor />}
        {activeTab === 'speech' && (
          <SpeechTest
            userId={userId}
            onComplete={() => setActiveTab('dashboard')}
          />
        )}
        {activeTab === 'games' && (
          <CognitiveGamesPage
            userId={userId}
            onComplete={() => setActiveTab('dashboard')}
          />
        )}
        {activeTab === 'results' && <UnifiedResults setActiveTab={setActiveTab} />}
      </main>
    </div>
  )
}

export default Dashboard;
