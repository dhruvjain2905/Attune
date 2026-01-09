import { Link } from 'react-router-dom';

export default function Button({ children, onClick, to, variant = 'primary', icon, className = '', type = 'button', disabled = false }) {
  const baseClasses = "flex items-center justify-center rounded-xl px-8 gap-3 font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

  const variants = {
    primary: "h-14 bg-gradient-to-br from-primary via-primary to-primary-light hover:from-primary-light hover:via-primary hover:to-primary active:from-primary/90 active:to-primary-light/90 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 text-base focus:ring-primary/50 disabled:hover:from-primary disabled:hover:to-primary-light disabled:hover:shadow-lg",
    secondary: "h-10 bg-white border-2 border-accent/40 text-[#111418] text-sm shadow-sm hover:bg-accent/5 hover:border-accent hover:shadow-md focus:ring-accent/50 disabled:hover:bg-white disabled:hover:border-accent/40",
  };

  const content = (
    <>
      {icon && <span className="material-symbols-outlined group-hover:animate-pulse">{icon}</span>}
      <span>{children}</span>
    </>
  );

  const classes = `${baseClasses} ${variants[variant]} ${className}`;

  if (to && !disabled) {
    return (
      <Link to={to} className={`group ${classes}`}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`group ${classes}`}>
      {content}
    </button>
  );
}
