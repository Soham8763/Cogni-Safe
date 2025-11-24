import React from 'react';

interface HomePageProps {
  onStart: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-blue-900 mb-6">CogniSafe EEG Screener</h1>
        <p className="text-xl text-gray-700 mb-8">
          Early detection of dementia risk using advanced machine learning analysis of scalp EEG signals.
          Fast, non-invasive, and accurate.
        </p>
        <button
          onClick={onStart}
          className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        >
          Start Screening
        </button>
      </div>
    </div>
  );
};

export default HomePage;
