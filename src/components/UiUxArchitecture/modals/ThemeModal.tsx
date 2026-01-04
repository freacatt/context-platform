import React, { useState, useEffect } from 'react';
import { Dialog, Button, Flex, Text, TextField, Tabs, Box, Grid, Heading, TextArea } from '@radix-ui/themes';
import { ThemeSpecification } from '../../../types/uiUxArchitecture';

interface ThemeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: ThemeSpecification;
  onSave: (theme: ThemeSpecification) => void;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({ open, onOpenChange, theme, onSave }) => {
  const [localTheme, setLocalTheme] = useState<ThemeSpecification>(theme);

  useEffect(() => {
    setLocalTheme(theme);
  }, [theme, open]);

  const handleChange = (path: string[], value: string) => {
    setLocalTheme(prev => {
      const newTheme = JSON.parse(JSON.stringify(prev));
      let current = newTheme;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newTheme;
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 800 }}>
        <Dialog.Title>Edit Theme Specification</Dialog.Title>
        <Dialog.Description size="2" mb="4" color="gray">
          Configure the global design system, typography, and color palette.
        </Dialog.Description>
        
        <Tabs.Root defaultValue="colors">
          <Tabs.List>
            <Tabs.Trigger value="colors">Colors</Tabs.Trigger>
            <Tabs.Trigger value="typography">Typography</Tabs.Trigger>
            <Tabs.Trigger value="spacing">Spacing & Radius</Tabs.Trigger>
            <Tabs.Trigger value="advanced">Advanced</Tabs.Trigger>
          </Tabs.List>

          <Box pt="3">
            <Tabs.Content value="colors">
              <Grid columns="2" gap="3">
                {Object.keys(localTheme.main.colors).map((key) => (
                  <Box key={key}>
                    <Text size="2" mb="1" style={{ textTransform: 'capitalize' }}>{key}</Text>
                    <Flex gap="2">
                      <TextField.Root 
                        value={(localTheme.main.colors as any)[key]} 
                        onChange={e => handleChange(['main', 'colors', key], e.target.value)}
                        placeholder="#000000"
                        style={{ flex: 1 }}
                      />
                      <div 
                        style={{ 
                          width: 32, 
                          height: 32, 
                          backgroundColor: (localTheme.main.colors as any)[key],
                          border: '1px solid #ccc',
                          borderRadius: 4
                        }} 
                      />
                    </Flex>
                  </Box>
                ))}
              </Grid>
            </Tabs.Content>

            <Tabs.Content value="typography">
              <Flex direction="column" gap="3">
                <Box>
                  <Text size="2" mb="1">Font Family</Text>
                  <TextField.Root 
                    value={localTheme.main.typography.font_family} 
                    onChange={e => handleChange(['main', 'typography', 'font_family'], e.target.value)}
                  />
                </Box>
                <Box>
                  <Text size="2" mb="1">Base Font Size</Text>
                  <TextField.Root 
                    value={localTheme.main.typography.font_size_base} 
                    onChange={e => handleChange(['main', 'typography', 'font_size_base'], e.target.value)}
                  />
                </Box>
                
                <Box>
                  <Text size="2" mb="1">Theme Description</Text>
                  <TextArea 
                    value={localTheme.main.description || ''} 
                    onChange={e => handleChange(['main', 'description'], e.target.value)}
                    placeholder="Describe the overall theme and design philosophy..."
                    style={{ minHeight: 80, resize: 'vertical' }}
                  />
                </Box>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="spacing">
              <Flex direction="column" gap="3">
                <Box>
                  <Text size="2" mb="1">Spacing Unit</Text>
                  <TextField.Root 
                    value={localTheme.main.spacing_unit} 
                    onChange={e => handleChange(['main', 'spacing_unit'], e.target.value)}
                  />
                </Box>
                <Box>
                  <Heading size="3" mb="2">Border Radius</Heading>
                  <Grid columns="3" gap="3">
                    {Object.keys(localTheme.main.border_radius).map((key) => (
                      <Box key={key}>
                        <Text size="2" mb="1">{key.toUpperCase()}</Text>
                        <TextField.Root 
                          value={(localTheme.main.border_radius as any)[key]} 
                          onChange={e => handleChange(['main', 'border_radius', key], e.target.value)}
                        />
                      </Box>
                    ))}
                  </Grid>
                </Box>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="advanced">
              <Flex direction="column" gap="3">
                <Heading size="3">Breakpoints</Heading>
                <Grid columns="3" gap="3">
                  {Object.keys(localTheme.advanced.breakpoints).map((key) => (
                    <Box key={key}>
                      <Text size="2" mb="1" style={{ textTransform: 'capitalize' }}>{key}</Text>
                      <TextField.Root 
                        value={(localTheme.advanced.breakpoints as any)[key]} 
                        onChange={e => handleChange(['advanced', 'breakpoints', key], e.target.value)}
                      />
                    </Box>
                  ))}
                </Grid>
                
                <Heading size="3" mt="3">Shadows</Heading>
                <Grid columns="3" gap="3">
                  {Object.keys(localTheme.advanced.shadows).map((key) => (
                    <Box key={key}>
                      <Text size="2" mb="1" style={{ textTransform: 'capitalize' }}>{key}</Text>
                      <TextField.Root 
                        value={(localTheme.advanced.shadows as any)[key]} 
                        onChange={e => handleChange(['advanced', 'shadows', key], e.target.value)}
                      />
                    </Box>
                  ))}
                </Grid>
              </Flex>
            </Tabs.Content>
          </Box>
        </Tabs.Root>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">Cancel</Button>
          </Dialog.Close>
          <Button onClick={() => onSave(localTheme)}>Save Changes</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
