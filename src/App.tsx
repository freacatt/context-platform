import { ThemeProvider } from "@/components/theme-provider"
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalProvider } from './contexts/GlobalContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PyramidsPage from './pages/PyramidsPage';
import DiagramsPage from './pages/DiagramsPage';
import DiagramEditorPage from './pages/DiagramEditor';
import ProductDefinitionsPage from './pages/ProductDefinitionsPage';
import PyramidEditor from './pages/PyramidEditor';
import ProductDefinitionEditor from './pages/ProductDefinitionEditor';
import ContextDocumentsPage from './pages/ContextDocumentsPage';
import ContextDocumentEditor from './pages/ContextDocumentEditor';
import DirectoryDocumentsPage from './pages/DirectoryDocumentsPage';
import { TechnicalArchitecturesPage } from './pages/TechnicalArchitecturesPage';
import { TechnicalArchitectureEditorPage } from './pages/TechnicalArchitectureEditorPage';
import { UiUxArchitecturesPage } from './pages/UiUxArchitecturesPage';
import { UiUxArchitectureEditorPage } from './pages/UiUxArchitectureEditorPage';
import { TechnicalTaskBoard } from './pages/TechnicalTaskBoard';
import { TechnicalTaskDetail } from './pages/TechnicalTaskDetail';
import AiChatPage from './pages/AiChatPage';

import AuthenticatedLayout from './components/Layout/AuthenticatedLayout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Or a loading spinner
  if (!user) return <Navigate to="/" />;
  
  return (
    <AuthenticatedLayout>
      {children}
    </AuthenticatedLayout>
  );
};

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <GlobalProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              
              {/* Main Dashboard (Tool Selection) */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Pyramid Tool Routes */}
              <Route 
                path="/pyramids" 
                element={
                  <ProtectedRoute>
                    <PyramidsPage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Diagram Tool Routes */}
              <Route 
                path="/diagrams" 
                element={
                  <ProtectedRoute>
                    <DiagramsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/diagram/:id" 
                element={
                  <ProtectedRoute>
                    <DiagramEditorPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/pyramid/:pyramidId" 
                element={
                  <ProtectedRoute>
                    <PyramidEditor />
                  </ProtectedRoute>
                } 
              />

              {/* Product Definition Tool Routes */}
              <Route 
                path="/product-definitions" 
                element={
                  <ProtectedRoute>
                    <ProductDefinitionsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/product-definition/:id" 
                element={
                  <ProtectedRoute>
                    <ProductDefinitionEditor />
                  </ProtectedRoute>
                } 
              />

              {/* Context & Documents Routes */}
              <Route 
                path="/context-documents" 
                element={
                  <ProtectedRoute>
                    <ContextDocumentsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/context-document/:id" 
                element={
                  <ProtectedRoute>
                    <ContextDocumentEditor />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/context-documents/:id" 
                element={
                  <ProtectedRoute>
                    <ContextDocumentEditor />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/directory/:id" 
                element={
                  <ProtectedRoute>
                    <DirectoryDocumentsPage />
                  </ProtectedRoute>
                } 
              />

              {/* Technical Architecture Routes */}
              <Route 
                path="/technical-architectures" 
                element={
                  <ProtectedRoute>
                    <TechnicalArchitecturesPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/technical-architecture/:id" 
                element={
                  <ProtectedRoute>
                    <TechnicalArchitectureEditorPage />
                  </ProtectedRoute>
                } 
              />

              {/* Technical Tasks Routes */}
              <Route 
                path="/technical-tasks" 
                element={
                  <ProtectedRoute>
                    <TechnicalTaskBoard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/technical-task/:id" 
                element={
                  <ProtectedRoute>
                    <TechnicalTaskDetail />
                  </ProtectedRoute>
                } 
              />

              {/* UI/UX Architecture Routes */}
              <Route 
                path="/ui-ux-architectures" 
                element={
                  <ProtectedRoute>
                    <UiUxArchitecturesPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/ui-ux-architecture/:id" 
                element={
                  <ProtectedRoute>
                    <UiUxArchitectureEditorPage />
                  </ProtectedRoute>
                } 
              />

               {/* AI Assistant Route */}
               <Route 
                path="/ai-chat" 
                element={
                  <ProtectedRoute>
                    <AiChatPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Router>
        </GlobalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
