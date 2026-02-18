import React from 'react';
import { useGlobalContext } from '../../contexts/GlobalContext';
import ContextSelectorModal from './ContextSelectorModal';

const GlobalContextManager: React.FC = () => {
  const { 
    isContextModalOpen, 
    setIsContextModalOpen, 
    selectedSources, 
    setSelectedSources 
  } = useGlobalContext();

  const handleSave = (sources: any[]) => {
    setSelectedSources(sources);
    setIsContextModalOpen(false);
  };

  return (
    <ContextSelectorModal
      isOpen={isContextModalOpen}
      onClose={() => setIsContextModalOpen(false)}
      onSave={handleSave}
      initialSelectedSources={selectedSources}
      currentDefinitionId={null}
    />
  );
};

export default GlobalContextManager;
