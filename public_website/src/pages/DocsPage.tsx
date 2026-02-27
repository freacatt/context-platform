import React from 'react';
import PublicLayout from '@/components/Layout/PublicLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, Code, Layers, Share2 } from 'lucide-react';

const DocsPage: React.FC = () => {
  const sections = [
    {
      title: 'Getting Started',
      description: 'Learn how to set up your workspace and create your first project.',
      icon: <Book className="h-6 w-6 mb-2 text-primary" />,
    },
    {
      title: 'Core Concepts',
      description: 'Understand the fundamental building blocks of the Context Platform.',
      icon: <Layers className="h-6 w-6 mb-2 text-primary" />,
    },
    {
      title: 'API Reference',
      description: 'Detailed documentation for our API endpoints and client libraries.',
      icon: <Code className="h-6 w-6 mb-2 text-primary" />,
    },
    {
      title: 'Integrations',
      description: 'Connect with your favorite tools like GitHub, Jira, and Slack.',
      icon: <Share2 className="h-6 w-6 mb-2 text-primary" />,
    },
  ];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to build and manage your architectural context.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {sections.map((section, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer border-primary/10 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="mb-2">{section.icon}</div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-primary hover:underline">Read more &rarr;</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
};

export default DocsPage;
