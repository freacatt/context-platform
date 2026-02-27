import React, { useState } from 'react';
import PublicLayout from '@/components/Layout/PublicLayout';
import { GlobalShaderOverlay } from '@/components/ui/global-shader-overlay';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Layers, Workflow, FileText, CheckSquare, Layout, Server, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Spotlight } from '@/components/ui/spotlight';
import { appUrl } from '@/lib/utils';

const LandingPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="relative min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/20 antialiased">
        <Spotlight
            className="-top-40 left-0 md:left-60 md:-top-20 text-primary/20 dark:text-white/20"
            fill="currentColor"
        />
        <GlobalShaderOverlay />
        <BackgroundGrid />

        <div className="relative z-10">
            <HeroSection />
            <FeaturesGrid />
            <IntegrationsSection />
            <CTASection />
        </div>
      </div>
    </PublicLayout>
  );
};

const BackgroundGrid = () => (
  <div className="fixed inset-0 z-0 pointer-events-none">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
  </div>
);

const HeroSection = () => {
  return (
    <section className="relative pt-20 pb-32 md:pt-32 md:pb-48 px-4 flex flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm mb-8"
      >
        <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
        v1.0 is now live
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-4xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-foreground to-muted-foreground"
      >
        Master Your <br className="hidden md:block" />
        <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">Engineering Context</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
      >
        The unified platform for Product Definitions, Technical Architecture, and Live Diagrams.
        Stop guessing. Start solving.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-4 w-full justify-center"
      >
        <a href={appUrl('/login')}>
            <Button size="lg" className="h-12 px-8 text-base rounded-full w-full sm:w-auto shadow-[0_0_20px_rgba(59,130,246,0.5)] bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] border-none transition-all hover:-translate-y-1 text-white">
            Start Building Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </a>
        <Link to="/docs">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full w-full sm:w-auto bg-transparent border-border text-muted-foreground hover:bg-accent backdrop-blur-sm">
            View Documentation
            </Button>
        </Link>
      </motion.div>
    </section>
  );
};

const FeaturesGrid = () => {
  const features = [
    {
      title: "Interactive Pyramids",
      description: "Break down complex problems into manageable hierarchies. Visualize dependencies and execution paths.",
      icon: <Layers className="h-6 w-6 text-blue-500" />,
      className: "md:col-span-2",
      color: "blue"
    },
    {
      title: "Live Architecture",
      description: "Diagrams that sync with your codebase. No more stale documentation.",
      icon: <Workflow className="h-6 w-6 text-violet-500" />,
      className: "md:col-span-1",
      color: "violet"
    },
    {
      title: "Product Definitions",
      description: "Capture the 'Why' and 'What' with structured clarity before writing code.",
      icon: <FileText className="h-6 w-6 text-emerald-500" />,
      className: "md:col-span-1",
      color: "emerald"
    },
    {
      title: "Technical Tasks",
      description: "Convert architecture into actionable tasks. Track progress in real-time.",
      icon: <CheckSquare className="h-6 w-6 text-orange-500" />,
      className: "md:col-span-2",
      color: "orange"
    },
    {
        title: "Technical Architecture",
        description: "Define your stack, standards, and patterns in one central place. Ensure consistency across your team.",
        icon: <Server className="h-6 w-6 text-cyan-500" />,
        className: "md:col-span-2",
        color: "cyan"
    },
    {
        title: "Context Documents",
        description: "A centralized knowledge base for your engineering decisions and documentation.",
        icon: <BookOpen className="h-6 w-6 text-yellow-500" />,
        className: "md:col-span-1",
        color: "yellow"
    },
    {
        title: "UI/UX Architecture",
        description: "Design systems and user flows mapped directly to implementation components.",
        icon: <Layout className="h-6 w-6 text-pink-500" />,
        className: "md:col-span-3",
        color: "pink"
      },
  ];

  return (
    <section className="container mx-auto px-4 pb-32">
        <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-foreground">Everything Connected</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Stop switching between Jira, Figma, and Confluence. Context Platform brings your entire engineering context into one workspace.
            </p>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {features.map((feature, index) => (
          <FeatureCard key={index} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
};

const FeatureCard = ({ feature, index }: { feature: { title: string; description: string; icon: React.ReactNode; className: string; color: string }, index: number }) => {
    const [isHovered, setIsHovered] = useState(false);

    const colorMap: Record<string, string> = {
        blue: "rgba(59, 130, 246, 0.1)",
        violet: "rgba(139, 92, 246, 0.1)",
        emerald: "rgba(16, 185, 129, 0.1)",
        orange: "rgba(249, 115, 22, 0.1)",
        cyan: "rgba(6, 182, 212, 0.1)",
        yellow: "rgba(234, 179, 8, 0.1)",
        pink: "rgba(236, 72, 153, 0.1)",
    };

    const borderColors: Record<string, string> = {
        blue: "rgba(59, 130, 246, 0.5)",
        violet: "rgba(139, 92, 246, 0.5)",
        emerald: "rgba(16, 185, 129, 0.5)",
        orange: "rgba(249, 115, 22, 0.5)",
        cyan: "rgba(6, 182, 212, 0.5)",
        yellow: "rgba(234, 179, 8, 0.5)",
        pink: "rgba(236, 72, 153, 0.5)",
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={feature.className}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`relative h-full rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 group`}
                style={{
                    borderColor: isHovered ? borderColors[feature.color] : undefined
                }}
            >
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.05)_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50"></div>

                <div className="relative z-10 p-8 flex flex-col h-full">
                    <div
                        className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border"
                        style={{ backgroundColor: isHovered ? colorMap[feature.color] : 'transparent' }}
                    >
                        {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed flex-grow">
                        {feature.description}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

const IntegrationsSection = () => {
    return (
        <section className="py-20 border-y border-border bg-muted/30">
            <div className="container mx-auto px-4 text-center">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">
                    Powered by Modern Tech Stack
                </p>
                <div className="flex flex-wrap justify-center gap-8 md:gap-16 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <TechItem name="React" color="text-blue-400" />
                    <TechItem name="TypeScript" color="text-blue-600" />
                    <TechItem name="Firebase" color="text-yellow-500" />
                    <TechItem name="Tailwind" color="text-cyan-400" />
                    <TechItem name="Vite" color="text-purple-400" />
                    <TechItem name="Framer Motion" color="text-pink-500" />
                </div>
            </div>
        </section>
    )
}

const TechItem = ({ name, color }: { name: string, color: string }) => (
    <div className={`flex items-center gap-2 font-medium text-lg ${color}`}>
        <div className="h-2 w-2 rounded-full bg-current" />
        {name}
    </div>
)

const CTASection = () => {
  return (
    <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 pointer-events-none" />
      <div className="container mx-auto max-w-4xl text-center relative z-10">
        <motion.h2
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-foreground"
        >
          Ready to Solve Complexity?
        </motion.h2>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          Join thousands of engineers who are building better software with clear context and aligned architecture.
        </p>
        <a href={appUrl('/login')}>
            <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)] bg-blue-600 hover:bg-blue-700 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] border-none transition-all hover:-translate-y-1 text-white">
            Get Started for Free
            </Button>
        </a>
      </div>
    </section>
  );
};

export default LandingPage;
