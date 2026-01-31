import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { HyperText } from "@/components/ui/hyper-text";
import { ChevronRight, Terminal } from 'lucide-react';
import { AnimatedButton } from "@/components/ui/animated-button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const LandingPage: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return null; 
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background flex flex-col items-center justify-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,rgba(29,78,216,0.15),transparent)] dark:bg-[radial-gradient(circle_500px_at_50%_200px,rgba(29,78,216,0.25),transparent)]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 text-center z-10"
      >
        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8 flex justify-center"
        >
          <Badge variant="outline" className="px-4 py-1.5 text-sm rounded-full bg-background/50 backdrop-blur-sm border-border shadow-sm animate-pulse text-foreground">
            <Terminal className="mr-2 h-3.5 w-3.5" />
            v0.1 Now Available
          </Badge>
        </motion.div>

        {/* Hero Title */}
        <div className="flex justify-center w-full mb-6">
          <HyperText
            className="text-5xl md:text-7xl font-bold tracking-tight text-foreground"
            text="Context Platform"
          />
        </div>
        
        {/* Description */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <p className="max-w-2xl mx-auto block text-muted-foreground mb-10 leading-relaxed text-lg">
            The definitive platform for managing architectural context, complex diagrams, and decision records. 
            Designed for engineering teams who value clarity.
          </p>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link to="/login">
            <AnimatedButton size="lg" className="px-8 py-6 text-lg rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all bg-primary text-primary-foreground hover:bg-primary/90">
              Enter Platform <ChevronRight className="ml-2 h-5 w-5" />
            </AnimatedButton>
          </Link>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default LandingPage;
