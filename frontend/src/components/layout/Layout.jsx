import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden text-[#111418] transition-colors duration-200">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
