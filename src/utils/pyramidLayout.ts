export const BLOCK_SIZE = 80;
export const SPACING_X = 113;
export const SPACING_Y = 113;

export interface Coordinates {
  x: number;
  y: number;
}

export interface Block {
    id: string;
    u: number;
    v: number;
    type: string;
    content: string;
    parentIds: string[];
    childIds: string[];
}

export const calculateCoordinates = (u: number, v: number): Coordinates => {
  return {
    x: (v - u) * (SPACING_X / 2),
    y: (u + v) * (SPACING_Y / 2)
  };
};

export const generateBlockId = (u: number, v: number): string => {
  return `${u}-${v}`;
};

export const parseBlockId = (id: string): { u: number; v: number } => {
  const [u, v] = id.split('-').map(Number);
  return { u, v };
};

export const createBlock = (u: number, v: number, type: string = 'question'): Block => {
  const childIds = [
      generateBlockId(u + 1, v),
      generateBlockId(u, v + 1)
  ];
  
  const parentIds = [];
  if (u > 0) parentIds.push(generateBlockId(u - 1, v));
  if (v > 0) parentIds.push(generateBlockId(u, v - 1));

  return {
    id: generateBlockId(u, v),
    u,
    v,
    type,
    content: '',
    parentIds,
    childIds
  };
};

export const getRowIndex = (u: number, v: number): number => u + v;
