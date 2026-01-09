export default function StatCard({ icon, iconColor, title, value, badge, badgeColor = 'green' }) {
  const iconColorClasses = {
    blue: 'bg-gradient-to-br from-primary/10 to-primary/5 text-primary',
    purple: 'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600',
    orange: 'bg-gradient-to-br from-accent-warm/30 to-accent/20 text-primary',
  };

  const badgeColorClasses = {
    green: 'text-[#078838] bg-gradient-to-r from-green-50 to-emerald-50',
    gray: 'text-[#637588] bg-gradient-to-r from-gray-100 to-gray-50',
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl p-6 bg-white shadow-sm border border-accent/20 hover:border-primary/40 hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${iconColorClasses[iconColor] || iconColorClasses.blue}`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        {badge && (
          <span className={`flex items-center px-2 py-1 rounded-md text-xs font-bold ${badgeColorClasses[badgeColor] || badgeColorClasses.green}`}>
            {badge.icon && <span className="material-symbols-outlined text-sm mr-1">{badge.icon}</span>}
            {badge.text}
          </span>
        )}
      </div>
      <div>
        <p className="text-[#637588] text-base font-medium font-display">{title}</p>
        <p className="text-[#111418] text-4xl font-bold mt-1 font-display">{value}</p>
      </div>
    </div>
  );
}
