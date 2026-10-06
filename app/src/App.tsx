import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { FullPageSpinner } from '@/components/layout/FullPageSpinner';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Toaster } from '@/components/ui/sonner';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { WorkspaceLayout } from '@/features/workspaces/WorkspaceLayout';

// Each screen is its own chunk, loaded when its route is first visited.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const ContextDocumentEditorPage = lazy(() => import('@/features/contextDocuments/ContextDocumentEditorPage'));
const ContextDocumentsPage = lazy(() => import('@/features/contextDocuments/ContextDocumentsPage'));
const DirectoryDocumentsPage = lazy(() => import('@/features/contextDocuments/DirectoryDocumentsPage'));
const DiagramEditorPage = lazy(() => import('@/features/diagrams/DiagramEditorPage'));
const DiagramsPage = lazy(() => import('@/features/diagrams/DiagramsPage'));
const ProductDefinitionEditorPage = lazy(() => import('@/features/productDefinitions/ProductDefinitionEditorPage'));
const ProductDefinitionsPage = lazy(() => import('@/features/productDefinitions/ProductDefinitionsPage'));
const PyramidEditorPage = lazy(() => import('@/features/pyramids/PyramidEditorPage'));
const PyramidsPage = lazy(() => import('@/features/pyramids/PyramidsPage'));
const TechnicalArchitectureEditorPage = lazy(() => import('@/features/technicalArchitectures/TechnicalArchitectureEditorPage'));
const TechnicalArchitecturesPage = lazy(() => import('@/features/technicalArchitectures/TechnicalArchitecturesPage'));
const TechnicalPlansPage = lazy(() => import('@/features/technicalPlans/TechnicalPlansPage'));
const TechnicalPlanEditorPage = lazy(() => import('@/features/technicalPlans/TechnicalPlanEditorPage'));
const DesignSystemsPage = lazy(() => import('@/features/designSystems/DesignSystemsPage'));
const DesignSystemEditorPage = lazy(() => import('@/features/designSystems/DesignSystemEditorPage'));
const DecisionsPage = lazy(() => import('@/features/decisions/DecisionsPage'));
const DecisionEditorPage = lazy(() => import('@/features/decisions/DecisionEditorPage'));
const GlossariesPage = lazy(() => import('@/features/glossaries/GlossariesPage'));
const GlossaryEditorPage = lazy(() => import('@/features/glossaries/GlossaryEditorPage'));
const ResearchStudiesPage = lazy(() => import('@/features/research/ResearchStudiesPage'));
const ResearchStudyEditorPage = lazy(() => import('@/features/research/ResearchStudyEditorPage'));
const RoadmapsPage = lazy(() => import('@/features/roadmaps/RoadmapsPage'));
const RoadmapEditorPage = lazy(() => import('@/features/roadmaps/RoadmapEditorPage'));
const KnowledgeGraphPage = lazy(() => import('@/features/knowledge/KnowledgeGraphPage'));
const UiUxArchitectureEditorPage = lazy(() => import('@/features/uiUxArchitectures/UiUxArchitectureEditorPage'));
const UiUxArchitecturesPage = lazy(() => import('@/features/uiUxArchitectures/UiUxArchitecturesPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const ExportKnowledgePage = lazy(() => import('@/features/knowledge/ExportKnowledgePage'));
const DashboardPage = lazy(() => import('@/features/workspaces/DashboardPage'));
const WorkspacesPage = lazy(() => import('@/features/workspaces/WorkspacesPage'));

/** Old links used /workspace/:id/...; keep them working. */
function LegacyWorkspaceRedirect() {
  const { workspaceId, '*': rest } = useParams();
  return <Navigate to={`/${workspaceId}/${rest || 'dashboard'}`} replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/workspace/:workspaceId/*" element={<LegacyWorkspaceRedirect />} />
          <Route path="/:workspaceId" element={<WorkspaceLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pyramids" element={<PyramidsPage />} />
            <Route path="pyramid/:pyramidId" element={<PyramidEditorPage />} />
            <Route path="diagrams" element={<DiagramsPage />} />
            <Route path="diagram/:id" element={<DiagramEditorPage />} />
            <Route path="product-definitions" element={<ProductDefinitionsPage />} />
            <Route path="product-definition/:id" element={<ProductDefinitionEditorPage />} />
            <Route path="context-documents" element={<ContextDocumentsPage />} />
            <Route path="context-document/:id" element={<ContextDocumentEditorPage />} />
            <Route path="directory/:id" element={<DirectoryDocumentsPage />} />
            <Route path="technical-architectures" element={<TechnicalArchitecturesPage />} />
            <Route path="technical-architecture/:id" element={<TechnicalArchitectureEditorPage />} />
            <Route path="technical-plans" element={<TechnicalPlansPage />} />
            <Route path="technical-plan/:id" element={<TechnicalPlanEditorPage />} />
            {/* The retired Technical Tasks app now lives on as Technical Plans. */}
            <Route path="technical-tasks" element={<Navigate to="../technical-plans" replace />} />
            <Route path="technical-task/:id" element={<Navigate to="../../technical-plans" replace />} />
            <Route path="design-systems" element={<DesignSystemsPage />} />
            <Route path="design-system/:id" element={<DesignSystemEditorPage />} />
            <Route path="decisions" element={<DecisionsPage />} />
            <Route path="decision/:id" element={<DecisionEditorPage />} />
            <Route path="glossaries" element={<GlossariesPage />} />
            <Route path="glossary/:id" element={<GlossaryEditorPage />} />
            <Route path="research" element={<ResearchStudiesPage />} />
            <Route path="research-study/:id" element={<ResearchStudyEditorPage />} />
            <Route path="roadmaps" element={<RoadmapsPage />} />
            <Route path="roadmap/:id" element={<RoadmapEditorPage />} />
            <Route path="knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="ui-ux-architectures" element={<UiUxArchitecturesPage />} />
            <Route path="ui-ux-architecture/:id" element={<UiUxArchitectureEditorPage />} />
            <Route path="export-knowledge" element={<ExportKnowledgePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/workspaces" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ErrorBoundary>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
