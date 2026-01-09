import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../services/api';

export default function Navbar() {
  const location = useLocation();
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    checkActiveSession();
    // Poll for active session changes every 10 seconds
    const interval = setInterval(checkActiveSession, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkActiveSession = async () => {
    try {
      const data = await api.getCurrentActiveSession();
      setActiveSession(data.has_active ? data.session : null);
    } catch (err) {
      console.error('Error checking active session:', err);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#e5e7eb] bg-white px-10 py-4 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-2xl">mindfulness</span>
        </div>
        <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] font-display">Attune</h2>
      </div>

      <nav className="hidden md:flex flex-1 justify-center gap-8">
        <Link
          className={`text-sm font-medium leading-normal transition-colors ${
            isActive('/')
              ? 'text-primary font-bold border-b-2 border-primary pb-0.5'
              : 'text-[#637588] hover:text-[#111418]'
          }`}
          to="/"
        >
          Dashboard
        </Link>
        {activeSession ? (
          <Link
            className={`text-sm font-medium leading-normal transition-colors flex items-center gap-1.5 ${
              isActive(`/session/${activeSession.id}`)
                ? 'text-primary font-bold border-b-2 border-primary pb-0.5'
                : 'text-green-600 hover:text-green-700'
            }`}
            to={`/session/${activeSession.id}`}
          >
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Active Session
          </Link>
        ) : (
          <Link
            className={`text-sm font-medium leading-normal transition-colors ${
              isActive('/new-session')
                ? 'text-primary font-bold border-b-2 border-primary pb-0.5'
                : 'text-[#637588] hover:text-[#111418]'
            }`}
            to="/new-session"
          >
            New Session
          </Link>
        )}
       
      </nav>

      <div className="flex items-center gap-4">
        <button className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 transition-colors text-[#637588] hover:text-[#111418] focus:outline-none focus:ring-2 focus:ring-primary/50 active:scale-95">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="flex items-center justify-center size-10 rounded-full hover:bg-gray-100 transition-colors text-[#637588] hover:text-[#111418] focus:outline-none focus:ring-2 focus:ring-primary/50 active:scale-95">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <div
          className="bg-center bg-no-repeat bg-cover rounded-full size-10 border-2 border-gray-200 shadow-sm"
          style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuA-bPPpVQtx9pISCABVpL-7LjZAvtJ6bbR5QElviBsbyDEyuECPSdBeD8qu9nAQBq8bYFBOvZXZ6z1NQt9jAhbe-9SdYPJUnJplGDi4iGOSpkjWSxbRm1jM5Hrl9Mo8vFnkdBLGAdwf0TMsJA8dvciB8J5O1KmqtazS6XSP72RBGAbyeoEf_8mE9I5PrSxjRJMNnXnyGBqLoqz5Vu9FhESe5yizq54cO_1mtDWz_by4XgC5UwPxIkFXjnOX3I4faP2qKwMo8rG_3Vk")'}}
          aria-label="User profile"
        />
      </div>
    </header>
  );
}
