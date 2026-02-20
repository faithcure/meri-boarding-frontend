import { config } from './config.js';

async function qdrantRequest(path, options = {}) {
  const response = await fetch(`${config.qdrantUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Qdrant request failed (${response.status}) ${path}: ${body}`);
  }

  return response.json();
}

export async function qdrantHealth() {
  const response = await fetch(`${config.qdrantUrl}/healthz`);
  return response.ok;
}

export async function ensureCollection(vectorSize) {
  try {
    await qdrantRequest(`/collections/${config.qdrantCollection}`);
    return;
  } catch (err) {
    const message = String(err?.message || '');
    if (!message.includes('(404)')) {
      throw err;
    }
  }

  await qdrantRequest(`/collections/${config.qdrantCollection}`, {
    method: 'PUT',
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: 'Cosine'
      }
    })
  });
}

export async function upsertPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return;

  await qdrantRequest(`/collections/${config.qdrantCollection}/points?wait=true`, {
    method: 'PUT',
    body: JSON.stringify({ points })
  });
}

export async function searchPoints(vector, options = {}) {
  const limit = Number(options.limit || config.ragTopK);
  const locale = String(options.locale || '').trim();

  const body = {
    vector,
    limit,
    with_payload: true,
    with_vector: false
  };

  if (locale) {
    body.filter = {
      must: [
        {
          key: 'locale',
          match: { value: locale }
        }
      ]
    };
  }

  const data = await qdrantRequest(`/collections/${config.qdrantCollection}/points/search`, {
    method: 'POST',
    body: JSON.stringify(body)
  });

  return Array.isArray(data?.result) ? data.result : [];
}
