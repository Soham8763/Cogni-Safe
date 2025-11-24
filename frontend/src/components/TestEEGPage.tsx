import React, { useState } from 'react';
import { postPredictEEG, type PredictionResponse } from '../services/api';

interface TestEEGPageProps {
  onBack: () => void;
}

const TestEEGPage: React.FC<TestEEGPageProps> = ({ onBack }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a file.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Invalid JSON file.");
      }

      // Expecting JSON to have 'eeg' field or be the array itself
      const eegData = Array.isArray(data) ? data : data.eeg;

      if (!Array.isArray(eegData)) {
        throw new Error("Invalid EEG data format. Expected array of arrays.");
      }

      const response = await postPredictEEG({ eeg: eegData });
      setResult(response);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-3xl">
        <button
          onClick={onBack}
          className="mb-6 text-blue-600 hover:underline flex items-center"
        >
          &larr; Back to Home
        </button>

        <div className="bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Upload EEG Data</h2>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Select JSON File (Array of Arrays)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !file}
            className={`w-full py-3 rounded-lg text-white font-semibold text-lg transition-colors ${
              loading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Analyzing...' : 'Analyze EEG'}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Analysis Result</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg text-center ${
                  result.risk_level === 'High' ? 'bg-red-100 text-red-800' :
                  result.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  <div className="text-sm font-medium uppercase tracking-wide">Risk Level</div>
                  <div className="text-3xl font-bold mt-1">{result.risk_level}</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Probability</div>
                  <div className="text-3xl font-bold text-gray-800 mt-1">{(result.probability * 100).toFixed(1)}%</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status Class</div>
                  <div className="text-3xl font-bold text-gray-800 mt-1">{result.status_class}</div>
                </div>
              </div>

              <div className="mt-4 text-right text-xs text-gray-400">
                Model Version: {result.model_version}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestEEGPage;
