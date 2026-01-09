"""
AI Analysis Service
Generates session titles, summaries, and structured distraction analysis using Claude
"""

import os
import anthropic
from datetime import datetime
from typing import Dict, List
import json

from database import Database


class SessionAnalyzer:
    """Generate AI analysis for completed sessions"""

    def __init__(self):
        self.anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.db = Database()

    def generate_session_title(self, goal: str, intervals: List[Dict], nudges: List[Dict]) -> str:
        """Generate a 1-3 word title for the session using Claude"""
        focused_count = sum(1 for i in intervals if i["focused"])
        distracted_count = len(intervals) - focused_count

        try:
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=50,
                messages=[{
                    "role": "user",
                    "content": f"""Generate a 1-3 word title for this focus session.

Goal: {goal}
Focused intervals: {focused_count}
Distracted intervals: {distracted_count}
Nudges sent: {len(nudges)}

Examples of good titles: "Deep Work", "Focused Coding", "Writing Session", "Research Time"

Return ONLY the title, nothing else."""
                }]
            )

            title = response.content[0].text.strip()
            # Remove quotes if present
            title = title.strip('"').strip("'")
            return title

        except Exception as e:
            print(f"❌ Error generating title: {e}")
            return "Focus Session"

    def analyze_distractions(self, session_id: str) -> Dict[str, int]:
        """
        Create structured output of distractions with time spent
        Uses Claude to analyze all screenshot analyses and categorize distractions
        Returns: {distraction_type: seconds}
        """
        # Get all screenshot analyses from temporary storage
        screenshot_analyses = self.db.get_screenshot_analyses(session_id)
        
        # Filter only distracted ones
        distracted_analyses = [a for a in screenshot_analyses if not a["focused"]]
        
        if not distracted_analyses:
            return {}
        
        # Build a summary of all distractions with timestamps
        distraction_summary = []
        for i, analysis in enumerate(distracted_analyses, 1):
            timestamp = datetime.fromisoformat(analysis["timestamp"])
            time_str = timestamp.strftime('%H:%M:%S')
            distraction_summary.append(f"{i}. [{time_str}] {analysis['explanation']}")
        
        distraction_text = "\n".join(distraction_summary)
        
        # Calculate time between screenshots (approximate duration for each)
        if len(screenshot_analyses) > 1:
            # Calculate average time between screenshots
            times = [datetime.fromisoformat(a["timestamp"]) for a in screenshot_analyses]
            time_diffs = [(times[i+1] - times[i]).total_seconds() for i in range(len(times)-1)]
            avg_interval = sum(time_diffs) / len(time_diffs) if time_diffs else 30
        else:
            avg_interval = 30  # Default assumption
        
        try:
            # Use Claude to categorize distractions
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{
                    "role": "user",
                    "content": f"""Analyze these distractions from a focus tracking session and categorize them.

Each distraction represents approximately {avg_interval:.0f} seconds of time.

Distractions detected:
{distraction_text}

Create 3-5 meaningful categories for these distractions and estimate total time for each category.

Return ONLY a JSON object in this exact format:
{{
  "Social Media": 120,
  "Email/Communication": 60,
  "News/YouTube": 90
}}

Make category names concise (2-3 words max). Time should be in seconds (integer).
Categories should be specific enough to be useful but not too granular."""
                }]
            )

            result_text = response.content[0].text.strip()
            
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            distraction_data = json.loads(result_text)
            
            return distraction_data

        except Exception as e:
            print(f"❌ Error analyzing distractions with Claude: {e}")
            # Fallback: return generic categorization
            total_distraction_time = len(distracted_analyses) * int(avg_interval)
            return {"General distraction": total_distraction_time}

    def generate_session_analysis(
        self,
        goal: str,
        intervals: List[Dict],
        nudges: List[Dict],
        focus_percentage: float,
        productive_time: int,
        not_productive_time: int,
        session_id: str
    ) -> str:
        """Generate a paragraph analysis of the session using Claude"""

        focused_count = sum(1 for i in intervals if i["focused"])
        distracted_count = len(intervals) - focused_count

        # Build interval summary
        interval_summary = []
        for i, interval in enumerate(intervals[:10]):  # Limit to first 10 for context
            start = datetime.fromisoformat(interval["interval_time_started"])
            duration_str = f"{start.strftime('%H:%M')}"
            state = "focused" if interval["focused"] else "distracted"
            interval_summary.append(f"{duration_str}: {state}")

        interval_text = ", ".join(interval_summary)
        if len(intervals) > 10:
            interval_text += f", ... ({len(intervals) - 10} more intervals)"

        # Get screenshot analyses to include specific distractions
        screenshot_analyses = self.db.get_screenshot_analyses(session_id)
        distracted_analyses = [a for a in screenshot_analyses if not a["focused"]]
        
        # Build distraction details (limit to show variety)
        distraction_examples = []
        if distracted_analyses:
            # Show up to 5 examples spread across the session
            step = max(1, len(distracted_analyses) // 5)
            sample_distractions = distracted_analyses[::step][:5]
            
            for analysis in sample_distractions:
                timestamp = datetime.fromisoformat(analysis["timestamp"])
                time_str = timestamp.strftime('%H:%M')
                distraction_examples.append(f"[{time_str}] {analysis['explanation']}")
        
        distraction_details = "\n".join(distraction_examples) if distraction_examples else "None"

        try:
            response = self.anthropic_client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=350,
                messages=[{
                    "role": "user",
                    "content": f"""Analyze this focus session and provide a thoughtful 3-4 sentence summary.

Session Goal: {goal}

Statistics:
- Focus percentage: {focus_percentage:.1f}%
- Productive time: {productive_time // 60}m {productive_time % 60}s
- Not productive time: {not_productive_time // 60}m {not_productive_time % 60}s
- Focused intervals: {focused_count}
- Distracted intervals: {distracted_count}
- Nudges sent: {len(nudges)}

Interval pattern: {interval_text}

Specific distractions detected:
{distraction_details}

Provide an analysis that:
1. Evaluates their focus quality
2. Mentions SPECIFIC distractions that pulled them away (be concrete!)
3. Notes any patterns (e.g., started strong, got distracted later)
4. Gives constructive, actionable feedback
5. Encourages improvement if needed

Write in a friendly, encouraging tone. Address the user as "you"."""
                }]
            )

            analysis = response.content[0].text.strip()
            return analysis

        except Exception as e:
            print(f"❌ Error generating analysis: {e}")
            return f"You worked on: {goal}. Your focus percentage was {focus_percentage:.1f}%."

    def analyze_and_end_session(self, session_id: str) -> Dict:
        """
        Complete analysis for a session and update database
        Returns session data with analysis
        """
        # Get session data
        session = self.db.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        if session["status"] != "active":
            raise ValueError(f"Session {session_id} is not active")

        # Get screenshot analyses (source of truth), intervals, and nudges
        screenshot_analyses = self.db.get_screenshot_analyses(session_id)
        intervals = self.db.get_session_intervals(session_id)
        nudges = self.db.get_session_nudges(session_id)

        # Calculate metrics from screenshot_analyses (more accurate than intervals)
        productive_time = 0
        not_productive_time = 0

        if screenshot_analyses:
            for i, analysis in enumerate(screenshot_analyses):
                # Calculate duration: time until next screenshot, or estimate for last one
                if i < len(screenshot_analyses) - 1:
                    current_time = datetime.fromisoformat(analysis["timestamp"])
                    next_time = datetime.fromisoformat(screenshot_analyses[i + 1]["timestamp"])
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

        # Count focused/distracted for AI analysis context
        focused_count = sum(1 for a in screenshot_analyses if a["focused"])
        distracted_count = len(screenshot_analyses) - focused_count

        print(f"\n📊 Analyzing session...")
        print(f"  Total analyses: {len(screenshot_analyses)}")
        print(f"  Focused: {focused_count}, Distracted: {distracted_count}")
        print(f"  Nudges: {len(nudges)}")
        print(f"  Focus: {focus_percentage:.1f}%")

        # Generate AI content
        print(f"\n🤖 Generating AI analysis...")
        title = self.generate_session_title(session["goal"], intervals, nudges)
        print(f"  ✓ Title: {title}")

        ai_analysis = self.generate_session_analysis(
            goal=session["goal"],
            intervals=intervals,
            nudges=nudges,
            focus_percentage=focus_percentage,
            productive_time=productive_time,
            not_productive_time=not_productive_time,
            session_id=session_id
        )
        print(f"  ✓ Analysis generated")

        # Analyze distractions using screenshot analyses
        ai_structured_output = self.analyze_distractions(session_id)
        print(f"  ✓ Distraction breakdown: {ai_structured_output}")

        # NOTE: We keep screenshot_analyses for completed sessions
        # They are used by the frontend for accurate timeline visualization
        # self.db.delete_screenshot_analyses(session_id)

        # Save to database
        self.db.end_session(
            session_id=session_id,
            title=title,
            focus_percentage=focus_percentage,
            productive_time=productive_time,
            not_productive_time=not_productive_time,
            nudges_received=len(nudges),
            ai_analysis=ai_analysis,
            ai_structured_output=ai_structured_output
        )

        print(f"\n✅ Session analysis complete!")

        # Return updated session
        return self.db.get_session(session_id)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python analysis.py <session_id>")
        sys.exit(1)

    session_id = sys.argv[1]

    analyzer = SessionAnalyzer()
    result = analyzer.analyze_and_end_session(session_id)

    print("\n" + "="*60)
    print("SESSION COMPLETE")
    print("="*60)
    print(f"Title: {result['title']}")
    print(f"Goal: {result['goal']}")
    print(f"Focus: {result['focus_percentage']:.1f}%")
    print(f"\nAnalysis:\n{result['ai_analysis']}")
    print(f"\nDistractions: {result['ai_structured_output']}")
    print("="*60)
