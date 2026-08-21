export type InsertedBlock = 
  | { id: string; type: 'image'; url: string; width?: string; align?: 'left' | 'center' | 'right' }
  | { id: string; type: 'split'; name: string };

export function migrateToInsertedBlocks(images: any, splits: any, names: any): Record<string, InsertedBlock[]> {
  const blocks: Record<string, InsertedBlock[]> = {};
  const allIds = new Set<string>();
  if (images) Object.keys(images).forEach(k => allIds.add(k));
  if (splits) {
    if (Array.isArray(splits)) splits.forEach(k => allIds.add(k));
    else if (splits.forEach) splits.forEach((k: string) => allIds.add(k));
  }
  
  allIds.forEach(id => {
    blocks[id] = [];
    if (images && images[id]) {
      images[id].forEach((img: any) => {
        blocks[id].push({
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'image',
          url: img.url || img,
          width: img.width,
          align: img.align
        });
      });
    }
    const hasSplit = Array.isArray(splits) ? splits.includes(id) : splits?.has?.(id);
    if (hasSplit) {
      blocks[id].push({
        id: `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'split',
        name: names?.[id] || ''
      });
    }
  });
  return blocks;
}

export function extractOldFormat(blocks: Record<string, InsertedBlock[]>) {
  const insertedImages: Record<string, any[]> = {};
  const splitPoints: string[] = [];
  const sectionNames: Record<string, string> = {};

  Object.entries(blocks).forEach(([logId, arr]) => {
    arr.forEach(block => {
      if (block.type === 'image') {
        if (!insertedImages[logId]) insertedImages[logId] = [];
        insertedImages[logId].push({ url: block.url, width: block.width, align: block.align });
      } else if (block.type === 'split') {
        if (!splitPoints.includes(logId)) {
          splitPoints.push(logId);
          sectionNames[logId] = block.name;
        }
      }
    });
  });

  return { insertedImages, splitPoints, sectionNames };
}
