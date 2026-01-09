import { useState, useMemo } from 'react';

export default function ProductivityChart({ sessions = [] }) {
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Only use actual sessions data - no mock data
  const displayData = useMemo(() => {
    if (sessions.length === 0) return [];
    // Reverse the order so most recent is on the right
    return sessions.slice(-selectedPeriod).reverse();
  }, [sessions, selectedPeriod]);

  // Chart dimensions and calculations
  const chartWidth = 800;
  const chartHeight = 300;
  const padding = { top: 40, right: 40, bottom: 40, left: 40 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Calculate point positions
  const points = useMemo(() => {
    if (displayData.length === 0) return [];

    return displayData.map((session, index) => {
      const x = padding.left + (plotWidth / Math.max(displayData.length - 1, 1)) * index;
      const y = padding.top + plotHeight - (session.productivity / 100) * plotHeight;
      return {
        x,
        y,
        session,
        index
      };
    });
  }, [displayData, plotWidth, plotHeight, padding]);

  // Generate smooth curve path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x},${points[0].y}`;

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;

      path += ` Q ${midX},${current.y} ${midX},${(current.y + next.y) / 2}`;
      path += ` Q ${midX},${next.y} ${next.x},${next.y}`;
    }

    return path;
  }, [points]);

  // Generate area fill path
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';

    const bottomY = padding.top + plotHeight;
    let path = `M ${padding.left},${bottomY} L ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const midX = (current.x + next.x) / 2;

      path += ` Q ${midX},${current.y} ${midX},${(current.y + next.y) / 2}`;
      path += ` Q ${midX},${next.y} ${next.x},${next.y}`;
    }

    path += ` L ${points[points.length - 1].x},${bottomY} Z`;
    return path;
  }, [points, plotHeight, padding]);

  return (
    <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-white via-white to-accent/5 shadow-sm border border-accent/20 p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-[#111418] font-display">Productivity Trend</h3>
          <p className="text-sm text-[#637588]">
            Your focus consistency over the last {selectedPeriod} sessions
          </p>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(Number(e.target.value))}
          className="bg-[#f6f7f8] border-none text-sm font-medium text-[#637588] rounded-lg py-2 pl-3 pr-8 cursor-pointer focus:ring-1 focus:ring-primary"
        >
          <option value={7}>Last 7 Sessions</option>
          <option value={15}>Last 15 Sessions</option>
          <option value={30}>Last 30 Sessions</option>
        </select>
      </div>

      {/* SVG Chart */}
      <div className="flex-1 w-full min-h-[300px] relative">
        {/* Empty State */}
        {sessions.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <span className="material-symbols-outlined text-5xl mb-3">show_chart</span>
            <p className="text-lg font-medium text-gray-500">No data yet</p>
            <p className="text-sm text-gray-400">Complete some sessions to see your productivity trend</p>
          </div>
        )}
        <svg
          className="w-full h-full"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#c2794e" stopOpacity="0.25"></stop>
              <stop offset="100%" stopColor="#d4a574" stopOpacity="0"></stop>
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#c2794e" floodOpacity="0.3"></feDropShadow>
            </filter>
            <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#c2794e" floodOpacity="0.4"></feDropShadow>
            </filter>
          </defs>

          {/* Grid Lines */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const y = padding.top + plotHeight - (percent / 100) * plotHeight;
            return (
              <g key={percent}>
                <line
                  stroke="#e5e7eb"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#9ca3af"
                  fontFamily="Nunito, sans-serif"
                >
                  {percent}%
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {points.length > 0 && (
            <path
              className="chart-gradient"
              d={areaPath}
            />
          )}

          {/* Line */}
          {points.length > 0 && (
            <path
              d={linePath}
              fill="none"
              filter="url(#shadow)"
              stroke="#c2794e"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          )}

          {/* Data Points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredPoint === index ? 8 : 6}
                fill="#ffffff"
                stroke="#c2794e"
                strokeWidth={hoveredPoint === index ? 4 : 3}
                filter="url(#dotShadow)"
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredPoint(index)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{
                  transformOrigin: `${point.x}px ${point.y}px`,
                }}
              />

              {/* Hover Tooltip */}
              {hoveredPoint === index && (
                <g>
                  <foreignObject
                    x={point.x - 75}
                    y={point.y - 70}
                    width="150"
                    height="50"
                    className="pointer-events-none"
                  >
                    <div className="flex flex-col items-center">
                      <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 animate-fade-in-up">
                        <p className="text-xs font-bold text-[#111418] text-center whitespace-nowrap font-display">
                          {point.session.name}
                        </p>
                        <p className="text-lg font-bold text-primary text-center">
                          {point.session.productivity}%
                        </p>
                      </div>
                      <svg width="12" height="6" className="text-white -mt-1">
                        <polygon
                          points="0,0 12,0 6,6"
                          fill="white"
                          stroke="#e5e7eb"
                          strokeWidth="1"
                        />
                      </svg>
                    </div>
                  </foreignObject>
                </g>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Session Labels */}
      {displayData.length > 0 && displayData.length <= 7 && (
        <div className="flex justify-between mt-4 px-2 text-xs font-medium text-[#637588] uppercase tracking-wider font-display">
          {displayData.map((session, index) => (
            <span key={index} className="truncate max-w-[80px]" title={session.name}>
              S{index + 1}
            </span>
          ))}
        </div>
      )}
      {displayData.length > 7 && (
        <div className="flex justify-between mt-4 px-2 text-xs font-medium text-[#637588] uppercase tracking-wider font-display">
          <span>Session 1</span>
          <span>Session {Math.floor(displayData.length / 2)}</span>
          <span>Session {displayData.length}</span>
        </div>
      )}
    </div>
  );
}
