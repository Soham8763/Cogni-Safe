import { useState } from 'react';
import TestEEGPage from './components/TestEEGPage'
import LiveMonitor from './components/LiveMonitor'
import SpeechTest from './components/speech-analysis/SpeechTest'

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'live' | 'speech'>('upload');

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
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        {activeTab === 'upload' && <TestEEGPage />}
        {activeTab === 'live' && <LiveMonitor />}
        {activeTab === 'speech' && <SpeechTest />}
      </main>
    </div>
  )
}

export default App;
