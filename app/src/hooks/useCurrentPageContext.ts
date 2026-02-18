import { useState, useEffect } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { getPyramid } from '../services/pyramidService';
import { getProductDefinition } from '../services/productDefinitionService';
import { getContextDocument } from '../services/contextDocumentService';
import { getTechnicalArchitecture } from '../services/technicalArchitectureService';
import { getUiUxArchitecture } from '../services/uiUxArchitectureService';
import { getTechnicalTask } from '../services/technicalTaskService';
import { getDiagram } from '../services/diagramService';
import { getDirectory } from '../services/directoryService';

export const useCurrentPageContext = () => {
    const location = useLocation();
    const [context, setContext] = useState<string>("");
    const [title, setTitle] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchContext = async () => {
            // Check if we are in a detail view
            const pyramidMatch = matchPath("/pyramid/:id", location.pathname);
            const productMatch = matchPath("/product-definition/:id", location.pathname);
            const docMatch = matchPath("/context-document/:id", location.pathname);
            const techMatch = matchPath("/technical-architecture/:id", location.pathname);
            const uiUxMatch = matchPath("/ui-ux-architecture/:id", location.pathname);
            const taskMatch = matchPath("/technical-task/:id", location.pathname);
            const diagramMatch = matchPath("/diagram/:id", location.pathname);
            const directoryMatch = matchPath("/directory/:id", location.pathname);

            // If no match, reset
            if (!pyramidMatch && !productMatch && !docMatch && !techMatch && !uiUxMatch && !taskMatch && !diagramMatch && !directoryMatch) {
                setContext("");
                setTitle("");
                return;
            }

            setIsLoading(true);
            try {
                if (pyramidMatch?.params.id) {
                    const data = await getPyramid(pyramidMatch.params.id);
                    if (data) {
                        setTitle(`Pyramid: ${data.title}`);
                        setContext(`CURRENT PYRAMID CONTEXT:\nTitle: ${data.title}\nDescription: ${data.context || ''}\nBlocks Structure: ${JSON.stringify(Object.values(data.blocks || {}).map(b => ({title: b.title, question: b.question, answer: b.answer})), null, 2)}`);
                    }
                } else if (productMatch?.params.id) {
                    const data = await getProductDefinition(productMatch.params.id);
                    if (data) {
                        setTitle(`Product Definition: ${data.title}`);
                        setContext(`CURRENT PRODUCT DEFINITION CONTEXT:\nTitle: ${data.title}\nData: ${JSON.stringify(data.data, null, 2)}`);
                    }
                } else if (docMatch?.params.id) {
                    const data = await getContextDocument(docMatch.params.id);
                    if (data) {
                        setTitle(`Document: ${data.title}`);
                        setContext(`CURRENT DOCUMENT CONTEXT:\nTitle: ${data.title}\nContent: ${data.content}`);
                    }
                } else if (techMatch?.params.id) {
                    const data = await getTechnicalArchitecture(techMatch.params.id);
                    if (data) {
                        setTitle(`Tech Arch: ${data.title}`);
                        setContext(`CURRENT TECHNICAL ARCHITECTURE CONTEXT:\nTitle: ${data.title}\nData: ${JSON.stringify(data.data, null, 2)}`);
                    }
                } else if (uiUxMatch?.params.id) {
                    const data = await getUiUxArchitecture(uiUxMatch.params.id);
                    if (data) {
                        setTitle(`UI/UX Arch: ${data.title}`);
                        setContext(`CURRENT UI/UX ARCHITECTURE CONTEXT:\nTitle: ${data.title}\nData: ${JSON.stringify(data.data, null, 2)}`);
                    }
                } else if (taskMatch?.params.id) {
                    const data = await getTechnicalTask(taskMatch.params.id);
                    if (data) {
                        setTitle(`Task: ${data.title}`);
                        setContext(`CURRENT TECHNICAL TASK CONTEXT:\nTitle: ${data.title}\nDescription: ${data.description}\nStatus: ${data.status}\nPriority: ${data.priority}\nType: ${data.type}`);
                    }
                } else if (diagramMatch?.params.id) {
                    const data = await getDiagram(diagramMatch.params.id);
                    if (data) {
                        setTitle(`Diagram: ${data.title}`);
                        setContext(`CURRENT DIAGRAM CONTEXT:\nTitle: ${data.title}\nNodes: ${JSON.stringify(data.nodes)}\nEdges: ${JSON.stringify(data.edges)}`);
                    }
                } else if (directoryMatch?.params.id) {
                     const data = await getDirectory(directoryMatch.params.id);
                     if (data) {
                         setTitle(`Directory: ${data.title}`);
                         let docsContext = "";
                         if (user) {
                            try {
                                const docs = await getDirectoryDocuments(user.uid, directoryMatch.params.id);
                                if (docs && docs.length > 0) {
                                    docsContext = "\nDocuments in this directory:\n" + docs.map(d => `- ${d.title} (${d.type}): ${d.content?.substring(0, 200)}...`).join("\n");
                                } else {
                                    docsContext = "\n(No documents in this directory)";
                                }
                            } catch (err) {
                                console.error("Failed to fetch directory documents", err);
                            }
                         }
                         setContext(`CURRENT DIRECTORY CONTEXT:\nTitle: ${data.title}${docsContext}`);
                     }
                }
            } catch (error) {
                console.error("Failed to fetch page context:", error);
                setContext("");
                setTitle("");
            } finally {
                setIsLoading(false);
            }
        };

        fetchContext();
    }, [location.pathname]);

    return { context, title, isLoading };
};
