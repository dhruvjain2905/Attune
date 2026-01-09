#!/usr/bin/env python3
"""
Focus Tracker - Main CLI Entry Point
Orchestrates session creation, monitoring, and analysis
"""

import sys
import os
from datetime import datetime
from database import Database
from monitor import FocusMonitor
from analysis import SessionAnalyzer
import uuid


def print_banner():
    """Print welcome banner"""
    print("\n" + "="*60)
    print("🎯 FOCUS TRACKER")
    print("="*60)


def create_new_session():
    """Interactive session creation"""
    print("\n📝 Create New Focus Session\n")

    goal = input("What are you working on? ").strip()
    if not goal:
        print("❌ Goal cannot be empty!")
        return None

    # Create session in database
    db = Database()
    session_id = str(uuid.uuid4())
    session = db.create_session(session_id, goal)

    print(f"\n✅ Session created!")
    print(f"   ID: {session_id}")
    print(f"   Goal: {goal}")
    print(f"   Started: {datetime.now().strftime('%I:%M %p')}")

    return session_id, goal


def run_monitoring(session_id: str, goal: str):
    """Run the monitoring loop"""
    print(f"\n🚀 Starting monitoring in 3 seconds...")
    print("   Press Ctrl+C to end session\n")

    import time
    time.sleep(3)

    monitor = FocusMonitor(session_id, goal, screenshot_interval=30)
    monitor.monitor_loop()


def analyze_session(session_id: str):
    """Generate AI analysis for the session"""
    print(f"\n🤖 Analyzing session with AI...")

    analyzer = SessionAnalyzer()
    session = analyzer.analyze_and_end_session(session_id)

    print("\n" + "="*60)
    print("SESSION SUMMARY")
    print("="*60)
    print(f"📌 Title: {session['title']}")
    print(f"🎯 Goal: {session['goal']}")
    print(f"⏱️  Started: {session['time_started']}")
    print(f"⏹️  Ended: {session['time_ended']}")
    print(f"\n📊 Performance:")
    print(f"   Focus Score: {session['focus_percentage']:.1f}%")
    print(f"   Productive Time: {session['productive_time'] // 60}m {session['productive_time'] % 60}s")
    print(f"   Distracted Time: {session['not_productive_time'] // 60}m {session['not_productive_time'] % 60}s")
    print(f"   Nudges: {session['nudges_received']}")

    if session['ai_structured_output']:
        print(f"\n🔍 Distraction Breakdown:")
        for distraction, seconds in session['ai_structured_output'].items():
            print(f"   {distraction}: {seconds // 60}m {seconds % 60}s")

    print(f"\n💬 AI Analysis:")
    print(f"   {session['ai_analysis']}")
    print("="*60 + "\n")

    return session


def main():
    """Main CLI flow"""
    print_banner()

    # Check for required API key
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("\n❌ Error: ANTHROPIC_API_KEY not found!")
        print("   Set it in your .env file or environment")
        sys.exit(1)

    try:
        # Step 1: Create session
        result = create_new_session()
        if not result:
            sys.exit(1)

        session_id, goal = result

        # Step 2: Run monitoring
        run_monitoring(session_id, goal)

        # Step 3: Analyze and end session
        analyze_session(session_id)

        print("✅ Session complete! View it in the dashboard.")
        print(f"   Session ID: {session_id}\n")

    except KeyboardInterrupt:
        print("\n\n⚠️  Session interrupted!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
