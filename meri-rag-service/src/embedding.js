import { config } from './config.js';

function stableHash(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeVector(vector) {
  let sumSquares = 0;
  for (let i = 0; i < vector.length; i += 1) {
    sumSquares += vector[i] * vector[i];
  }
  const norm = Math.sqrt(sumSquares) || 1;
  for (let i = 0; i < vector.length; i += 1) {
    vector[i] = vector[i] / norm;
  }
  return vector;
}

function localEmbedding(text) {
  const dim = config.embeddingDim;
  const vector = new Array(dim).fill(0);
  const normalized = String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const baseHash = stableHash(token);
    const index = baseHash % dim;
    const sign = ((baseHash >>> 8) & 1) === 0 ? 1 : -1;
    vector[index] += sign;

    if (token.length > 3) {
      for (let i = 0; i <= token.length - 3; i += 1) {
        const ngram = token.slice(i, i + 3);
        const nHash = stableHash(ngram);
        const nIndex = nHash % dim;
        vector[nIndex] += (((nHash >>> 9) & 1) === 0 ? 0.25 : -0.25);
      }
    }
  }

  return normalizeVector(vector);
}

async function groqEmbedding(text) {
  if (!config.groqApiKey || !config.groqEmbedModel) {
    throw new Error('GROQ embedding is selected but GROQ_API_KEY / GROQ_EMBED_MODEL is missing.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/embeddings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.groqApiKey}`
    },
    body: JSON.stringify({
      model: config.groqEmbedModel,
      input: String(text || '')
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq embedding failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('Groq embedding response is empty.');
  }

  return normalizeVector(vector.map((x) => Number(x) || 0));
}

export async function embedText(text) {
  const provider = config.embeddingProvider;
  if (provider === 'groq') {
    try {
      return await groqEmbedding(text);
    } catch (err) {
      console.warn('[embedding] groq failed, falling back to local:', err?.message || err);
      return localEmbedding(text);
    }
  }
  return localEmbedding(text);
}
