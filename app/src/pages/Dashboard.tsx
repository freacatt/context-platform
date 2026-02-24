import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from "@/components/ui/loading";
import { AppCard3D } from "@/components/dashboard/AppCard3D";
import { Bot, Pyramid, Workflow, GitMerge, Layout, BookOpen, Server, CheckSquare } from "lucide-react";
import { useWorkspacePath } from '@/hooks/useWorkspacePath';

const Dashboard: React.FC = () => {
  const { loading } = useAuth();
  const wp = useWorkspacePath();
  
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-background">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto p-6 pt-10 max-w-7xl">
        <div className="space-y-10">
        <section className="m-0 p-0">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-base font-semibold tracking-tight whitespace-nowrap">AI &amp; Agents</h2>
            <div className="border-t flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <AppCard3D 
              title="AI Assistant" 
              description="Chat with the AI assistant to get help with your project, generate ideas, or analyze your data."
              to={wp('/ai-chat')}
              icon={Bot}
              colorClass="bg-violet-600"
              buttonColorClass="bg-violet-500/25 hover:bg-violet-500/35"
            />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-base font-semibold tracking-tight whitespace-nowrap">Problem Solving, Thinking and Planning</h2>
            <div className="border-t flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <AppCard3D 
              title="Pyramid Solver" 
              description="Structure your problem solving with a logical pyramid approach. Break down complex issues into manageable questions and answers."
              to={wp('/pyramids')}
              icon={Pyramid}
              colorClass="bg-indigo-600"
              buttonColorClass="bg-indigo-500/25 hover:bg-indigo-500/35"
            />
            <AppCard3D 
              title="Diagrams" 
              description="Create and manage visual diagrams to illustrate system flows, architectures, and processes."
              to={wp('/diagrams')}
              icon={Workflow}
              colorClass="bg-rose-600"
              buttonColorClass="bg-rose-500/25 hover:bg-rose-500/35"
            />
          </div>
        </section>

        <section className="m-0 p-0">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-base font-semibold tracking-tight whitespace-nowrap">Product design &amp; Management</h2>
            <div className="border-t flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <AppCard3D 
              title="Product Definition" 
              description="Define your product using the structured mindmap. Detail problems, appetites, solutions, and risks in a structured graph."
              to={wp('/product-definitions')}
              icon={GitMerge}
              colorClass="bg-teal-600"
              buttonColorClass="bg-teal-500/25 hover:bg-teal-500/35"
            />
            <AppCard3D 
              title="UI/UX Architecture" 
              description="Design your application's visual structure, theme, and navigation flow using a visual node editor."
              to={wp('/ui-ux-architectures')}
              icon={Layout}
              colorClass="bg-pink-600"
              buttonColorClass="bg-pink-500/25 hover:bg-pink-500/35"
            />
          </div>
        </section>

        <section className="m-0 p-0">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-base font-semibold tracking-tight whitespace-nowrap">Knowledge Base</h2>
            <div className="border-t flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <AppCard3D 
              title="Context &amp; Documents" 
              description="Create and manage knowledge base documents. Use them as context for your product definitions and problem solving."
              to={wp('/context-documents')}
              icon={BookOpen}
              colorClass="bg-amber-600"
              buttonColorClass="bg-amber-500/25 hover:bg-amber-500/35"
            />
          </div>
        </section>

        <section className="m-0 p-0">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-base font-semibold tracking-tight whitespace-nowrap">Technical</h2>
            <div className="border-t flex-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <AppCard3D 
              title="Technical Architecture"
              description="Define the full technical architecture of your application. Specify system layers, technology stack, and engineering standards."
              to={wp('/technical-architectures')}
              icon={Server}
              colorClass="bg-purple-600"
              buttonColorClass="bg-purple-500/25 hover:bg-purple-500/35"
            />
            <AppCard3D 
              title="Technical Tasks" 
              description="Manage implementation tasks and bug fixes. Link tasks to technical architecture and track progress in pipelines."
              to={wp('/technical-tasks')}
              icon={CheckSquare}
              colorClass="bg-blue-600"
              buttonColorClass="bg-blue-500/25 hover:bg-blue-500/35"
            />
          </div>
        </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
