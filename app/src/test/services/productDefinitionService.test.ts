import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createProductDefinition,
} from '../../services/productDefinitionService';
import {
  DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID,
  SHAPE_UP_METHOD_TEMPLATE_ID,
  BLANK_PRODUCT_DEFINITION_TEMPLATE_ID,
  getProductDefinitionTemplateById,
} from '../../services/productDefinitionTemplates';

vi.mock('../../services/storage', () => {
  return {
    storage: {
      createId: vi.fn(() => 'test-id'),
      save: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      query: vi.fn(),
    },
  };
});

import { storage } from '../../services/storage';

describe('productDefinitionService.createProductDefinition', () => {
  const userId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses default template when no templateId is provided', async () => {
    const id = await createProductDefinition(userId, 'Test Definition');

    expect(id).toBe('test-id');
    expect(storage.save).toHaveBeenCalledTimes(1);

    const [, savedDoc] = (storage.save as any).mock.calls[0];
    const defaultTemplate = getProductDefinitionTemplateById(
      DEFAULT_PRODUCT_DEFINITION_TEMPLATE_ID,
    );

    expect(savedDoc.id).toBe('test-id');
    expect(savedDoc.userId).toBe(userId);
    expect(savedDoc.title).toBe('Test Definition');
    expect(savedDoc.data).toEqual(defaultTemplate?.data);
  });

  it('uses explicit template when templateId is provided', async () => {
    await createProductDefinition(
      userId,
      'Shape Up PD',
      undefined,
      SHAPE_UP_METHOD_TEMPLATE_ID,
    );

    const [, savedDoc] = (storage.save as any).mock.calls[0];
    const tpl = getProductDefinitionTemplateById(
      SHAPE_UP_METHOD_TEMPLATE_ID,
    );

    expect(savedDoc.data).toEqual(tpl?.data);
  });

  it('falls back to blank template for unknown templateId', async () => {
    await createProductDefinition(
      userId,
      'Unknown Template PD',
      undefined,
      'does-not-exist',
    );

    const [, savedDoc] = (storage.save as any).mock.calls[0];
    const blankTpl = getProductDefinitionTemplateById(
      BLANK_PRODUCT_DEFINITION_TEMPLATE_ID,
    );

    expect(savedDoc.data).toEqual(blankTpl?.data);
  });
});

