import { ThemeProvider } from "@/components/theme-provider"
import { GlobalShaderOverlay } from "@/components/ui/global-shader-overlay"
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalProvider } from './contexts/GlobalContext';
import { AlertProvider } from './contexts/AlertContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { ErrorBoundary } from './components/ui/error-boundary';
import LandingPage from './pages/LandingPage';
import DocsPage from './pages/DocsPage';
import AboutPage from './pages/AboutPage';
import FeaturesPage from './pages/FeaturesPage';
import LoginPage from './pages/LoginPage';
import WorkspacesPage from './pages/WorkspacesPage';
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
import AiSettingsPage from './pages/AiSettingsPage';

import AuthenticatedLayout from './components/Layout/AuthenticatedLayout';
import { WorkspaceRouteSync } from './components/Layout/WorkspaceRouteSync';
import { PWAProvider } from './contexts/PWAContext';
import { PWAPrompt } from './components/PWA/PWAPrompt';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isGuest } = useAuth();

  if (loading) return null;
  if (!user && !isGuest) return <Navigate to="/login" />;

  return (
    <AuthenticatedLayout>
      {children}
    </AuthenticatedLayout>
  );
};

// Backward compat redirect: /workspace/:workspaceId/* -> /:workspaceId/*
function WorkspaceRedirect() {
  const { workspaceId, '*': rest } = useParams();
  return <Navigate to={`/${workspaceId}/${rest || 'dashboard'}`} replace />;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ErrorBoundary>
        <Router>
          <AuthProvider>
            <AlertProvider>
              <WorkspaceProvider>
                <GlobalProvider>
                  <PWAProvider>
                <GlobalShaderOverlay />
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/docs" element={<DocsPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/features" element={<FeaturesPage />} />
                  <Route path="/login" element={<LoginPage />} />

                  {/* Workspaces List */}
                  <Route
                    path="/workspaces"
                    element={
                      <ProtectedRoute>
                        <WorkspacesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Backward compat: /workspace/:workspaceId/* -> /:workspaceId/* */}
                  <Route path="/workspace/:workspaceId/*" element={<WorkspaceRedirect />} />

                  {/* All workspace-scoped routes */}
                  <Route path="/:workspaceId" element={<ProtectedRoute><WorkspaceRouteSync /></ProtectedRoute>}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="ai-chat" element={<AiChatPage />} />
                    <Route path="ai-settings" element={<AiSettingsPage />} />
                    <Route path="pyramids" element={<PyramidsPage />} />
                    <Route path="pyramid/:pyramidId" element={<PyramidEditor />} />
                    <Route path="diagrams" element={<DiagramsPage />} />
                    <Route path="diagram/:id" element={<DiagramEditorPage />} />
                    <Route path="product-definitions" element={<ProductDefinitionsPage />} />
                    <Route path="product-definition/:id" element={<ProductDefinitionEditor />} />
                    <Route path="context-documents" element={<ContextDocumentsPage />} />
                    <Route path="context-document/:id" element={<ContextDocumentEditor />} />
                    <Route path="context-documents/:id" element={<ContextDocumentEditor />} />
                    <Route path="directory/:id" element={<DirectoryDocumentsPage />} />
                    <Route path="technical-architectures" element={<TechnicalArchitecturesPage />} />
                    <Route path="technical-architecture/:id" element={<TechnicalArchitectureEditorPage />} />
                    <Route path="technical-tasks" element={<TechnicalTaskBoard />} />
                    <Route path="technical-task/:id" element={<TechnicalTaskDetail />} />
                    <Route path="ui-ux-architectures" element={<UiUxArchitecturesPage />} />
                    <Route path="ui-ux-architecture/:id" element={<UiUxArchitectureEditorPage />} />
                  </Route>
                </Routes>
                <PWAPrompt />
                </PWAProvider>
                </GlobalProvider>
              </WorkspaceProvider>
            </AlertProvider>
          </AuthProvider>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
    );
  }

export default App;
