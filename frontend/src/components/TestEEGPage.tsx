import React, { useState } from 'react';
import { postPredictEEG, type PredictionResponse } from '../services/api';



interface TestEEGPageProps {
  userId?: string;
  onComplete?: () => void;
  onBack?: () => void;
}

const TestEEGPage: React.FC<TestEEGPageProps> = ({ userId, onComplete, onBack }) => {
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
      let response: PredictionResponse;

      if (file.name.endsWith('.json')) {
        // Legacy JSON handling
        const text = await file.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error("Invalid JSON file.");
        }
        const eegData = Array.isArray(data) ? data : data.eeg;
        if (!Array.isArray(eegData)) {
          throw new Error("Invalid EEG data format. Expected array of arrays.");
        }
        response = await postPredictEEG({ eeg: eegData });
      } else {
        // New file upload handling for CSV/EDF
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('http://localhost:8000/predict_file', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || "File upload failed");
        }

        response = await res.json();
      }

      setResult(response);

      // Save result to database if userId is provided
      if (userId && response) {
        try {
          await fetch('http://localhost:8000/api/eeg/save_result', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userId,
              status_class: response.status_class,
              probability: response.probability,
              risk_level: response.risk_level,
              model_version: response.model_version,
              filename: file.name
            }),
          });
        } catch (saveError) {
          console.error('Failed to save EEG result:', saveError);
          // Don't fail the whole operation if save fails
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-3xl">
        {onBack && (
            <button
            onClick={onBack}
            className="mb-6 text-blue-600 hover:underline flex items-center"
            >
            &larr; Back to Home
            </button>
        )}

        <div className="bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Upload EEG Data</h2>

          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Select File (.csv, .edf, .json)
            </label>
            <input
              type="file"
              accept=".json,.csv,.edf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <p className="mt-2 text-sm text-gray-500">
                Supported formats: CSV (16 channels), EDF (Standard Medical Format), JSON
            </p>
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

              {/* Return to Dashboard button */}
              {onComplete && (
                <div className="mt-6 text-center">
                  <button
                    onClick={onComplete}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Return to Dashboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestEEGPage;
