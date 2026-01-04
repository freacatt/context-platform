import { Theme } from '@radix-ui/themes';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GlobalProvider } from './contexts/GlobalContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import PyramidsPage from './pages/PyramidsPage';
import ProductDefinitionsPage from './pages/ProductDefinitionsPage';
import PyramidEditor from './pages/PyramidEditor';
import ProductDefinitionEditor from './pages/ProductDefinitionEditor';
import ContextDocumentsPage from './pages/ContextDocumentsPage';
import ContextDocumentEditor from './pages/ContextDocumentEditor';
import { TechnicalArchitecturesPage } from './pages/TechnicalArchitecturesPage';
import { TechnicalArchitectureEditorPage } from './pages/TechnicalArchitectureEditorPage';
import { TechnicalTaskBoard } from './pages/TechnicalTaskBoard';
import { TechnicalTaskDetail } from './pages/TechnicalTaskDetail';

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
    <Theme appearance="light" accentColor="indigo" grayColor="slate" radius="medium">
      <AuthProvider>
        <GlobalProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              
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
                path="/product-definition/:definitionId" 
                element={
                  <ProtectedRoute>
                    <ProductDefinitionEditor />
                  </ProtectedRoute>
                } 
              />

              {/* Context Documents Tool Routes */}
              <Route 
                path="/context-documents" 
                element={
                  <ProtectedRoute>
                    <ContextDocumentsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/context-document/:documentId" 
                element={
                  <ProtectedRoute>
                    <ContextDocumentEditor />
                  </ProtectedRoute>
                } 
              />

              {/* Technical Tasks Tool Routes */}
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

              {/* Technical Architecture Tool Routes */}
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

            </Routes>
          </Router>
        </GlobalProvider>
      </AuthProvider>
    </Theme>
  );
}

export default App;
