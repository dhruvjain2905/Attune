const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function fetchApi(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new ApiError(
        'Unable to connect to server. Please ensure the backend is running.',
        0,
        {}
      );
    }

    throw new ApiError(error.message, 0, {});
  }
}

export const api = {
  // Health check
  async health() {
    return fetchApi('/health');
  },

  // User stats
  async getUserStats() {
    return fetchApi('/api/user/stats');
  },

  // Sessions
  async createSession(goal) {
    return fetchApi('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ goal }),
    });
  },

  async getSession(sessionId) {
    return fetchApi(`/api/sessions/${sessionId}`);
  },

  async getAllSessions(limit = 50) {
    return fetchApi(`/api/sessions?limit=${limit}`);
  },

  async endSession(sessionId, data) {
    return fetchApi(`/api/sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async checkSessionActive(sessionId) {
    return fetchApi(`/api/sessions/${sessionId}/active`);
  },

  async startMonitoring(sessionId) {
    return fetchApi(`/api/sessions/${sessionId}/start-monitoring`, {
      method: 'POST',
    });
  },

  async stopMonitoring(sessionId) {
    return fetchApi(`/api/sessions/${sessionId}/stop-monitoring`, {
      method: 'POST',
    });
  },

  async getCurrentActiveSession() {
    return fetchApi('/api/sessions/active/current');
  },

  // Intervals
  async addInterval(sessionId, timeStarted, timeEnded, focused) {
    return fetchApi('/api/intervals', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        time_started: timeStarted,
        time_ended: timeEnded,
        focused,
      }),
    });
  },

  async getSessionIntervals(sessionId) {
    return fetchApi(`/api/sessions/${sessionId}/intervals`);
  },

  // Nudges
  async addNudge(sessionId, reason) {
    return fetchApi('/api/nudges', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        reason,
      }),
    });
  },

  async getSessionNudges(sessionId) {
    return fetchApi(`/api/sessions/${sessionId}/nudges`);
  },

  async getSessionAnalyses(sessionId) {
    return fetchApi(`/api/sessions/${sessionId}/analyses`);
  },

  async getLiveSessionStats(sessionId) {
    return fetchApi(`/api/sessions/${sessionId}/live-stats`);
  },
};

export { ApiError };
