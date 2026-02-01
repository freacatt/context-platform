import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Terminal } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const location = useLocation();

  const links = [
    { name: 'Features', path: '/features' },
    { name: 'Docs', path: '/docs' },
    { name: 'About', path: '/about' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
        {/* Navbar */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Terminal className="h-6 w-6" />
            <span className="font-bold text-xl">Context Platform</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            {links.map((link) => (
              <Link 
                key={link.path} 
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.path ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link to="/login">
                <Button variant="ghost" size="sm">Log in</Button>
            </Link>
             <Link to="/login">
                <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-grow pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm py-12">
        <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                    <div className="flex items-center space-x-2 mb-4">
                        <Terminal className="h-5 w-5" />
                        <span className="font-bold text-lg">Context Platform</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Architectural context, complex diagrams, and decision records for engineering teams.
                    </p>
                </div>
                <div>
                    <h3 className="font-semibold mb-4">Product</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><Link to="/features" className="hover:text-foreground">Features</Link></li>
                        <li><Link to="/docs" className="hover:text-foreground">Documentation</Link></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-semibold mb-4">Company</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li><Link to="/about" className="hover:text-foreground">About</Link></li>
                    </ul>
                </div>
            </div>
            <div className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
                © {new Date().getFullYear()} Context Platform. All rights reserved.
            </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
