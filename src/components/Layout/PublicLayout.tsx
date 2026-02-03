import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Terminal, Box } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <Navbar />
      {/* Main Content */}
      <main className="flex-grow pt-24">
        {children}
      </main>
      <Footer />
    </div>
  );
};

const Navbar = () => {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 50], [0, 1]);
  const translateY = useTransform(scrollY, [0, 50], [-20, 0]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const links = [
    { name: 'Features', path: '/features' },
    { name: 'Docs', path: '/docs' },
    { name: 'Pricing', path: '/pricing' }, // Added based on reference
    { name: 'Contact', path: '/contact' }, // Added based on reference
  ];

  const formatTimeInfo = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZoneName: 'short'
    };
    
    try {
        const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
        const timeStr = parts
            .filter(p => ['hour', 'minute', 'literal', 'dayPeriod'].includes(p.type))
            .map(p => p.value)
            .join('')
            .trim();
        const regionStr = parts.find(p => p.type === 'timeZoneName')?.value || '';
        return { time: timeStr, region: regionStr };
    } catch (e) {
        return { 
            time: date.toLocaleTimeString(), 
            region: 'UTC' 
        };
    }
  };

  const { time: timeString, region } = formatTimeInfo(time);

  const headerBgOpacity = useTransform(scrollY, [0, 20], [0, 1]);
  const headerBackdropBlur = useTransform(scrollY, [0, 20], ["blur(0px)", "blur(12px)"]);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "circOut" }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
        <motion.div 
            className="absolute inset-0 bg-background/80 border-b border-border/40" 
            style={{ 
                opacity: headerBgOpacity,
                backdropFilter: headerBackdropBlur,
                WebkitBackdropFilter: headerBackdropBlur
            }} 
        />

        {/* Dynamic Border Line on Scroll */}
        <motion.div 
            className="absolute bottom-0 left-0 right-0 h-[1px] bg-border/50" 
            style={{ opacity }} 
        />

      <div className="relative mx-auto flex items-center justify-between max-w-[1400px]">
        {/* Left: Location / Time */}
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground w-1/3">
          <span className="hidden sm:inline-block">{region}</span>
          <span className="hidden sm:inline-block text-muted-foreground/40">/</span>
          <span className="tabular-nums">{timeString}</span>
        </div>

        {/* Center: Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 group w-1/3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                <Box className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
                Context Platform
            </span>
        </Link>

        {/* Right: Navigation */}
        <div className="flex items-center justify-end gap-6 w-1/3">
            <nav className="hidden md:flex items-center gap-6">
                {links.map((link) => (
                <Link
                    key={link.path}
                    to={link.path}
                    className={`text-sm font-medium transition-all hover:text-primary relative group ${
                    location.pathname === link.path ? 'text-primary' : 'text-muted-foreground'
                    }`}
                >
                    {link.name}
                    <span className={`absolute -bottom-1 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full ${location.pathname === link.path ? 'w-full' : ''}`} />
                </Link>
                ))}
            </nav>
            <div className="flex items-center gap-2 pl-4 border-l border-border/40">
                <ThemeToggle />
                <Link to="/login">
                    <Button size="sm" className="rounded-full px-5 hidden sm:flex">
                        Login
                    </Button>
                </Link>
            </div>
        </div>
      </div>
    </motion.header>
  );
};

const Footer = () => (
    <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm py-12 relative z-10">
    <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
                <div className="flex items-center space-x-2 mb-4">
                    <Box className="h-5 w-5" />
                    <span className="font-bold text-lg">Context Platform</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    Architectural context, complex diagrams, and decision records for engineering teams.
                </p>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link to="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                    <li><Link to="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
                </ul>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
                    <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                </ul>
            </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>© {new Date().getFullYear()} Context Platform. All rights reserved.</div>
            <div className="flex gap-6">
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            </div>
        </div>
    </div>
    </footer>
);

export default PublicLayout;
