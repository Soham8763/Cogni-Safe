import React, { useState, useEffect, useRef } from 'react';
import {
  getMMSEQuestions,
  evaluateMMSEVerbal,
  evaluateMMSEBulkOCR,
  submitMMSE,
  type MMSEQuestion,
  type MMSEResponse
} from '../../services/api';

const MMSEAssessment: React.FC<{ userId: string; onComplete: () => void }> = ({ userId, onComplete }) => {
  const [questions, setQuestions] = useState<MMSEQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<'ai' | 'ocr' | 'manual' | null>(null);
  const [responses, setResponses] = useState<MMSEResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Speech recognition setup
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await getMMSEQuestions();
        setQuestions(data);
      } catch (error) {
        console.error("Failed to fetch MMSE questions", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();

    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleModeSelect = (selectedMode: 'ai' | 'ocr' | 'manual') => {
    setMode(selectedMode);
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const currentQuestion = questions[currentIndex];

  const handleNext = async (manualScore?: number, manualText?: string) => {
    let response: MMSEResponse;

    if (mode === 'manual') {
      response = {
        question_id: currentQuestion.id,
        score: manualScore || 0,
        response_text: manualText || (manualScore === 1 ? "Correct" : "Incorrect"),
        metadata: { method: "manual_assistant" }
      };
    } else if (mode === 'ai') {
      try {
        response = await evaluateMMSEVerbal(currentQuestion.id, transcript);
      } catch (err) {
        response = {
          question_id: currentQuestion.id,
          score: 0,
          response_text: transcript,
          metadata: { error: "AI evaluation failed" }
        };
      }
    } else {
      // OCR mode handles questions in bulk or individually
      response = {
        question_id: currentQuestion.id,
        score: manualScore || 0,
        response_text: manualText || "OCR extracted",
        metadata: { method: "ocr_photo" }
      };
    }

    const newResponses = [...responses, response];
    setResponses(newResponses);
    setTranscript('');

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit(newResponses);
    }
  };

  const handleOCRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setOcrLoading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const mimeType = file.type;

        try {
          const ocrResults = await evaluateMMSEBulkOCR(base64String, mimeType);

          setResponses(ocrResults);

          // Check if we have enough results to finalize
          if (ocrResults.length >= questions.length) {
            handleSubmit(ocrResults);
          } else {
            setCurrentIndex(ocrResults.length);
          }

        } catch (error) {
          alert("Bulk OCR Processing failed. Please try a clearer scan.");
        } finally {
          setOcrLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File reading error", error);
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (finalResponses: MMSEResponse[]) => {
    setLoading(true);
    const totalScore = finalResponses.reduce((acc, r) => acc + r.score, 0);

    let risk = "Normal";
    if (totalScore < 20) risk = "Severe";
    else if (totalScore < 35) risk = "Moderate";
    else if (totalScore < 45) risk = "Mild";

    try {
      await submitMMSE({
        user_id: userId,
        total_score: totalScore,
        risk_level: risk,
        mode: mode || 'manual',
        responses: finalResponses
      });
      setCompleted(true);
    } catch (error) {
      alert("Failed to submit assessment");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !completed) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Preparing Assessment Questions...</p>
      </div>
    );
  }

  if (completed) {
    const totalScore = responses.reduce((acc, r) => acc + r.score, 0);
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl p-10 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">MMSE Assessment Complete</h2>
        <p className="text-gray-500 mb-8">Clinical data has been synchronized with your unified profile.</p>

        <div className="bg-gray-50 rounded-2xl p-8 mb-8 border border-gray-100">
          <div className="text-6xl font-bold text-blue-600 mb-2">{totalScore}</div>
          <div className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Total MMSE Score</div>
        </div>

        <button
          onClick={onComplete}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-all transform hover:scale-[1.02]"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">MMSE Assessment Protocol</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the method of evaluation for the Mini-Mental State Examination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <button
            onClick={() => handleModeSelect('ai')}
            className="flex flex-col items-center p-8 bg-white border-2 border-white hover:border-blue-500 rounded-3xl shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">AI Verbal</h3>
            <p className="text-sm text-gray-500 text-center">
              Uses Whisper AI to transcribe and semantically score verbal responses.
            </p>
          </button>

          <button
            onClick={() => handleModeSelect('ocr')}
            className="flex flex-col items-center p-8 bg-white border-2 border-white hover:border-blue-500 rounded-3xl shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Written (OCR)</h3>
            <p className="text-sm text-gray-500 text-center">
              Upload PDF pages from the standardized test for bulk AI vision extraction.
            </p>
          </button>

          <button
            onClick={() => handleModeSelect('manual')}
            className="flex flex-col items-center p-8 bg-white border-2 border-white hover:border-blue-500 rounded-3xl shadow-sm hover:shadow-xl transition-all group"
          >
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Lab Assistant</h3>
            <p className="text-sm text-gray-500 text-center">
              A human assistant listens to answers and manually accepts/rejects.
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">{currentQuestion?.level}</span>
          <span className="text-sm font-bold text-gray-400">Question {currentIndex + 1} of {questions.length}</span>
        </div>
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-10 border-b border-gray-50">
          <h2 className="text-2xl font-bold text-gray-800 leading-snug">
            {currentQuestion?.text}
          </h2>
        </div>

        <div className="p-10 bg-gray-50">
          {mode === 'ai' && (
            <div className="space-y-8 text-center">
              <div className="relative inline-block">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:scale-105'
                  }`}
                >
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                    <path d="M7 10V5a3 3 0 016 0v5a3 3 0 01-6 0z" />
                    <path fillRule="evenodd" d="M5 8a1 1 0 011 1v2a4 4 0 008 0V9a1 1 0 112 0v2a6 6 0 01-5.917 5.917A1.5 1.5 0 0110 18a1.5 1.5 0 01-1.083-2.083A6 6 0 014 11V9a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <div className="min-h-[60px] p-4 bg-white rounded-xl border border-gray-200 italic text-gray-500">
                {transcript || "Listening for your response..."}
              </div>
              <button
                disabled={!transcript || isRecording}
                onClick={() => handleNext()}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold disabled:opacity-50 transition-all"
              >
                Analyze & Next
              </button>
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-8">
              <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-6 flex items-start gap-4">
                <div className="text-yellow-600">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-yellow-800">Assessor Mode</p>
                  <p className="text-xs text-yellow-700">Listen to the patient's answer. Cross-reference with requirements.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleNext(1)}
                  className="py-6 bg-green-50 text-green-700 border-2 border-green-200 rounded-2xl font-bold hover:bg-green-600 hover:text-white transition-all flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  Correct
                </button>
                <button
                  onClick={() => handleNext(0)}
                  className="py-6 bg-red-50 text-red-700 border-2 border-red-200 rounded-2xl font-bold hover:bg-red-600 hover:text-white transition-all flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Incorrect
                </button>
              </div>
            </div>
          )}

          {mode === 'ocr' && (
            <div className="text-center space-y-8 py-12">
              {ocrLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto"></div>
                  <p className="text-blue-600 font-bold">Scanning Paper Test with AI Vision...</p>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-48 h-48 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto border-4 border-dashed border-blue-200 mb-8">
                    <svg className="w-20 h-20 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Bulk Page Upload</h3>
                    <p className="text-gray-500 mb-8">Upload the completed MMSE PDF pages. Our AI will extract all 53 answers and populate the scorecard automatically.</p>
                    <input
                      type="file"
                      id="ocr-upload"
                      className="hidden"
                      onChange={handleOCRUpload}
                      accept="image/*,application/pdf"
                    />
                    <label
                      htmlFor="ocr-upload"
                      className="w-full py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-bold shadow-xl hover:scale-[1.02] transition-all cursor-pointer inline-block"
                    >
                      Choose MMSE PDF/Image
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-6">Supported: PDF, JPG, PNG (Max 10MB)</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MMSEAssessment;
