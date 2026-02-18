import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Folder, ArrowLeft, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDirectory, getDirectoryDocuments } from '../services/directoryService';
import { deleteContextDocument } from '../services/contextDocumentService';
import { ContextDocument, Directory } from '../types';
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

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

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, title: string } | null>(null);

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

  const handleDelete = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget({ id, title });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
        await deleteContextDocument(deleteTarget.id);
        setDocuments(prev => prev.filter(d => d.id !== deleteTarget.id));
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    } catch (error) {
        console.error("Failed to delete document", error);
        alert("Failed to delete document");
    }
  };

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
                  <div className="flex gap-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                        onClick={(e) => handleDelete(doc.id, doc.title, e)}
                    >
                        <Trash2 size={16} />
                    </Button>
                    <Button variant="secondary" size="sm" className="h-8 cursor-pointer" onClick={() => navigate(`/context-document/${doc.id}`)}>
                        Open
                    </Button>
                  </div>
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
        
        <DeleteConfirmDialog 
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Document"
          description="This action cannot be undone. This will permanently delete the document."
          itemName={deleteTarget?.title || ''}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
};

export default DirectoryDocumentsPage;
