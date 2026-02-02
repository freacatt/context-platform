import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Folder, ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDirectory, getDirectoryDocuments } from '../services/directoryService';
import { ContextDocument, Directory } from '../types';

import { useWorkspace } from '../contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const DirectoryDocumentsPage: React.FC = () => {
  const { id: directoryId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [directory, setDirectory] = useState<Directory | null>(null);
  const [documents, setDocuments] = useState<ContextDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !directoryId || !currentWorkspace) return;
      try {
        const dir = await getDirectory(directoryId);
        setDirectory(dir);
        const docs = await getDirectoryDocuments(user.uid, directoryId, currentWorkspace.id);
        setDocuments(docs);
      } catch (e) {
        console.error('Failed to load directory page', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, directoryId, currentWorkspace]);

  return (
    <div className="h-full flex-grow bg-background">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8 mt-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/context-documents')} className="cursor-pointer">
              <ArrowLeft size={18} />
            </Button>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Folder size={20} className="text-indigo-600 dark:text-indigo-400" />
                {directory ? directory.title : 'Directory'}
            </h1>
          </div>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow flex flex-col h-full">
                <Link to={`/context-document/${doc.id}`} className="block flex-grow p-0">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={20} className="text-amber-500" />
                        <h3 className="font-semibold text-lg truncate">{doc.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {doc.content ? doc.content.substring(0, 100) + '...' : 'No content yet.'}
                      </p>
                    </div>
                  </CardContent>
                </Link>
                <div className="flex justify-between items-center p-3 pt-0 border-t mt-auto pt-2">
                  <span className="text-xs text-muted-foreground">
                    Last modified: {(() => {
                      if (!doc.lastModified) return '';
                      const date = doc.lastModified instanceof Date ? doc.lastModified : new Date(doc.lastModified);
                      return date.toLocaleDateString();
                    })()}
                  </span>
                  <Button variant="secondary" size="sm" className="cursor-pointer" onClick={() => navigate(`/context-document/${doc.id}`)}>
                    Open
                  </Button>
                </div>
              </Card>
            ))}
            {documents.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <p className="text-muted-foreground">No documents in this directory.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectoryDocumentsPage;
