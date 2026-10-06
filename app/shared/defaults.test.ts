import { describe, expect, it } from 'vitest';
import { createDefaultTechnicalArchitecture } from './technicalArchitecture';
import { createDefaultUiUxArchitecture } from './uiUxArchitecture';
import { createDefaultTaskData } from './technicalTask';
import { TECHNICAL_ARCHITECTURE_SECTIONS } from './types/technicalArchitecture';

describe('document defaults', () => {
  it('technical architectures have every section', () => {
    const arch = createDefaultTechnicalArchitecture(new Date('2026-01-02T10:00:00Z'));
    expect(Object.keys(arch).sort()).toEqual([...TECHNICAL_ARCHITECTURE_SECTIONS].sort());
    expect(arch.metadata.last_updated).toBe('2026-01-02');
  });

  it('UI/UX architectures start with no pages, and no theme or components (a design system holds those)', () => {
    const ux = createDefaultUiUxArchitecture();
    expect(ux.pages).toEqual([]);
    expect(ux).not.toHaveProperty('base_components');
    expect(ux).not.toHaveProperty('theme_specification');
  });

  it('legacy task data records type, architecture and a pending medium-priority status', () => {
    const data = createDefaultTaskData({
      title: 'Fix login',
      type: 'FIX_TASK',
      architectureRef: 'arch-1',
      now: new Date('2026-01-02T10:00:00Z'),
    });
    expect(data.task_metadata).toMatchObject({
      task_type: 'FIX_TASK',
      parent_architecture_ref: 'arch-1',
      priority: 'MEDIUM',
      status: 'PENDING',
      created_at: '2026-01-02T10:00:00.000Z',
    });
    expect(data.description.main.title).toBe('Fix login');
  });
});
