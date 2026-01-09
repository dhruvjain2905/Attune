import { useState, useEffect } from 'react';
import StatCard from '../ui/StatCard';
import SessionCard from '../ui/SessionCard';
import ProductivityChart from '../ui/ProductivityChart';
import Button from '../ui/Button';
import { api } from '../../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [userStats, sessionsData, activeSessionData] = await Promise.all([
        api.getUserStats(),
        api.getAllSessions(10),
        api.getCurrentActiveSession()
      ]);

      // Check for active session
      if (activeSessionData.has_active) {
        setActiveSession(activeSessionData.session);
      } else {
        setActiveSession(null);
      }

      const mappedStats = [
        {
          icon: 'analytics',
          iconColor: 'blue',
          title: 'Average Focus Score',
          value: `${Math.round(userStats.average_focus_score)}%`,
          badgeColor: 'green'
        },
        {
          icon: 'timer',
          iconColor: 'purple',
          title: 'Total Focus Time',
          value: formatDuration(userStats.total_focus_time),
          badgeColor: 'green'
        },
        {
          icon: 'check_circle',
          iconColor: 'orange',
          title: 'Sessions Completed',
          value: String(userStats.sessions_completed),
          badgeColor: 'gray'
        }
      ];

      const mappedSessions = sessionsData.sessions
        .filter(s => s.status === 'completed')
        .map(session => ({
          id: session.id,
          icon: getIconForSession(session.title),
          iconColor: getIconColor(session.focus_percentage),
          title: session.title || 'Untitled Session',
          time: formatSessionTime(session.time_started),
          duration: formatDuration(session.productive_time + session.not_productive_time),
          focusScore: Math.round(session.focus_percentage)
        }));

      setStats(mappedStats);
      setRecentSessions(mappedSessions);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatSessionTime = (timeStarted) => {
    const date = new Date(timeStarted);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${timeStr}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    } else {
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
    }
  };

  const getIconForSession = (title) => {
    if (!title) return 'work';
    const lower = title.toLowerCase();
    if (lower.includes('cod') || lower.includes('dev')) return 'code';
    if (lower.includes('writ') || lower.includes('edit')) return 'edit_note';
    if (lower.includes('email') || lower.includes('mail')) return 'mail';
    if (lower.includes('research') || lower.includes('read')) return 'book';
    if (lower.includes('design')) return 'palette';
    if (lower.includes('meet')) return 'groups';
    return 'work';
  };

  const getIconColor = (focusPercentage) => {
    if (focusPercentage >= 80) return 'green';
    if (focusPercentage >= 60) return 'blue';
    if (focusPercentage >= 40) return 'orange';
    return 'red';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <h3 className="text-lg font-bold text-red-900">Error Loading Dashboard</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1200px] w-full flex flex-col gap-8">
        {/* Page Heading & CTA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-[#637588] text-sm font-medium uppercase tracking-wider">Dashboard</p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight font-display text-[#111418]">
              Nice to See You!
            </h1>
            <p className="text-[#637588] text-lg font-normal max-w-2xl mt-1">
              Your focus is looking sharp today. 
            </p>
          </div>
          {activeSession ? (
            <Button to={`/session/${activeSession.id}`} icon="visibility">
              View Active Session
            </Button>
          ) : (
            <Button to="/new-session" icon="play_circle">
              Start Focus Session
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats && stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Main Content Area: Chart + List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <ProductivityChart sessions={recentSessions.map(s => ({
            name: s.title,
            productivity: s.focusScore
          }))} />

          {/* Recent Sessions List */}
          <div className="flex flex-col gap-6">

            {/* Sessions List */}
            <div className="bg-white border border-gray-200 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-sm">
              <div className="p-5 border-b border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-[#111418] font-display">Recent Sessions</h3>
                  {recentSessions.length > 6 && (
                    <button
                      onClick={() => setShowAllSessions(!showAllSessions)}
                      className="text-xs font-bold text-primary hover:underline uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-1"
                    >
                      {showAllSessions ? 'Show Less' : 'View All'}
                    </button>
                  )}
                </div>
                {/* Search Input */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                  <input
                    type="text"
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {recentSessions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <span className="material-symbols-outlined text-4xl mb-2">history</span>
                    <p>No sessions yet. Start your first focus session!</p>
                  </div>
                ) : (
                  (() => {
                    const filteredSessions = recentSessions.filter(session =>
                      session.title.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    const displayedSessions = showAllSessions
                      ? filteredSessions
                      : filteredSessions.slice(0, 6);

                    if (filteredSessions.length === 0) {
                      return (
                        <div className="p-8 text-center text-gray-500">
                          <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                          <p>No sessions match "{searchQuery}"</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        {displayedSessions.map((session) => (
                          <SessionCard key={session.id} session={session} />
                        ))}
                        {!showAllSessions && filteredSessions.length > 6 && (
                          <div className="p-3 text-center border-t border-gray-100">
                            <button
                              onClick={() => setShowAllSessions(true)}
                              className="text-sm text-gray-500 hover:text-primary"
                            >
                              +{filteredSessions.length - 6} more sessions
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
