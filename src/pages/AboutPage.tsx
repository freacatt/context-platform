import React from 'react';
import PublicLayout from '@/components/Layout/PublicLayout';
import { Badge } from '@/components/ui/badge';

const AboutPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <Badge className="mb-4" variant="outline">Our Mission</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            Clarifying Complexity for Engineering Teams
          </h1>
          
          <div className="prose prose-lg dark:prose-invert">
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              We believe that great software is built on clear communication and shared understanding. 
              Our mission is to provide engineering teams with the tools they need to visualize, 
              document, and manage the complex context that surrounds their code.
            </p>
            
            <h2 className="text-2xl font-semibold mt-12 mb-4">Why we built this</h2>
            <p className="text-muted-foreground mb-6">
              Modern software systems are incredibly complex. Keeping track of architectural decisions, 
              context maps, and domain logic often involves scattered documents, whiteboard photos, 
              and outdated wikis. We wanted a better way.
            </p>

            <h2 className="text-2xl font-semibold mt-12 mb-4">The Team</h2>
            <p className="text-muted-foreground mb-6">
              We are a team of engineers, designers, and architects who have felt the pain of 
              "archaeology" in legacy codebases. We're building the tool we wish we had.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default AboutPage;
