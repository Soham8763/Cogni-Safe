import React, { useState } from 'react';
import HomePage from './components/HomePage';
import TestEEGPage from './components/TestEEGPage';

function App() {
  const [page, setPage] = useState<'home' | 'test'>('home');

  return (
    <div className="font-sans text-gray-900">
      {page === 'home' ? (
        <HomePage onStart={() => setPage('test')} />
      ) : (
        <TestEEGPage onBack={() => setPage('home')} />
      )}
    </div>
  );
}

export default App;
