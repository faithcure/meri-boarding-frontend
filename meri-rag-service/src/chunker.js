import { config } from './config.js';

export function chunkText(input, options = {}) {
  const maxLen = Number(options.maxLen || config.ragChunkSize);
  const overlap = Number(options.overlap || config.ragChunkOverlap);
  const text = String(input || '').replace(/\s+/g, ' ').trim();

  if (!text) return [];
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxLen, text.length);
    if (end < text.length) {
      const probeStart = Math.max(start + Math.floor(maxLen * 0.6), start);
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > probeStart) {
        end = lastSpace;
      }
    }

    const piece = text.slice(start, end).trim();
    if (piece) chunks.push(piece);

    if (end >= text.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

export function toSearchText(value, level = 0) {
  if (level > 6 || value == null) return '';

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSearchText(item, level + 1)).filter(Boolean).join('\n');
  }

  if (typeof value === 'object') {
    const parts = [];
    for (const [key, item] of Object.entries(value)) {
      const nested = toSearchText(item, level + 1);
      if (!nested) continue;
      parts.push(`${key}: ${nested}`);
    }
    return parts.join('\n');
  }

  return '';
}
