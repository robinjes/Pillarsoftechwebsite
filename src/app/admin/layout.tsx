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
    <div className="h-full flex flex-col bg-slate-900 border-r border-white/10 w-64">
      <div className="flex items-center justify-center p-6 border-b border-white/10">
        <ShieldCheck className="w-8 h-8 text-accent mr-3" />
        <span className={`${fredoka.className} text-2xl font-bold text-white tracking-wide`}>Admin</span>
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
    <div className="flex h-screen bg-Dark_Primary overflow-hidden text-white">
      {/* Mobile Sidebar toggle */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 bg-slate-800 rounded-lg text-white/70 hover:text-white border border-white/10"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto">
        <main className="flex-1 p-6 md:p-10 pt-20 md:pt-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
