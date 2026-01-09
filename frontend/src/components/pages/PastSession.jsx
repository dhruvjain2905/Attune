import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import SessionTimeline from '../SessionTimeline';
import { api } from '../../services/api';

export default function PastSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnding, setIsEnding] = useState(false);
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  // Separate effect for polling active sessions
  useEffect(() => {
    if (!session || session.status !== 'active') return;

    const interval = setInterval(() => {
      loadLiveStats();
    }, 5000);

    // Load live stats immediately
    loadLiveStats();

    return () => clearInterval(interval);
  }, [session?.status, sessionId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const sessionData = await api.getSession(sessionId);
      const [intervals, nudges, analyses] = await Promise.all([
        api.getSessionIntervals(sessionId),
        api.getSessionNudges(sessionId),
        api.getSessionAnalyses(sessionId)
      ]);

      const newSession = {
        ...sessionData,
        intervals: intervals.intervals || [],
        nudges: nudges.nudges || [],
        analyses: analyses.analyses || []
      };

      setSession(newSession);
    } catch (err) {
      console.error('Error loading session:', err);
      setError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const loadLiveStats = async () => {
    try {
      const stats = await api.getLiveSessionStats(sessionId);
      setLiveStats(stats);
    } catch (err) {
      console.error('Error loading live stats:', err);
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this session? AI will analyze your focus data.')) {
      return;
    }

    try {
      setIsEnding(true);
      setError(null);

      const result = await api.stopMonitoring(sessionId);

      setSession(result.session);

      alert('Session ended and analyzed! Refreshing data...');
      await loadSession();
    } catch (err) {
      console.error('Error ending session:', err);
      setError(err.message || 'Failed to end session');
    } finally {
      setIsEnding(false);
    }
  };

  if (loading && !session) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <h3 className="text-lg font-bold text-red-900">Error Loading Session</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadSession}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isActive = session.status === 'active';

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Use live stats for active sessions, otherwise use session data
  const productiveTime = isActive && liveStats ? liveStats.productive_time : session.productive_time;
  const notProductiveTime = isActive && liveStats ? liveStats.not_productive_time : session.not_productive_time;
  const focusPercentage = isActive && liveStats ? liveStats.focus_percentage : session.focus_percentage;
  const nudgesCount = isActive && liveStats ? liveStats.nudges_received : (session.nudges_received || session.nudges?.length || 0);

  const totalTime = productiveTime + notProductiveTime;

  const stats = isActive ? [
    {
      icon: 'timer',
      label: 'Session Status',
      value: 'Active',
      subtitle: liveStats ? `${liveStats.analyses_count} checks completed` : 'Monitoring in progress'
    },
    {
      icon: 'hourglass_top',
      label: 'Productive Time',
      value: formatDuration(productiveTime || 0),
      subtitle: `Out of ${formatDuration(totalTime || 0)} total`
    },
    {
      icon: 'notifications_active',
      label: 'Nudges Received',
      value: nudgesCount,
      subtitle: 'Real-time tracking'
    },
    {
      icon: 'analytics',
      label: 'Focus Score',
      value: totalTime > 0 ? `${Math.round(focusPercentage || 0)}%` : 'N/A',
      subtitle: 'Updating...'
    }
  ] : [
    {
      icon: 'data_usage',
      label: 'Productivity Score',
      value: `${Math.round(session.focus_percentage || 0)}%`,
      progress: session.focus_percentage || 0
    },
    {
      icon: 'hourglass_top',
      label: 'Productive Time',
      value: formatDuration(session.productive_time || 0),
      subtitle: `Out of ${formatDuration(totalTime || 0)} total`
    },
    {
      icon: 'notifications_active',
      label: 'Nudges Received',
      value: session.nudges_received || session.nudges?.length || 0,
      subtitle: session.nudges?.length > 0 ? 'Helped you stay focused' : 'No nudges needed'
    },
    {
      icon: 'bolt',
      label: 'Total Duration',
      value: formatDuration(totalTime || 0),
      subtitle: `${formatTime(session.time_started)} - ${formatTime(session.time_ended)}`
    }
  ];

  const distractions = session.ai_structured_output ?
    Object.entries(session.ai_structured_output).map(([name, seconds]) => ({
      name,
      time: formatDuration(seconds),
      percentage: totalTime > 0 ? (seconds / totalTime * 100) : 0,
      icon: '⚠️'
    })) : [];

  return (
    <div className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-8">
      <div className="flex flex-col max-w-[1024px] flex-1 gap-8">
        {/* Breadcrumbs */}
        <div className="flex flex-wrap gap-2 px-4">
          <Link className="text-[#617589] text-base font-medium leading-normal hover:text-primary" to="/">
            Dashboard
          </Link>
          <span className="text-[#617589] text-sm font-medium leading-normal">/</span>
          <span className="text-[#111418] text-sm font-medium leading-normal">
            {isActive ? 'Active Session' : (session.title || 'Session Details')}
          </span>
        </div>

        {/* Page Heading */}
        <div className="flex flex-col md:flex-row justify-between gap-6 px-4 items-start md:items-end">
          <div className="flex min-w-72 flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-[#111418] text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                {isActive ? 'Session in Progress' : (session.title || 'Untitled Session')}
              </h1>
              {isActive && (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </div>
            <p className="text-[#617589] text-lg mt-2">
              <span className="font-medium">Goal:</span> {session.goal}
            </p>
            <div className="flex items-center gap-3 text-[#617589] text-base font-normal mt-1">
              <span className="material-symbols-outlined text-lg">calendar_today</span>
              <span>{formatDate(session.time_started)}</span>
              <span className="w-1 h-1 bg-current rounded-full"></span>
              <span className="material-symbols-outlined text-lg">schedule</span>
              <span>{formatTime(session.time_started)}{session.time_ended ? ` - ${formatTime(session.time_ended)}` : ' - Now'}</span>
              <span className="w-1 h-1 bg-current rounded-full"></span>
              <span className="material-symbols-outlined text-lg">timer</span>
              <span>{formatDuration(totalTime)} Duration</span>
            </div>
          </div>
          <div className="flex gap-3">
            {isActive && (
              <button
                onClick={handleEndSession}
                disabled={isEnding}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
              >
                {isEnding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Ending Session...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">stop_circle</span>
                    <span>End Session</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>



        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-xl p-6 bg-white border border-accent/20 shadow-sm relative overflow-hidden group hover:border-primary/40 transition-all">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl text-primary">{stat.icon}</span>
              </div>
              <p className="text-[#617589] text-sm font-medium uppercase tracking-wider">{stat.label}</p>
              <div className="flex items-end gap-2 mt-2">
                <p className="text-[#111418] text-4xl font-bold leading-none">{stat.value}</p>
                {stat.badge && (
                  <span className="text-[#078838] bg-[#078838]/10 px-1.5 py-0.5 rounded text-xs font-bold mb-1">
                    {stat.badge}
                  </span>
                )}
              </div>
              {stat.progress && (
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${stat.progress}%` }}></div>
                </div>
              )}
              {stat.subtitle && (
                <p className="text-[#617589] text-xs mt-4 font-medium">{stat.subtitle}</p>
              )}
            </div>
          ))}
        </div>

        {/* Timeline Section */}
        <SessionTimeline
          analyses={session.analyses || []}
          nudges={session.nudges || []}
          timeStarted={session.time_started}
          timeEnded={session.time_ended}
          isActive={isActive}
        />

        {/* Distraction & AI Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 pb-8">
          {/* Distraction Breakdown */}
          <div className="bg-white border border-accent/20 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[#111418] text-lg font-bold">Distraction Breakdown</h3>
            </div>
            <div className="flex flex-col gap-4">
              {distractions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                  <p>
                    {isActive
                      ? 'No distractions detected yet. Keep going!'
                      : 'Great focus! No major distractions detected.'}
                  </p>
                </div>
              ) : (
                distractions.map((distraction, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="size-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-lg">
                      {distraction.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-bold text-[#111418]">{distraction.name}</span>
                        <span className="text-sm font-medium text-gray-500">{distraction.time}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-400 to-orange-300 rounded-full" style={{ width: `${Math.min(distraction.percentage, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-white border border-accent/20 rounded-xl p-6 shadow-sm flex flex-col">
            <h3 className="text-[#111418] text-lg font-bold mb-4">AI Analysis</h3>
            <div>
              {isActive ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-[#111418]">
                  <p className="text-gray-600">AI analysis will be generated when you end the session. Keep focusing on your goal!</p>
                </div>
              ) : session.ai_analysis ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-[#111418]">
                  {session.ai_analysis}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-600">
                  No AI analysis available for this session.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
