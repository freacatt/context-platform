import React from 'react';
import PublicLayout from '@/components/Layout/PublicLayout';
import { LayoutDashboard, FileText, Cpu, Network, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { appUrl } from '@/lib/utils';

const FeaturesPage: React.FC = () => {
  const features = [
    {
      title: 'Context Mapping',
      description: 'Visualize your system boundaries and interactions with ease. Our intelligent mapping engine automatically arranges your components for clarity.',
      icon: <Network className="h-10 w-10 text-cyan-500" />,
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
    },
    {
      title: 'Decision Records',
      description: 'Keep track of architectural decisions (ADRs) right where you work. Link decisions to code and diagrams for full traceability.',
      icon: <FileText className="h-10 w-10 text-purple-500" />,
      image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop"
    },
    {
      title: 'Technical Architecture',
      description: 'Define and document your technical stack and component relationships. Use our predefined templates or create your own.',
      icon: <Cpu className="h-10 w-10 text-emerald-500" />,
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop"
    },
    {
      title: 'Interactive Dashboards',
      description: 'Get a bird\'s eye view of your project\'s health and status. Monitor key metrics and track progress in real-time.',
      icon: <LayoutDashboard className="h-10 w-10 text-amber-500" />,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop"
    },
  ];

  return (
    <PublicLayout>
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-4 py-24">
            <div className="text-center max-w-3xl mx-auto mb-20">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/50"
                >
                    Powerful Features
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl text-muted-foreground"
                >
                    Designed to help you master your software architecture.
                </motion.p>
            </div>

            <div className="space-y-32">
                {features.map((feature, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.5 }}
                        className={`flex flex-col ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-center`}
                    >
                        <div className="flex-1 space-y-6">
                            <div className="inline-flex p-3 rounded-2xl bg-secondary/30 backdrop-blur-sm border border-border/50">
                                {feature.icon}
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold">{feature.title}</h2>
                            <p className="text-lg text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                            <Button variant="link" className="p-0 h-auto text-lg group">
                                Learn more <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>
                        <div className="flex-1 w-full">
                            <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl group">
                                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <img
                                    src={feature.image}
                                    alt={feature.title}
                                    className="w-full aspect-video object-cover transform transition-transform duration-700 group-hover:scale-105"
                                />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="mt-32 text-center">
                <h2 className="text-3xl font-bold mb-8">Ready to transform your workflow?</h2>
                <a href={appUrl('/login')}>
                    <Button size="lg" className="rounded-full px-8 text-lg h-12">
                        Get Started Now
                    </Button>
                </a>
            </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default FeaturesPage;
