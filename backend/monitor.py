"""
Screenshot monitoring service
Captures screenshots, analyzes with Qwen (local) + Claude (API), tracks intervals, sends nudges
"""

import time
import os
from datetime import datetime
from PIL import ImageGrab
import ollama
import anthropic
from dotenv import load_dotenv

from database import Database

load_dotenv()


class FocusMonitor:
    """Monitor user focus by analyzing screenshots"""

    def __init__(self, session_id: str, goal: str, screenshot_interval: int = 0):
        self.session_id = session_id
        self.goal = goal
        self.screenshot_interval = screenshot_interval
        self.db = Database()
        self.anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        # Session tracking
        self.consecutive_distractions = 0
        self.nudges_sent = 0
        self.current_interval_start = None
        self.current_interval_focused = None

        # Thresholds
        self.consecutive_distractions_for_nudge = 3

    def capture_screenshot(self) -> str:
        """Capture screenshot and save to temp file"""
        screenshot = ImageGrab.grab()
        path = f"temp_screenshot_{self.session_id}.png"
        screenshot.save(path, format='PNG')
        return path

    def analyze_with_qwen(self, screenshot_path: str) -> str:
        """Use Qwen vision model to describe what's on screen"""
        try:
            result = ollama.chat(
                model='qwen3-vl:2b',
                messages=[{
                    'role': 'user',
                    'content': f"""Describe what you see on this screen in 2-3 sentences.
Focus on: what application is open, what the user appears to be doing, what window they are primarily on, and any visible text or content.""",
                    'images': [screenshot_path]
                }]
            )
            return result['message']['content'].strip()
        except Exception as e:
            print(f"❌ Qwen error: {e}")
            return None

    def analyze_with_claude(self, description: str) -> tuple:
        """Use Claude to classify as FOCUSED or DISTRACTED"""
        try:
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=150,
                messages=[{
                    "role": "user",
                    "content": f"""User's goal: {self.goal}

Screen description from vision model: {description}

Analyze whether the user is FOCUSED or DISTRACTED based on these principles:

FOCUSED includes:
- Direct work on the stated goal
- Research, reference lookup, or gathering resources related to the goal
- Using tools/platforms that support the goal (IDE, documentation, design tools, spreadsheets, writing apps, etc.)
- Brief context switching between relevant tasks (e.g., checking old code, reviewing notes, looking up references)
- Legitimate breaks in workflow (saving, organizing files, testing, reviewing)
- Preparatory or planning activities for the goal
- Reading articles, papers, or content that could reasonably inform the goal
- Communication directly related to the work (emails about the project, work Slack/Teams)

DISTRACTED means (only flag if VERY CONFIDENT):
- Social media browsing clearly unrelated to work (scrolling Instagram, Twitter feeds, TikTok)
- Entertainment consumption with no connection to goal (YouTube videos, Netflix, gaming, sports)
- Online shopping or personal browsing (e-commerce sites, travel booking, personal finance)
- Extended messaging/chatting on personal topics (WhatsApp, Discord, iMessage for non-work conversations)
- News or content with absolutely no relevance to the stated goal

**DEFAULT TO FOCUSED when in doubt.** Only mark as DISTRACTED if you're highly confident the activity has NO reasonable connection to the user's goal. If there's ANY plausible link to productivity or the stated goal, choose FOCUSED.

Context matters: Consider the RELATIONSHIP between what's on screen and the goal, not just surface-level activity. Examples:
- Developer on GitHub + Google Colab = FOCUSED (reference work)
- Writer on Twitter reading threads about writing = FOCUSED (research/inspiration)
- Designer on Pinterest/Dribbble = FOCUSED (gathering inspiration)
- Student on Wikipedia/YouTube educational content = FOCUSED (learning)
- Anyone on Reddit in a relevant subreddit = FOCUSED (community research)

Answer with only: FOCUSED or DISTRACTED

Then on a new line, provide a brief one-sentence explanation of why, referencing specific elements that informed your decision."""
                }]
            )

            result = response.content[0].text.strip()
            lines = result.split('\n', 1)
            classification = lines[0].strip().upper()
            explanation = lines[1].strip() if len(lines) > 1 else ""

            return classification, explanation

        except Exception as e:
            print(f"❌ Claude error: {e}")
            return None, None

    def show_notification(self, title: str, message: str):
        """Show macOS notification"""
        escaped_message = message.replace('"', '\\"')
        os.system(f'''osascript -e 'display notification "{escaped_message}" with title "{title}"' ''')

    def handle_interval_change(self, focused: bool, timestamp: datetime):
        """Handle transition between focus states"""
        if self.current_interval_start is not None:
            # Save the previous interval
            self.db.add_interval(
                session_id=self.session_id,
                time_started=self.current_interval_start,
                time_ended=timestamp,
                focused=self.current_interval_focused
            )

        # Start new interval
        self.current_interval_start = timestamp
        self.current_interval_focused = focused

    def monitor_loop(self):
        """Main monitoring loop"""
        print(f"\n{'='*60}")
        print(f"🎯 Monitoring session: {self.goal}")
        print(f"📸 Taking screenshots every {self.screenshot_interval} seconds")
        print(f"🔔 Will nudge after {self.consecutive_distractions_for_nudge} consecutive distractions")
        print(f"{'='*60}\n")
        print("Press Ctrl+C to stop\n")

        screenshot_path = None
        start_time = datetime.now()

        try:
            time.sleep(10)  # Initial delay before first capture
            while True:
                # Check if session is still active
                if not self.db.check_session_active(self.session_id):
                    print("\n⚠️  Session ended externally. Stopping monitor.")
                    break

                timestamp = datetime.now()
                print(f"[{timestamp.strftime('%H:%M:%S')}] 📸 Capturing screenshot...")

                # Capture screenshot
                screenshot_path = self.capture_screenshot()

                # Analyze with Qwen
                print("  🔍 Analyzing with Qwen...")
                qwen_start = time.time()
                description = self.analyze_with_qwen(screenshot_path)
                qwen_time = time.time() - qwen_start

                if description:
                    print(f"  ✓ Qwen ({qwen_time:.1f}s): {description[:80]}...")

                    # Analyze with Claude
                    print("  🤖 Analyzing with Claude...")
                    classification, explanation = self.analyze_with_claude(description)

                    if classification:
                        focused = "FOCUSED" in classification

                        # Store the screenshot analysis in temporary table
                        self.db.add_screenshot_analysis(
                            session_id=self.session_id,
                            timestamp=timestamp,
                            focused=focused,
                            explanation=explanation
                        )

                        # Handle interval tracking
                        if self.current_interval_focused is None:
                            # First check - initialize
                            self.current_interval_start = timestamp
                            self.current_interval_focused = focused
                        elif self.current_interval_focused != focused:
                            # State changed - save old interval and start new one
                            self.handle_interval_change(focused, timestamp)

                        # Update consecutive distractions
                        if focused:
                            self.consecutive_distractions = 0
                            print(f"  ✅ FOCUSED: {explanation}")
                        else:
                            self.consecutive_distractions += 1
                            print(f"  ⚠️  DISTRACTED: {explanation}")
                            print(f"  ⚠️  Consecutive: {self.consecutive_distractions}/{self.consecutive_distractions_for_nudge}")

                            # Send nudge if threshold reached
                            if self.consecutive_distractions >= self.consecutive_distractions_for_nudge:
                                self.nudges_sent += 1
                                self.consecutive_distractions = 0

                                nudge_reason = f"Consecutive distractions detected: {explanation}"
                                self.db.add_nudge(self.session_id, nudge_reason)

                                self.show_notification(
                                    "🎯 Focus Reminder",
                                    f"Get back to: {self.goal}"
                                )
                                print(f"  🔔 NUDGE SENT! (Total: {self.nudges_sent})")

                # Cleanup screenshot
                if os.path.exists(screenshot_path):
                    os.remove(screenshot_path)

                print()
                print(f"⏳ Waiting {self.screenshot_interval} seconds...\n")
                time.sleep(30)

        except KeyboardInterrupt:
            print("\n\n🛑 Monitoring stopped by user")

        finally:
            # Save final interval if exists
            if self.current_interval_start is not None:
                self.db.add_interval(
                    session_id=self.session_id,
                    time_started=self.current_interval_start,
                    time_ended=datetime.now(),
                    focused=self.current_interval_focused
                )

            # Cleanup temp screenshot
            if screenshot_path and os.path.exists(screenshot_path):
                os.remove(screenshot_path)

            print("\n✓ Monitoring session complete")

    def get_session_summary(self) -> dict:
        """Generate summary statistics for the session based on screenshot analyses (source of truth)"""
        analyses = self.db.get_screenshot_analyses(self.session_id)
        nudges = self.db.get_session_nudges(self.session_id)

        if not analyses:
            return {
                "productive_time": 0,
                "not_productive_time": 0,
                "focus_percentage": 0,
                "nudges_received": len(nudges)
            }

        # Each analysis represents ~30 seconds of time (the screenshot interval)
        # Use actual timestamps to calculate more accurate durations
        productive_time = 0
        not_productive_time = 0

        for i, analysis in enumerate(analyses):
            # Calculate duration: time until next screenshot, or estimate for last one
            if i < len(analyses) - 1:
                current_time = datetime.fromisoformat(analysis["timestamp"])
                next_time = datetime.fromisoformat(analyses[i + 1]["timestamp"])
                duration = int((next_time - current_time).total_seconds())
            else:
                # For the last analysis, use the screenshot interval (default ~30 seconds)
                # or time since last screenshot
                duration = self.screenshot_interval if self.screenshot_interval > 0 else 30

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
            "nudges_received": len(nudges)
        }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 3:
        print("Usage: python monitor.py <session_id> <goal>")
        sys.exit(1)

    session_id = sys.argv[1]
    goal = " ".join(sys.argv[2:])

    monitor = FocusMonitor(session_id, goal)
    monitor.monitor_loop()

    # Print summary
    print("\n📊 Generating session summary...")
    summary = monitor.get_session_summary()
    print(f"  Productive time: {summary['productive_time']}s")
    print(f"  Not productive time: {summary['not_productive_time']}s")
    print(f"  Focus percentage: {summary['focus_percentage']:.1f}%")
    print(f"  Nudges received: {summary['nudges_received']}\n")
