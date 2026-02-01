import React from 'react';
import PublicLayout from '@/components/Layout/PublicLayout';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Box, Layers, Zap, Code, Database, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LampContainer } from '@/components/ui/lamp';
import { StickyScroll } from '@/components/ui/sticky-scroll-reveal';

const LandingPage: React.FC = () => {
  return (
    <PublicLayout>
      <HeroSection />
      <StickyScrollFeaturesSection />
    </PublicLayout>
  );
};

const HeroSection = () => {
  return (
    <LampContainer>
      <motion.div
        initial={{ opacity: 0.5, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="mt-8 bg-gradient-to-br from-white to-neutral-400 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl"
      >
        Build Future-Proof <br /> Architecture
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="mt-4 max-w-2xl mx-auto text-center px-4"
      >
        <p className="text-neutral-400 text-lg md:text-xl mb-8">
            The minimal, futuristic platform for engineering context. 
            Visualize complex systems with interactive precision.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <Link to="/login">
                <Button size="lg" className="h-12 px-8 text-lg rounded-full bg-white hover:bg-neutral-200 text-black border-none shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]">
                  Start Building <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </Link>
            <Link to="/docs">
                <Button size="lg" variant="outline" className="h-12 px-8 text-lg rounded-full border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white">
                  Read Documentation
                </Button>
            </Link>
        </div>
      </motion.div>
    </LampContainer>
  );
};

const StickyScrollFeaturesSection = () => {
  const content = [
    {
      title: "Interactive Visualization",
      description:
        "Trace dependencies across your entire stack with intelligent, routing-aware connectors. Visualize the flow of data and control logic in real-time.",
      content: (
        <div className="h-full w-full bg-neutral-900 flex items-center justify-center text-white border border-neutral-800">
          <Zap className="h-24 w-24 text-white" />
        </div>
      ),
    },
    {
      title: "3D Architecture",
      description:
        "Explore your architecture in a new dimension. Rotate, zoom, and dive into modules to understand the spatial relationships of your system.",
      content: (
        <div className="h-full w-full bg-neutral-900 flex items-center justify-center text-white border border-neutral-800">
          <Box className="h-24 w-24 text-white" />
        </div>
      ),
    },
    {
      title: "Layered Context",
      description:
        "Switch between high-level overview and implementation details instantly. Keep your documentation and code in sync without context switching.",
      content: (
        <div className="h-full w-full bg-neutral-900 flex items-center justify-center text-white border border-neutral-800">
          <Layers className="h-24 w-24 text-white" />
        </div>
      ),
    },
    {
      title: "Code Integration",
      description:
        "Sync your diagrams directly with your codebase. Changes in code are reflected in your architecture diagrams automatically.",
      content: (
        <div className="h-full w-full bg-neutral-900 flex items-center justify-center text-white border border-neutral-800">
          <Code className="h-24 w-24 text-white" />
        </div>
      ),
    },
     {
      title: "Database Mapping",
      description:
        "Visualize schema relationships and data flows. Understand how your data is structured and accessed across different services.",
      content: (
        <div className="h-full w-full bg-neutral-900 flex items-center justify-center text-white border border-neutral-800">
          <Database className="h-24 w-24 text-white" />
        </div>
      ),
    },
  ];
  return (
    <div className="py-20 bg-black relative z-10">
         <div className="container px-4 mx-auto mb-12 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">Core Capabilities</h2>
            <p className="text-neutral-400 text-lg">Everything you need to master your system's complexity.</p>
        </div>
      <StickyScroll content={content} />
    </div>
  );
};

export default LandingPage;
