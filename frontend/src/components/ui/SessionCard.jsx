import { Link } from 'react-router-dom';

export default function SessionCard({ session, clickable = true }) {
  const iconColorClasses = {
    blue: 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary',
    purple: 'bg-gradient-to-br from-purple-200 to-purple-100 text-purple-600',
    orange: 'bg-gradient-to-br from-accent-warm/40 to-accent/30 text-primary',
    green: 'bg-gradient-to-br from-green-200 to-green-100 text-green-600',
  };

  const scoreColorClass = session.focusScore >= 90
    ? 'text-[#078838]'
    : session.focusScore >= 70
    ? 'text-[#078838]'
    : 'text-yellow-600';

  const content = (
    <>
      <div className="flex items-center gap-4">
        <div className={`size-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${iconColorClasses[session.iconColor] || iconColorClasses.blue}`}>
          <span className="material-symbols-outlined text-xl">{session.icon}</span>
        </div>
        <div>
          <p className="text-base font-bold text-[#111418] font-display">{session.title}</p>
          <p className="text-sm text-[#637588]">{session.time}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-base font-bold text-[#111418] font-display">{session.duration}</p>
        <p className={`text-sm font-bold ${scoreColorClass}`}>{session.focusScore}% Focus</p>
      </div>
    </>
  );

  const className = "group flex items-center justify-between p-4 hover:bg-gradient-to-r hover:from-accent/5 hover:to-transparent transition-all cursor-pointer border-b border-accent/15 last:border-0 focus-within:ring-2 focus-within:ring-primary/30 focus-within:bg-accent/5";

  if (clickable && session.id) {
    return (
      <Link to={`/session/${session.id}`} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
