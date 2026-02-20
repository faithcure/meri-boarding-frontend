import dotenv from 'dotenv';

dotenv.config();

function intEnv(name, fallback) {
  const raw = String(process.env[name] ?? '').trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export const config = {
  host: String(process.env.RAG_HOST || '0.0.0.0').trim(),
  port: intEnv('RAG_PORT', 4100),

  qdrantUrl: String(process.env.QDRANT_URL || 'http://qdrant:6333').trim().replace(/\/+$/, ''),
  qdrantCollection: String(process.env.QDRANT_COLLECTION || 'meri_content_chunks').trim(),

  mongoUri: String(process.env.MONGODB_URI || 'mongodb://mongo:27017').trim(),
  mongoDb: String(process.env.MONGODB_DB || 'meri_boarding').trim(),

  groqApiKey: String(process.env.GROQ_API_KEY || '').trim(),
  groqModel: String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim(),
  groqEmbedModel: String(process.env.GROQ_EMBED_MODEL || '').trim(),

  embeddingProvider: String(process.env.EMBEDDING_PROVIDER || 'local').trim().toLowerCase(),
  embeddingDim: intEnv('EMBEDDING_DIM', 384),

  ragTopK: intEnv('RAG_TOP_K', 5),
  ragMaxContextChunks: intEnv('RAG_MAX_CONTEXT_CHUNKS', 6),
  ragChunkSize: intEnv('RAG_CHUNK_SIZE', 900),
  ragChunkOverlap: intEnv('RAG_CHUNK_OVERLAP', 120)
};
