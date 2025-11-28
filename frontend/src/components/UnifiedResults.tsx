import React, { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

interface CognitiveDomains {
  memory: number;
  attention: number;
  language: number;
  executive_function: number;
  processing_speed: number;
}

interface TestBreakdown {
  eeg_score: number;
  speech_score: number;
  games_score: number;
  eeg_weight: number;
  speech_weight: number;
  games_weight: number;
}

interface KeyFinding {
  severity: 'warning' | 'info' | 'success';
  message: string;
  source: string;
}

interface UnifiedResults {
  user_id: string;
  overall_risk_score: number;
  risk_level: string;
  confidence: number;
  test_breakdown: TestBreakdown;
  cognitive_domains: CognitiveDomains;
  key_findings: KeyFinding[];
  recommendations: string[];
  assessment_date: string;
  tests_included: string[];
}

interface UnifiedResultsProps {
  setActiveTab: (tab: 'dashboard' | 'upload' | 'live' | 'speech' | 'games' | 'results') => void;
}

const UnifiedResults: React.FC<UnifiedResultsProps> = ({ setActiveTab }) => {
  const [results, setResults] = useState<UnifiedResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user ID from session storage (same as AssessmentDashboard)
  const [userId] = useState(() => {
    return sessionStorage.getItem('cogni_safe_user_id') || 'unknown_user';
  });

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/unified/results/${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch results');
      }
      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading comprehensive results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-xl text-red-500">Error: {error}</div>
        <Button onClick={() => setActiveTab('dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-500">No results available</div>
      </div>
    );
  }

  // Prepare data for charts
  const domainData = [
    { domain: 'Memory', score: results.cognitive_domains.memory },
    { domain: 'Attention', score: results.cognitive_domains.attention },
    { domain: 'Language', score: results.cognitive_domains.language },
    { domain: 'Executive', score: results.cognitive_domains.executive_function },
    { domain: 'Speed', score: results.cognitive_domains.processing_speed },
  ];

  const testBreakdownData = [
    {
      name: 'EEG',
      score: results.test_breakdown.eeg_score,
      weight: results.test_breakdown.eeg_weight * 100,
      color: '#3B82F6'
    },
    {
      name: 'Speech',
      score: results.test_breakdown.speech_score,
      weight: results.test_breakdown.speech_weight * 100,
      color: '#A855F7'
    },
    {
      name: 'Games',
      score: results.test_breakdown.games_score,
      weight: results.test_breakdown.games_weight * 100,
      color: '#EC4899'
    },
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'High': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'Low': return 'bg-green-100 border-green-400';
      case 'Medium': return 'bg-yellow-100 border-yellow-400';
      case 'High': return 'bg-red-100 border-red-400';
      default: return 'bg-gray-100 border-gray-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '•';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Cognitive Health Report
          </h1>
          <p className="text-gray-600">
            Assessment Date: {new Date(results.assessment_date).toLocaleDateString()}
          </p>
        </div>

        {/* Overall Risk Score */}
        <Card className={`mb-8 border-4 ${getRiskBgColor(results.risk_level)}`}>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-8xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {results.overall_risk_score.toFixed(0)}
              </div>
              <div className="text-sm text-gray-500 mb-2">Overall Risk Score (0-100)</div>
              <div className={`text-4xl font-bold mb-4 ${getRiskColor(results.risk_level)}`}>
                {results.risk_level.toUpperCase()} RISK
              </div>
              <div className="text-lg text-gray-600">
                Confidence: {results.confidence.toFixed(0)}%
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Breakdown */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">📊 Breakdown by Test</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={testBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" name="Score" radius={[8, 8, 0, 0]}>
                  {testBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-4 mt-6">
              {testBreakdownData.map((test) => (
                <div key={test.name} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold" style={{ color: test.color }}>
                    {test.score.toFixed(0)}/100
                  </div>
                  <div className="text-sm text-gray-600">{test.name}</div>
                  <div className="text-xs text-gray-500">Weight: {test.weight}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cognitive Domains */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">🧠 Cognitive Domains</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={domainData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="domain" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                {domainData.map((domain) => (
                  <div key={domain.domain} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">{domain.domain}</span>
                      <span className="text-lg font-bold text-purple-600">
                        {domain.score.toFixed(0)}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          domain.score >= 60
                            ? 'bg-green-500'
                            : domain.score >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${domain.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Findings */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">🔍 Key Findings</h2>
            <div className="space-y-3">
              {results.key_findings.map((finding, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    finding.severity === 'warning'
                      ? 'bg-yellow-50 border-yellow-500'
                      : finding.severity === 'success'
                      ? 'bg-green-50 border-green-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getSeverityIcon(finding.severity)}</span>
                    <div className="flex-1">
                      <p className="text-gray-800">{finding.message}</p>
                      <p className="text-sm text-gray-500 mt-1">Source: {finding.source}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">💡 Recommendations</h2>
            <div className="space-y-3">
              {results.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-xl mt-1">{index + 1}.</span>
                  <p className="text-gray-800 flex-1">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => setActiveTab('dashboard')}
            variant="outline"
            className="px-8 py-6 text-lg"
          >
            Back to Dashboard
          </Button>
          <Button
            onClick={() => window.print()}
            className="px-8 py-6 text-lg bg-gradient-to-r from-blue-500 to-purple-500"
          >
            📄 Download PDF Report
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedResults;
