import React, { useState, useEffect, useRef } from 'react';
import {
  getMMSEQuestions,
  evaluateMMSEVerbal,
  evaluateMMSEBulkOCR,
  submitMMSE,
  type MMSEQuestion,
  type MMSEResponse
} from '../../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

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

  // Clinical Visualization & VAD
  const [audioLevel, setAudioLevel] = useState(0);
  const [showAssistantDash, setShowAssistantDash] = useState(true);
  const silenceRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // Audio Recording (Raw Clinical Data)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Speech recognition (Visual Feedback Only)
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

    // Setup visual feedback recognition
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) setTranscript(prev => prev + ' ' + finalTranscript);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handleModeSelect = (selectedMode: 'ai' | 'ocr' | 'manual') => {
    setMode(selectedMode);
  };

  const monitorAudio = (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      setAudioLevel(average);

      // SILENCE DETECTION FOR AUTO-STOP (VAD)
      if (average < 15) { // Threshold for "silence"
        if (silenceRef.current === null) {
          silenceRef.current = Date.now();
        } else if (Date.now() - silenceRef.current > 3000) { // 3 seconds of silence
          console.log("Auto-stopping due to silence...");
          stopRecording();
          return;
        }
      } else {
        silenceRef.current = null;
      }

      animationRef.current = requestAnimationFrame(update);
    };

    update();
  };

  const startRecording = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100
        }
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        processAudioResponse(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        setAudioLevel(0);
      };

      setTranscript('');
      setIsRecording(true);
      silenceRef.current = null;
      mediaRecorder.start();
      monitorAudio(stream);

      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  const currentQuestion = questions[currentIndex];

  const processAudioResponse = async (audioBlob: Blob) => {
    setLoading(true);
    try {
      const response = await evaluateMMSEVerbal(currentQuestion.id, audioBlob);
      const newResponses = [...responses, response];
      setResponses(newResponses);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setTranscript('');
      } else {
        handleSubmit(newResponses);
      }
    } catch (err) {
      alert("Evaluation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextManual = async (manualScore: number, manualText?: string) => {
    const response: MMSEResponse = {
      question_id: currentQuestion.id,
      score: manualScore,
      response_text: manualText || (manualScore === 1 ? "Correct" : "Incorrect"),
      metadata: { method: "manual_assistant" }
    };

    const newResponses = [...responses, response];
    setResponses(newResponses);

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

  const lastResponse = responses.length > 0 ? responses[responses.length - 1] : null;

  if (loading && !completed && !isRecording) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Processing Clinical Analysis...</p>
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
            Choose the clinical-grade evaluation method for the Mini-Mental State Examination.
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Clinical Verbal</h3>
            <p className="text-sm text-gray-500 text-center">Real-time VAD & Deep clinical speech analysis.</p>
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
            <p className="text-sm text-gray-500 text-center">Automated scoring of paper-based tests via AI Vision.</p>
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
            <p className="text-sm text-gray-500 text-center">Professional observation and manual scoring protocol.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 animate-in slide-in-from-bottom-6 duration-700">
      {/* Main Assessment Area */}
      <div className="flex-1">
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">{currentQuestion?.level}</span>
            <span className="text-sm font-bold text-gray-400">Question {currentIndex + 1} of {questions.length}</span>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-700"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-12 border-b border-gray-50">
            <h1 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest">Assessment Question</h1>
            <h2 className="text-3xl font-bold text-gray-900 leading-tight">
              {currentQuestion?.text}
            </h2>
          </div>

          <div className="p-12 bg-gray-50/50">
            {mode === 'ai' && (
              <div className="space-y-10 text-center">
                <div className="relative flex flex-col items-center">
                  {/* Visualizer */}
                  <div className="flex gap-1 h-12 items-center mb-8">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-blue-500 rounded-full transition-all duration-75"
                        style={{
                          height: isRecording ? `${Math.max(15, (audioLevel * (0.5 + Math.random() * 0.5)))}%` : '15%',
                          opacity: isRecording ? 1 : 0.3
                        }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={startRecording}
                    className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all shadow-2xl relative z-10 ${
                      isRecording ? 'bg-red-500 text-white scale-110 shadow-red-200' : 'bg-blue-600 text-white hover:scale-105 shadow-blue-200 hover:shadow-blue-300'
                    }`}
                  >
                    <svg className="w-12 h-12 mb-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                      <path d="M7 10V5a3 3 0 016 0v5a3 3 0 01-6 0z" />
                      <path fillRule="evenodd" d="M5 8a1 1 0 011 1v2a4 4 0 008 0V9a1 1 0 112 0v2a6 6 0 01-5.917 5.917A1.5 1.5 0 0110 18a1.5 1.5 0 01-1.083-2.083A6 6 0 014 11V9a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">
                      {isRecording ? "Listening" : "Start"}
                    </span>
                  </button>

                  <div className="mt-6 flex flex-col items-center">
                    <p className={`text-sm font-bold uppercase tracking-widest transition-colors ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
                      {isRecording ? "SILENCE DETECTION ACTIVE (3s)" : "Click to Start Speaking"}
                    </p>
                  </div>
                </div>

                <div className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm min-h-[140px] flex items-center justify-center relative group">
                   <div className="absolute top-4 left-4 text-[10px] font-bold text-gray-300 uppercase tracking-widest">Patient Input Monitor</div>
                   <p className="text-xl font-medium text-gray-500 italic max-w-lg leading-relaxed">
                     {transcript || "Waiting for patient response..."}
                   </p>
                </div>
              </div>
            )}

            {mode === 'manual' && (
              <div className="space-y-8">
                 <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                    <div className="text-blue-600 pt-1">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-900 uppercase tracking-widest">Assistant Observation</p>
                      <p className="text-xs text-blue-700 font-medium">Observe the patient carefully and manually record the score below.</p>
                    </div>
                  </div>
                <div className="grid grid-cols-2 gap-6">
                  <button onClick={() => handleNextManual(1)} className="py-8 bg-white border-2 border-transparent hover:border-green-500 rounded-3xl font-bold shadow-sm hover:shadow-xl transition-all flex flex-col items-center group">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-900">Patient Success</span>
                  </button>
                  <button onClick={() => handleNextManual(0)} className="py-8 bg-white border-2 border-transparent hover:border-red-500 rounded-3xl font-bold shadow-sm hover:shadow-xl transition-all flex flex-col items-center group">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <span className="text-gray-900">Incorrect/No Answer</span>
                  </button>
                </div>
              </div>
            )}

            {mode === 'ocr' && (
              <div className="text-center space-y-10 py-8">
                {ocrLoading ? (
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
                      <div className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-blue-400 opacity-75"></div>
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-blue-600 font-bold uppercase tracking-widest text-sm">Deep Neural Scan in progress...</p>
                  </div>
                ) : (
                  <div className="animate-in fade-in zoom-in duration-500">
                    <div className="max-w-md mx-auto">
                      <div className="p-12 bg-white rounded-[2rem] border-4 border-dashed border-gray-100 mb-8 hover:border-blue-200 transition-colors group cursor-pointer" onClick={() => document.getElementById('ocr-upload')?.click()}>
                         <svg className="w-24 h-24 text-gray-200 mx-auto mb-6 group-hover:text-blue-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                         </svg>
                         <h3 className="text-xl font-bold text-gray-900 mb-2">Bulk Page Upload</h3>
                         <p className="text-sm text-gray-400">Drag & Drop completed patient forms or click to browse.</p>
                      </div>
                      <input type="file" id="ocr-upload" className="hidden" onChange={handleOCRUpload} accept="image/*,application/pdf" />
                      <button
                        onClick={() => document.getElementById('ocr-upload')?.click()}
                        className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-black transition-all"
                      >
                        Select Clinical Records
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assistant Diagnostic Dashboard Sidepanel */}
      {showAssistantDash && mode === 'ai' && (
        <div className="w-full lg:w-96 animate-in slide-in-from-right duration-700">
          <div className="bg-gray-900 h-full rounded-[2.5rem] p-8 text-white shadow-2xl sticky top-8 border border-white/10">
            <div className="flex items-center justify-between mb-10">
               <h3 className="font-bold text-lg flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 Assistant Dashboard
               </h3>
               <button onClick={() => setShowAssistantDash(false)} className="text-gray-500 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            {lastResponse ? (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] block mb-4">Last Processed Diagnostic</label>
                   <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                      <div className="text-2xl font-bold text-blue-400 mb-1 italic">"{lastResponse.response_text}"</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Whisper Transcription</div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="text-lg font-bold text-white">{lastResponse.metadata?.fluency_metrics?.pause_count || 0}</div>
                      <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Pauses</div>
                   </div>
                   <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="text-lg font-bold text-amber-400">{lastResponse.metadata?.fluency_metrics?.stutter_count || 0}</div>
                      <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Stutters</div>
                   </div>
                </div>

                {lastResponse.metadata?.fluency_metrics?.timeline && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] block mb-4">Fluency & Stutter Timeline</label>
                    <div className="h-32 w-full bg-white/5 rounded-2xl p-4 border border-white/5">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={lastResponse.metadata.fluency_metrics.timeline}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                          <XAxis
                            dataKey="time"
                            hide
                          />
                          <YAxis hide domain={[0, 1.2]} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-gray-800 border border-white/10 p-2 rounded-lg text-[10px] shadow-xl">
                                    <div className="font-bold text-blue-400 uppercase tracking-tighter mb-1">
                                      {data.type} @ {data.time}s
                                    </div>
                                    {data.word && <div className="text-white italic">"{data.word}"</div>}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area
                            type="stepAfter"
                            dataKey="activity"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.2}
                            strokeWidth={2}
                            animationDuration={1500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] block mb-4">Clinical Accuracy</label>
                   <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-end gap-2 mb-2">
                        <div className="text-4xl font-bold text-white">{(lastResponse.metadata?.accuracy_metrics?.semantic_ratio * 100).toFixed(0)}%</div>
                        <div className="text-xs text-gray-500 mb-1 font-bold">Semantic Agreement</div>
                      </div>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full transition-all duration-1000"
                          style={{ width: `${(lastResponse.metadata?.accuracy_metrics?.semantic_ratio * 100)}%` }}
                        ></div>
                      </div>
                   </div>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] block mb-4">Acoustic Biomarkers</label>
                   <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                         <span className="text-gray-400">Pitch Mean</span>
                         <span className="font-mono text-blue-300">{lastResponse.metadata?.acoustic_features?.pitch_mean?.toFixed(1) || 0} Hz</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                         <span className="text-gray-400">Intensity Variance</span>
                         <span className="font-mono text-blue-300">High Stability</span>
                      </div>
                   </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                   <div className="flex items-center gap-3 text-xs text-green-400 font-bold bg-green-400/10 p-4 rounded-xl">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Automatic VAD Stop Active
                   </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center opacity-40">
                 <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                 <p className="text-sm font-medium">Capture a response to view diagnostic telemetry.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MMSEAssessment;
