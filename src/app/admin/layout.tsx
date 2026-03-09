'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Fredoka, Space_Grotesk } from 'next/font/google';
import { ShieldCheck, Calendar, FileText, Settings, LogOut, Menu, X } from 'lucide-react';

const fredoka = Fredoka({ subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Exclude login page from layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const navItems = [
    { name: 'Events', href: '/admin/events', icon: Calendar },
    { name: 'Forms', href: '/admin/forms', icon: FileText },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="h-full flex flex-col bg-slate-900 w-64">
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center">
          <ShieldCheck className="w-8 h-8 text-accent mr-3" />
          <span className={`${fredoka.className} text-2xl font-bold text-white tracking-wide`}>Admin</span>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-accent/20 text-accent font-bold border border-accent/20' 
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              } ${spaceGrotesk.className}`}
            >
              <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-accent' : 'text-slate-400 group-hover:text-amber-400 transition-colors'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={`flex items-center w-full px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors font-semibold ${spaceGrotesk.className}`}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Horizontal Navbar for Desktop & Header for Mobile */}
      <nav className="sticky top-0 z-40 w-full bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden mr-4 p-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:text-white active:bg-white/10 transition-colors"
              aria-label="Open Menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href="/admin/events" className="flex items-center shrink-0">
              <ShieldCheck className="w-8 h-8 text-accent mr-2" />
              <span className={`${fredoka.className} text-xl md:text-2xl font-bold text-white tracking-wide`}>Admin</span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-2 ml-8">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 group ${
                      isActive 
                        ? 'bg-accent/10 text-accent font-bold' 
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    } ${spaceGrotesk.className}`}
                  >
                    <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center">
            {/* Desktop Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors text-sm font-bold border border-transparent hover:border-red-400/20"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar (Drawer) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/80 shadow-2xl backdrop-blur-md z-[60] md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-[70] md:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}
