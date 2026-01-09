import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

export default function NewSession() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [checkingActive, setCheckingActive] = useState(true);

  useEffect(() => {
    checkForActiveSession();
  }, []);

  const checkForActiveSession = async () => {
    try {
      setCheckingActive(true);
      const result = await api.getCurrentActiveSession();
      setHasActiveSession(result.has_active);

      if (result.has_active) {
        navigate(`/session/${result.session.id}`);
      }
    } catch (err) {
      console.error('Error checking active session:', err);
    } finally {
      setCheckingActive(false);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();

    if (!goal.trim()) {
      setError('Please enter a goal for your session');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const session = await api.createSession(goal.trim());

      await api.startMonitoring(session.session_id);

      navigate(`/session/${session.session_id}`);
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err.message || 'Failed to create session. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingActive) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-600">Checking for active sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto bg-[#f6f7f8]">
      <div className="w-full max-w-[800px] flex flex-col gap-10 animate-fade-in-up">
        {/* Page Heading */}
        <div className="flex flex-col gap-2">
          <h1 className="text-[#111418] text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Set your intention. 
          </h1>
          <p className="text-[#617589] text-lg font-normal leading-normal font-body">
            What will you conquer today? (The more specific the better)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <div className="flex-1">
              <p className="text-red-900 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleStartSession} className="flex flex-col gap-8">
          {/* Goal Input Section */}
          <div className="group relative w-full">
            <label className="sr-only" htmlFor="session-goal">Session Goal</label>
            <textarea
              className="w-full min-h-[200px] resize-none rounded-xl border-2 border-gray-200 bg-white p-6 md:p-8 text-2xl md:text-3xl font-medium text-[#111418] placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 font-display leading-normal"
              id="session-goal"
              placeholder="I want to design the new landing page..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              required
            />

          </div>

          {/* Main Action Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="group w-full bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-xl py-5 px-8 rounded-xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] flex items-center justify-center gap-3 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Starting Session...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10 flex items-center gap-2">
                    Start Focus Session
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </span>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-60 bg-white/20 px-2 py-1 rounded text-xs font-mono font-normal hidden sm:block">
                    ⌘ + Enter
                  </div>
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4 font-body">
              Your session will be logged automatically and monitoring will begin.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
