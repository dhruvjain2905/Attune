"""
FastAPI backend for Focus Tracker
Handles session management, analysis requests, and data persistence
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime
import subprocess
import signal
import os

from database import Database
from monitor import FocusMonitor
from analysis import SessionAnalyzer

app = FastAPI(title="Focus Tracker API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database()

# Store active monitoring sessions
active_monitors = {}

# ============= REQUEST/RESPONSE MODELS =============

class SessionCreate(BaseModel):
    goal: str

class SessionEndRequest(BaseModel):
    title: str
    focus_percentage: float
    productive_time: int
    not_productive_time: int
    nudges_received: int
    ai_analysis: str
    ai_structured_output: dict

class IntervalCreate(BaseModel):
    session_id: str
    time_started: str
    time_ended: str
    focused: bool

class NudgeCreate(BaseModel):
    session_id: str
    reason: str

# ============= HEALTH CHECK =============

@app.get("/")
def root():
    return {"status": "ok", "message": "Focus Tracker API"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# ============= USER ENDPOINTS =============

@app.get("/api/user/stats")
def get_user_stats():
    """Get user statistics"""
    try:
        stats = db.get_user_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= SESSION ENDPOINTS =============

@app.post("/api/sessions")
def create_session(session_data: SessionCreate):
    """Create a new session"""
    try:
        session_id = str(uuid.uuid4())
        session = db.create_session(session_id, session_data.goal)
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}")
def get_session(session_id: str):
    """Get session details"""
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.get("/api/sessions")
def get_all_sessions(limit: int = 50):
    """Get all sessions for the user"""
    try:
        sessions = db.get_all_sessions(limit=limit)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions/{session_id}/end")
def end_session(session_id: str, data: SessionEndRequest):
    """End a session and save final analysis"""
    try:
        if not db.check_session_active(session_id):
            raise HTTPException(status_code=400, detail="Session is not active")

        db.end_session(
            session_id=session_id,
            title=data.title,
            focus_percentage=data.focus_percentage,
            productive_time=data.productive_time,
            not_productive_time=data.not_productive_time,
            nudges_received=data.nudges_received,
            ai_analysis=data.ai_analysis,
            ai_structured_output=data.ai_structured_output
        )

        return {"status": "success", "message": "Session ended successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}/active")
def check_session_active(session_id: str):
    """Check if a session is active"""
    active = db.check_session_active(session_id)
    is_monitoring = session_id in active_monitors
    return {
        "active": active,
        "monitoring": is_monitoring
    }

@app.post("/api/sessions/{session_id}/start-monitoring")
async def start_monitoring(session_id: str, background_tasks: BackgroundTasks):
    """Start monitoring a session"""
    try:
        # Check if session exists and is active
        if not db.check_session_active(session_id):
            raise HTTPException(status_code=400, detail="Session is not active")

        # Check if already monitoring
        if session_id in active_monitors:
            raise HTTPException(status_code=400, detail="Session is already being monitored")

        # Get session details
        session = db.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        # Start monitoring in background
        def run_monitor():
            try:
                monitor = FocusMonitor(session_id, session['goal'], screenshot_interval=30)
                active_monitors[session_id] = monitor
                monitor.monitor_loop()
            except Exception as e:
                print(f"Monitor error for session {session_id}: {e}")
            finally:
                if session_id in active_monitors:
                    del active_monitors[session_id]

        background_tasks.add_task(run_monitor)

        return {
            "status": "success",
            "message": "Monitoring started",
            "session_id": session_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sessions/{session_id}/stop-monitoring")
async def stop_monitoring(session_id: str):
    """Stop monitoring a session and trigger analysis"""
    try:
        # Check if session is being monitored
        if session_id not in active_monitors:
            # Session might have already stopped, check if it's active in DB
            if not db.check_session_active(session_id):
                raise HTTPException(status_code=400, detail="Session is not active")

        # Stop the monitor by marking session as inactive (the monitor checks this)
        # The monitor loop will detect this and stop

        # Get session summary from monitor if it exists
        monitor = active_monitors.get(session_id)
        if monitor:
            summary = monitor.get_session_summary()
        else:
            # Calculate summary from screenshot_analyses (source of truth)
            analyses = db.get_screenshot_analyses(session_id)
            nudges = db.get_session_nudges(session_id)

            productive_time = 0
            not_productive_time = 0

            if analyses:
                for i, analysis in enumerate(analyses):
                    # Calculate duration: time until next screenshot, or estimate for last one
                    if i < len(analyses) - 1:
                        current_time = datetime.fromisoformat(analysis["timestamp"])
                        next_time = datetime.fromisoformat(analyses[i + 1]["timestamp"])
                        duration = int((next_time - current_time).total_seconds())
                    else:
                        # For the last analysis, use ~30 seconds estimate
                        duration = 30

                    if analysis["focused"]:
                        productive_time += duration
                    else:
                        not_productive_time += duration

            total_time = productive_time + not_productive_time
            focus_percentage = (productive_time / total_time * 100) if total_time > 0 else 0

            summary = {
                "productive_time": productive_time,
                "not_productive_time": not_productive_time,
                "focus_percentage": focus_percentage,
                "nudges_received": len(nudges)
            }

        # Run analysis
        analyzer = SessionAnalyzer()
        result = analyzer.analyze_and_end_session(session_id)

        # Clean up monitor
        if session_id in active_monitors:
            del active_monitors[session_id]

        return {
            "status": "success",
            "message": "Session ended and analyzed",
            "session": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/active/current")
def get_current_active_session():
    """Get currently active session if any"""
    try:
        sessions = db.get_all_sessions(limit=1)
        for session in sessions:
            if session['status'] == 'active':
                is_monitoring = session['id'] in active_monitors
                return {
                    "has_active": True,
                    "session": session,
                    "monitoring": is_monitoring
                }
        return {"has_active": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= INTERVAL ENDPOINTS =============

@app.post("/api/intervals")
def add_interval(interval: IntervalCreate):
    """Add a focus/distracted interval"""
    try:
        time_started = datetime.fromisoformat(interval.time_started)
        time_ended = datetime.fromisoformat(interval.time_ended)

        db.add_interval(
            session_id=interval.session_id,
            time_started=time_started,
            time_ended=time_ended,
            focused=interval.focused
        )

        return {"status": "success", "message": "Interval added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}/intervals")
def get_session_intervals(session_id: str):
    """Get all intervals for a session"""
    try:
        intervals = db.get_session_intervals(session_id)
        return {"intervals": intervals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= NUDGE ENDPOINTS =============

@app.post("/api/nudges")
def add_nudge(nudge: NudgeCreate):
    """Add a nudge event"""
    try:
        db.add_nudge(session_id=nudge.session_id, reason=nudge.reason)
        return {"status": "success", "message": "Nudge recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}/nudges")
def get_session_nudges(session_id: str):
    """Get all nudges for a session"""
    try:
        nudges = db.get_session_nudges(session_id)
        return {"nudges": nudges}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}/analyses")
def get_session_analyses(session_id: str):
    """Get all screenshot analyses for a session (source of truth for timeline)"""
    try:
        analyses = db.get_screenshot_analyses(session_id)
        return {"analyses": analyses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sessions/{session_id}/live-stats")
def get_live_session_stats(session_id: str):
    """Get real-time stats for an active session based on screenshot analyses"""
    try:
        analyses = db.get_screenshot_analyses(session_id)
        nudges = db.get_session_nudges(session_id)

        productive_time = 0
        not_productive_time = 0

        if analyses:
            for i, analysis in enumerate(analyses):
                # Calculate duration: time until next screenshot, or estimate for last one
                if i < len(analyses) - 1:
                    current_time = datetime.fromisoformat(analysis["timestamp"])
                    next_time = datetime.fromisoformat(analyses[i + 1]["timestamp"])
                    duration = int((next_time - current_time).total_seconds())
                else:
                    # For the last analysis, calculate time since that analysis
                    last_time = datetime.fromisoformat(analysis["timestamp"])
                    duration = int((datetime.now() - last_time).total_seconds())
                    # Cap at reasonable max (2 minutes) in case monitor stopped
                    duration = min(duration, 120)

                if analysis["focused"]:
                    productive_time += duration
                else:
                    not_productive_time += duration

        total_time = productive_time + not_productive_time
        focus_percentage = (productive_time / total_time * 100) if total_time > 0 else 0

        return {
            "productive_time": productive_time,
            "not_productive_time": not_productive_time,
            "focus_percentage": focus_percentage,
            "nudges_received": len(nudges),
            "analyses_count": len(analyses)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
