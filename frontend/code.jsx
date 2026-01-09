import React, { useState, useEffect } from 'react';
import { Sun, Target, CheckCircle, AlertCircle, Clock, TrendingUp, Award } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function FocusTracker() {
  const [view, setView] = useState('start'); // 'start', 'active', 'report'
  const [goal, setGoal] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionId && view === 'active') {
      const interval = setInterval(() => {
        fetchSessionData();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [sessionId, view]);

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}`);
      const data = await response.json();
      setSessionData(data);
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  };

  const startSession = async () => {
    if (!goal.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim() })
      });
      const data = await response.json();
      setSessionId(data.session_id);
      setView('active');
      
      // Show session ID for screenshot agent
      alert(`Session started! Session ID: ${data.session_id}\n\nNow run the screenshot agent with this ID.`);
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session. Make sure the backend is running!');
    }
    setLoading(false);
  };

  const endSession = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/end`, {
        method: 'POST'
      });
      const data = await response.json();
      setSessionData(data);
      setView('report');
    } catch (error) {
      console.error('Error ending session:', error);
    }
    setLoading(false);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  // Start View
  if (view === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-4 shadow-lg">
              <Sun className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-amber-900 mb-2">Attune</h1>
            <p className="text-lg text-amber-700">Stay on track, achieve your goals</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-amber-100">
            <div className="mb-6">
              <label className="flex items-center text-lg font-semibold text-amber-900 mb-3">
                <Target className="w-5 h-5 mr-2 text-orange-500" />
                What are you working on?
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g., Write my research paper for economics class"
                className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none text-gray-800 placeholder-gray-400 resize-none"
                rows={3}
              />
            </div>

            <button
              onClick={startSession}
              disabled={!goal.trim() || loading}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-4 rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {loading ? 'Starting...' : 'Start Focus Session 🎯'}
            </button>

            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>How it works:</strong> We'll monitor your screen every 30 seconds and help you stay focused. After 3 distractions, you'll get a friendly nudge!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active Session View
  if (view === 'active' && sessionData) {
    const totalChecks = sessionData.focused_count + sessionData.distracted_count;
    const focusPercentage = totalChecks > 0 
      ? Math.round((sessionData.focused_count / totalChecks) * 100)
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-2 border-green-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
                  <span className="text-sm font-semibold text-green-700">Session Active</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  {sessionData.goal}
                </h2>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>{formatDuration(sessionData.duration_seconds)}</span>
                </div>
              </div>
              <button
                onClick={endSession}
                disabled={loading}
                className="bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-colors font-semibold shadow-lg"
              >
                End Session
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 font-medium">Focus Score</span>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-4xl font-bold text-green-600">{focusPercentage}%</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 font-medium">Focused</span>
                <CheckCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-4xl font-bold text-blue-600">{sessionData.focused_count}</div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 font-medium">Nudges</span>
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-4xl font-bold text-orange-600">{sessionData.nudges_sent}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-100">
            <h3 className="font-semibold text-gray-800 mb-4">Focus Distribution</h3>
            <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                style={{ width: `${focusPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-green-600 font-medium">
                ✓ {sessionData.focused_count} focused
              </span>
              <span className="text-orange-600 font-medium">
                ⚠ {sessionData.distracted_count} distracted
              </span>
            </div>
          </div>

          <div className="mt-6 text-center text-gray-600 text-sm">
            Session ID: {sessionData.session_id}
          </div>
        </div>
      </div>
    );
  }

  // Report View
  if (view === 'report' && sessionData) {
    const totalChecks = sessionData.focused_count + sessionData.distracted_count;
    const getMessage = () => {
      if (sessionData.focus_percentage >= 80) return { text: "Outstanding focus! 🌟", color: "text-green-600" };
      if (sessionData.focus_percentage >= 60) return { text: "Good session! 💪", color: "text-blue-600" };
      if (sessionData.focus_percentage >= 40) return { text: "Room for improvement 📈", color: "text-orange-600" };
      return { text: "Let's work on staying focused 🎯", color: "text-red-600" };
    };
    const message = getMessage();

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-purple-100">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mb-4 shadow-lg">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Session Complete!</h2>
              <p className={`text-xl font-semibold ${message.color}`}>{message.text}</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                <span className="text-gray-700 font-medium">Goal</span>
                <span className="text-gray-900 font-semibold">{sessionData.goal}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
                <span className="text-gray-700 font-medium">Duration</span>
                <span className="text-gray-900 font-semibold">{formatDuration(sessionData.duration_seconds)}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <span className="text-gray-700 font-medium">Focus Score</span>
                <span className="text-green-600 text-2xl font-bold">{sessionData.focus_percentage}%</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600">{sessionData.focused_count}</div>
                  <div className="text-sm text-gray-600 mt-1">Focused</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-orange-600">{sessionData.distracted_count}</div>
                  <div className="text-sm text-gray-600 mt-1">Distracted</div>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-red-600">{sessionData.nudges_sent}</div>
                  <div className="text-sm text-gray-600 mt-1">Nudges</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setView('start');
                setGoal('');
                setSessionId(null);
                setSessionData(null);
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl"
            >
              Start New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>
  );
}