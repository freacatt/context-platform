import React from 'react';
import { Container, Box, Flex, Heading, Card, Text, Button } from '@radix-ui/themes';
import { GitMerge, ArrowRight, BookOpen, Pyramid, LucideIcon, Server, CheckSquare, Layout } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  to: string;
  color: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, description, icon: Icon, to, color }) => (
  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200" style={{ height: '100%' }}>
    <Flex direction="column" gap="4" height="100%">
      <Box className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={24} className="text-white" />
      </Box>
      <Box className="flex-grow">
        <Heading size="4" mb="2">{title}</Heading>
        <Text color="gray" size="2">{description}</Text>
      </Box>
      <Link to={to} className="w-full">
        <Button variant="soft" className="w-full cursor-pointer">
          Open Tool <ArrowRight size={16} />
        </Button>
      </Link>
    </Flex>
  </Card>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <Box className="h-full bg-gray-50">
      <Container size="3" className="p-4 pt-10">
        <Box className="mb-8 text-center">
            <Heading size="8" mb="2" className="text-gray-900">Context Platform</Heading>
            <Text size="4" color="gray">Select a tool to start working on your project.</Text>
        </Box>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <ToolCard 
                title="Pyramid Solver" 
                description="Structure your problem solving with a logical pyramid approach. Break down complex issues into manageable questions and answers."
                icon={Pyramid}
                to="/pyramids"
                color="bg-indigo-600"
            />
            
            <ToolCard 
                title="Product Definition" 
                description="Define your product using the structured mindmap. Detail problems, appetites, solutions, and risks in a structured graph."
                icon={GitMerge}
                to="/product-definitions"
                color="bg-teal-600"
            />

            <ToolCard 
                title="Context & Documents" 
                description="Create and manage knowledge base documents. Use them as context for your product definitions and problem solving."
                icon={BookOpen}
                to="/context-documents"
                color="bg-amber-600"
            />

            <ToolCard 
                title="Technical Architecture" 
                description="Define the full technical architecture of your application. Specify system layers, technology stack, and engineering standards."
                icon={Server}
                to="/technical-architectures"
                color="bg-purple-600"
            />

            <ToolCard 
                title="Technical Tasks" 
                description="Manage implementation tasks and bug fixes. Link tasks to technical architecture and track progress in pipelines."
                icon={CheckSquare}
                to="/technical-tasks"
                color="bg-blue-600"
            />

            <ToolCard 
                title="UI/UX Architecture" 
                description="Design your application's visual structure, theme, and navigation flow using a visual node editor."
                icon={Layout}
                to="/ui-ux-architectures"
                color="bg-pink-600"
            />
        </div>
      </Container>
    </Box>
  );
};

export default Dashboard;
