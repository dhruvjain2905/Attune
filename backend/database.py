"""
Database models and setup for Focus Tracker
Uses SQLite with proper schema for users, sessions, intervals, and nudges
"""

import sqlite3
from datetime import datetime
from typing import Optional, List, Dict
import json


class Database:
    def __init__(self, db_path: str = "focus_tracker.db"):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        """Initialize database with all tables"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                average_focus_score REAL DEFAULT 0.0,
                total_focus_time INTEGER DEFAULT 0,
                sessions_completed INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id INTEGER DEFAULT 1,
                title TEXT,
                goal TEXT NOT NULL,
                time_started TIMESTAMP NOT NULL,
                time_ended TIMESTAMP,
                date TEXT NOT NULL,
                focus_percentage REAL DEFAULT 0.0,
                productive_time INTEGER DEFAULT 0,
                not_productive_time INTEGER DEFAULT 0,
                nudges_received INTEGER DEFAULT 0,
                ai_analysis TEXT,
                ai_structured_output TEXT,
                status TEXT DEFAULT 'active',
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Intervals table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS intervals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                interval_time_started TIMESTAMP NOT NULL,
                interval_time_ended TIMESTAMP NOT NULL,
                focused BOOLEAN NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)

        # Nudges table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nudges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                nudge_timestamp TIMESTAMP NOT NULL,
                nudge_reason TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)

        # Screenshot analyses table (temporary storage for analysis)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS screenshot_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                timestamp TIMESTAMP NOT NULL,
                focused BOOLEAN NOT NULL,
                explanation TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)

        conn.commit()
        conn.close()

        # Create default user if not exists
        self._ensure_default_user()

    def _ensure_default_user(self):
        """Ensure default user exists"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM users WHERE id = 1")
        if not cursor.fetchone():
            cursor.execute("INSERT INTO users (id) VALUES (1)")
            conn.commit()

        conn.close()

    # ============= USER METHODS =============

    def get_user_stats(self, user_id: int = 1) -> Dict:
        """Get user statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                average_focus_score,
                total_focus_time,
                sessions_completed
            FROM users
            WHERE id = ?
        """, (user_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return {
                "average_focus_score": row["average_focus_score"],
                "total_focus_time": row["total_focus_time"],
                "sessions_completed": row["sessions_completed"]
            }
        return {"average_focus_score": 0, "total_focus_time": 0, "sessions_completed": 0}

    def update_user_stats(self, user_id: int = 1):
        """Recalculate and update user statistics based on all sessions"""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Get all completed sessions
        cursor.execute("""
            SELECT
                focus_percentage,
                productive_time
            FROM sessions
            WHERE user_id = ? AND status = 'completed'
        """, (user_id,))

        sessions = cursor.fetchall()

        if sessions:
            total_sessions = len(sessions)
            avg_focus = sum(s["focus_percentage"] for s in sessions) / total_sessions
            total_time = sum(s["productive_time"] for s in sessions)

            cursor.execute("""
                UPDATE users
                SET average_focus_score = ?,
                    total_focus_time = ?,
                    sessions_completed = ?
                WHERE id = ?
            """, (avg_focus, total_time, total_sessions, user_id))

            conn.commit()

        conn.close()

    # ============= SESSION METHODS =============

    def create_session(self, session_id: str, goal: str, user_id: int = 1) -> Dict:
        """Create a new session"""
        conn = self.get_connection()
        cursor = conn.cursor()

        now = datetime.now()
        date = now.strftime("%Y-%m-%d")

        cursor.execute("""
            INSERT INTO sessions (
                id, user_id, goal, time_started, date, status
            ) VALUES (?, ?, ?, ?, ?, 'active')
        """, (session_id, user_id, goal, now, date))

        conn.commit()
        conn.close()

        return {
            "session_id": session_id,
            "goal": goal,
            "time_started": now.isoformat(),
            "status": "active"
        }

    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session by ID"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM sessions WHERE id = ?
        """, (session_id,))

        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        return {
            "id": row["id"],
            "title": row["title"],
            "goal": row["goal"],
            "time_started": row["time_started"],
            "time_ended": row["time_ended"],
            "date": row["date"],
            "focus_percentage": row["focus_percentage"],
            "productive_time": row["productive_time"],
            "not_productive_time": row["not_productive_time"],
            "nudges_received": row["nudges_received"],
            "ai_analysis": row["ai_analysis"],
            "ai_structured_output": json.loads(row["ai_structured_output"]) if row["ai_structured_output"] else None,
            "status": row["status"]
        }

    def get_all_sessions(self, user_id: int = 1, limit: int = 50) -> List[Dict]:
        """Get all sessions for a user"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM sessions
            WHERE user_id = ?
            ORDER BY time_started DESC
            LIMIT ?
        """, (user_id, limit))

        rows = cursor.fetchall()
        conn.close()

        sessions = []
        for row in rows:
            sessions.append({
                "id": row["id"],
                "title": row["title"],
                "goal": row["goal"],
                "time_started": row["time_started"],
                "time_ended": row["time_ended"],
                "date": row["date"],
                "focus_percentage": row["focus_percentage"],
                "productive_time": row["productive_time"],
                "not_productive_time": row["not_productive_time"],
                "nudges_received": row["nudges_received"],
                "status": row["status"]
            })

        return sessions

    def end_session(
        self,
        session_id: str,
        title: str,
        focus_percentage: float,
        productive_time: int,
        not_productive_time: int,
        nudges_received: int,
        ai_analysis: str,
        ai_structured_output: Dict
    ):
        """End a session and save final statistics"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE sessions
            SET time_ended = ?,
                title = ?,
                focus_percentage = ?,
                productive_time = ?,
                not_productive_time = ?,
                nudges_received = ?,
                ai_analysis = ?,
                ai_structured_output = ?,
                status = 'completed'
            WHERE id = ?
        """, (
            datetime.now(),
            title,
            focus_percentage,
            productive_time,
            not_productive_time,
            nudges_received,
            ai_analysis,
            json.dumps(ai_structured_output),
            session_id
        ))

        conn.commit()
        conn.close()

        # Update user stats
        self.update_user_stats()

    def check_session_active(self, session_id: str) -> bool:
        """Check if session is active"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT status FROM sessions WHERE id = ?
        """, (session_id,))

        row = cursor.fetchone()
        conn.close()

        return row and row["status"] == "active"

    # ============= INTERVAL METHODS =============

    def add_interval(
        self,
        session_id: str,
        time_started: datetime,
        time_ended: datetime,
        focused: bool
    ):
        """Add a focus/distracted interval"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO intervals (
                session_id, interval_time_started, interval_time_ended, focused
            ) VALUES (?, ?, ?, ?)
        """, (session_id, time_started, time_ended, focused))

        conn.commit()
        conn.close()

    def get_session_intervals(self, session_id: str) -> List[Dict]:
        """Get all intervals for a session"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM intervals
            WHERE session_id = ?
            ORDER BY interval_time_started ASC
        """, (session_id,))

        rows = cursor.fetchall()
        conn.close()

        return [{
            "id": row["id"],
            "interval_time_started": row["interval_time_started"],
            "interval_time_ended": row["interval_time_ended"],
            "focused": bool(row["focused"])
        } for row in rows]

    # ============= NUDGE METHODS =============

    def add_nudge(self, session_id: str, reason: str):
        """Add a nudge event"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO nudges (session_id, nudge_timestamp, nudge_reason)
            VALUES (?, ?, ?)
        """, (session_id, datetime.now(), reason))

        conn.commit()
        conn.close()

    def get_session_nudges(self, session_id: str) -> List[Dict]:
        """Get all nudges for a session"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM nudges
            WHERE session_id = ?
            ORDER BY nudge_timestamp ASC
        """, (session_id,))

        rows = cursor.fetchall()
        conn.close()

        return [{
            "id": row["id"],
            "timestamp": row["nudge_timestamp"],
            "reason": row["nudge_reason"]
        } for row in rows]

    # ============= SCREENSHOT ANALYSIS METHODS (TEMPORARY) =============

    def add_screenshot_analysis(
        self,
        session_id: str,
        timestamp: datetime,
        focused: bool,
        explanation: str
    ):
        """Add a screenshot analysis to temporary storage"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO screenshot_analyses (session_id, timestamp, focused, explanation)
            VALUES (?, ?, ?, ?)
        """, (session_id, timestamp, focused, explanation))

        conn.commit()
        conn.close()

    def get_screenshot_analyses(self, session_id: str) -> List[Dict]:
        """Get all screenshot analyses for a session"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM screenshot_analyses
            WHERE session_id = ?
            ORDER BY timestamp ASC
        """, (session_id,))

        rows = cursor.fetchall()
        conn.close()

        return [{
            "id": row["id"],
            "timestamp": row["timestamp"],
            "focused": bool(row["focused"]),
            "explanation": row["explanation"]
        } for row in rows]

    def delete_screenshot_analyses(self, session_id: str):
        """Delete all screenshot analyses for a session (cleanup after analysis)"""
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            DELETE FROM screenshot_analyses
            WHERE session_id = ?
        """, (session_id,))

        conn.commit()
        conn.close()
