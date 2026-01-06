import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Box, Flex, Heading, Text, Card, Button, IconButton } from '@radix-ui/themes';
import { Folder, ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDirectory, getDirectoryDocuments } from '../services/directoryService';
import { ContextDocument, Directory } from '../types';

const DirectoryDocumentsPage: React.FC = () => {
  const { directoryId } = useParams<{ directoryId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [directory, setDirectory] = useState<Directory | null>(null);
  const [documents, setDocuments] = useState<ContextDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !directoryId) return;
      try {
        const dir = await getDirectory(directoryId);
        setDirectory(dir);
        const docs = await getDirectoryDocuments(user.uid, directoryId);
        setDocuments(docs);
      } catch (e) {
        console.error('Failed to load directory page', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, directoryId]);

  return (
    <Box className="h-full flex-grow bg-white">
      <Container size="4" className="p-4">
        <Flex justify="between" align="center" className="mb-8 mt-6">
          <Flex align="center" gap="3">
            <IconButton variant="ghost" onClick={() => navigate('/context-documents')} className="cursor-pointer">
              <ArrowLeft size={18} />
            </IconButton>
            <Heading size="6" className="text-gray-800">
              <Flex align="center" gap="2">
                <Folder size={20} className="text-indigo-600" />
                {directory ? directory.title : 'Directory'}
              </Flex>
            </Heading>
          </Flex>
        </Flex>

        {loading ? (
          <Text>Loading…</Text>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow border border-gray-200 flex flex-col">
                <Link to={`/context-document/${doc.id}`} className="block flex-grow">
                  <Flex direction="column" height="100%" justify="between" p="3">
                    <Box>
                      <Flex align="center" gap="2" mb="2">
                        <FileText size={20} className="text-amber-500" />
                        <Heading size="3">{doc.title}</Heading>
                      </Flex>
                      <Text size="2" color="gray" className="line-clamp-3">
                        {doc.content ? doc.content.substring(0, 100) + '...' : 'No content yet.'}
                      </Text>
                    </Box>
                  </Flex>
                </Link>
                <Flex justify="between" align="center" p="3" pt="0" className="border-t border-gray-100 mt-2 pt-2">
                  <Text size="1" color="gray">
                    Last modified: {(() => {
                      if (!doc.lastModified) return '';
                      const date = doc.lastModified instanceof Date ? doc.lastModified : new Date(doc.lastModified);
                      return date.toLocaleDateString();
                    })()}
                  </Text>
                  <Button variant="soft" color="gray" className="cursor-pointer" onClick={() => navigate(`/context-document/${doc.id}`)}>
                    Open
                  </Button>
                </Flex>
              </Card>
            ))}
            {documents.length === 0 && (
              <Box className="col-span-full py-12 text-center">
                <Text color="gray">No documents in this directory.</Text>
              </Box>
            )}
          </div>
        )}
      </Container>
    </Box>
  );
};

export default DirectoryDocumentsPage;
