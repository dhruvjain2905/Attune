import { useState, useMemo } from 'react';

export default function SessionTimeline({ analyses = [], nudges = [], timeStarted, timeEnded, isActive = false }) {
  const [hoveredNudge, setHoveredNudge] = useState(null);

  const data = useMemo(() => {
    // Don't show timeline for active sessions - wait until complete
    if (isActive) {
      return null;
    }

    if (!timeStarted || analyses.length === 0) {
      return null;
    }

    const startDate = new Date(timeStarted);
    const endDate = timeEnded ? new Date(timeEnded) : new Date();

    const totalDurationSeconds = (endDate - startDate) / 1000;
    const totalDurationMinutes = totalDurationSeconds / 60;

    // Convert analyses to intervals - each analysis covers time until the next one
    const processedIntervals = [];

    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      const analysisTime = new Date(analysis.timestamp);

      // Calculate interval start and end
      let intervalStart = analysisTime;
      let intervalEnd;

      if (i < analyses.length - 1) {
        // End at next analysis timestamp
        intervalEnd = new Date(analyses[i + 1].timestamp);
      } else {
        // Last analysis - end at session end time
        intervalEnd = endDate;
      }

      const startSeconds = (intervalStart - startDate) / 1000;
      const durationSeconds = (intervalEnd - intervalStart) / 1000;

      // Skip very short intervals (less than 1 second)
      if (durationSeconds < 1) continue;

      const startMinutes = startSeconds / 60;
      const durationMinutes = durationSeconds / 60;

      processedIntervals.push({
        type: analysis.focused ? 'focused' : 'distracted',
        startMinutes,
        durationMinutes: Math.max(durationMinutes, 0.1), // Minimum for visibility
        label: analysis.focused ? 'Focused' : 'Distracted',
        explanation: analysis.explanation,
        durationDisplay: durationSeconds < 60 ? `${Math.round(durationSeconds)}s` : null
      });
    }

    // Process nudges - use nudge_timestamp field from backend
    const processedNudges = nudges.map(nudge => {
      const nudgeDate = new Date(nudge.timestamp);
      const timeSeconds = (nudgeDate - startDate) / 1000;
      const timeMinutes = timeSeconds / 60;

      return {
        timeMinutes,
        reason: nudge.reason || 'Focus reminder sent'
      };
    });

    return {
      startTime: startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      endTime: endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      totalDurationMinutes,
      intervals: processedIntervals,
      nudges: processedNudges
    };
  }, [analyses, nudges, timeStarted, timeEnded, isActive]);

  // Calculate percentage width for each interval
  const getIntervalWidth = (durationMinutes) => {
    return (durationMinutes / data.totalDurationMinutes) * 100;
  };

  // Calculate percentage position for each interval
  const getIntervalPosition = (startMinutes) => {
    return (startMinutes / data.totalDurationMinutes) * 100;
  };

  // Calculate position for nudges
  const getNudgePosition = (timeMinutes) => {
    // Clamp position to valid range
    const position = (timeMinutes / data.totalDurationMinutes) * 100;
    return Math.max(0, Math.min(100, position));
  };

  // Show placeholder for active sessions
  if (isActive) {
    return (
      <div className="px-4">
        <div className="bg-white border border-accent/20 rounded-xl p-6 shadow-sm">
          <h2 className="text-[#111418] text-xl font-bold mb-4">Session Timeline</h2>
          <div className="text-center py-8 text-gray-500">
            <span className="material-symbols-outlined text-4xl mb-2 animate-pulse">hourglass_top</span>
            <p>Timeline will be available when the session ends</p>
            <p className="text-sm mt-1 text-gray-400">Focus data is being collected...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.intervals.length === 0) {
    return (
      <div className="px-4">
        <div className="bg-white border border-accent/20 rounded-xl p-6 shadow-sm">
          <h2 className="text-[#111418] text-xl font-bold mb-4">Session Timeline</h2>
          <div className="text-center py-8 text-gray-500">
            <span className="material-symbols-outlined text-4xl mb-2">timeline</span>
            <p>No timeline data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="bg-white border border-accent/20 rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[#111418] text-xl font-bold">Session Timeline</h2>
          <div className="flex gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <div className="size-3 bg-primary rounded-full"></div>
              <span className="text-[#617589]">Focus</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 bg-orange-400 rounded-full"></div>
              <span className="text-[#617589]">Distraction</span>
            </div>
          </div>
        </div>

        {/* Timeline Visual */}
        <div className="relative w-full bg-gray-50 rounded-lg px-4 py-8">
          {/* Time Labels */}
          <div className="absolute top-2 left-4 text-xs font-medium text-gray-400">{data.startTime}</div>
          <div className="absolute top-2 right-4 text-xs font-medium text-gray-400">{data.endTime}</div>

          <div className="relative w-full">
            {/* Intervals bar - with background */}
            <div className="relative h-6 w-full bg-gray-200 rounded-full overflow-hidden">
              {data.intervals.map((interval, index) => {
                const width = getIntervalWidth(interval.durationMinutes);
                const left = getIntervalPosition(interval.startMinutes);
                const bgColor = interval.type === 'focused' ? 'bg-primary' : 'bg-orange-400';
                const hoverBgColor = interval.type === 'focused' ? 'hover:bg-[#0a4da8]' : 'hover:bg-orange-600';

                return (
                  <div
                    key={index}
                    className={`absolute h-full ${bgColor} ${hoverBgColor} transition-colors`}
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 0.5)}%` // Minimum width for visibility
                    }}
                  />
                );
              })}
            </div>

            {/* Nudges layer */}
            {data.nudges.map((nudge, index) => {
              const position = getNudgePosition(nudge.timeMinutes);

              return (
                <div
                  key={index}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                  onMouseEnter={() => setHoveredNudge(index)}
                  onMouseLeave={() => setHoveredNudge(null)}
                >
                  {/* Connecting line from top of bar to marker below */}
                  <div className="h-6 w-px bg-transparent"></div>
                  <div className="h-4 w-px bg-[#0B7DD1]"></div>

                  {/* Nudge marker */}
                  <div className="size-7 bg-white border-2 border-[#0B7DD1] rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-transform relative">
                    <span className="material-symbols-outlined text-[16px] text-[#0B7DD1]">notifications</span>

                    {/* Nudge tooltip */}
                    {hoveredNudge === index && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#111418] text-white text-xs py-2 px-3 rounded shadow-xl w-64 z-50">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-sm flex-shrink-0 mt-0.5">lightbulb</span>
                          <p className="text-left leading-relaxed">{nudge.reason}</p>
                        </div>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                          <div className="border-4 border-transparent border-t-[#111418]"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
