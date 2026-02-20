import dotenv from 'dotenv';
import crypto from 'node:crypto';
import { MongoClient } from 'mongodb';
import { config } from '../src/config.js';
import { chunkText, toSearchText } from '../src/chunker.js';
import { embedText } from '../src/embedding.js';
import { ensureCollection, upsertPoints } from '../src/qdrant.js';

dotenv.config();

function contentUrlForKey(key, locale) {
  const prefix = locale && locale !== 'en' ? `/${locale}` : '';
  if (key === 'page.home') return `${prefix}/` || '/';
  if (key === 'page.services') return `${prefix}/services`;
  if (key === 'page.amenities') return `${prefix}/amenities`;
  if (key === 'page.reservation') return `${prefix}/reservation`;
  if (key === 'page.contact') return `${prefix}/contact`;
  return `${prefix}/`;
}

function stablePointId(input) {
  const hash = crypto.createHash('sha1').update(input).digest('hex');
  const chars = hash.slice(0, 32).split('');
  // UUID v5-like deterministic format derived from hash.
  chars[12] = '5';
  const variantNibble = parseInt(chars[16], 16);
  chars[16] = ((variantNibble & 0x3) | 0x8).toString(16);
  const hex = chars.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function loadContentEntries(db) {
  const rows = await db.collection('content_entries').find(
    {},
    {
      projection: {
        _id: 0,
        key: 1,
        locale: 1,
        value: 1,
        updatedAt: 1
      }
    }
  ).toArray();

  return rows.map((row) => ({
    sourceId: `content:${row.key}:${row.locale}`,
    title: `${row.key} (${row.locale})`,
    locale: String(row.locale || 'en'),
    url: contentUrlForKey(String(row.key || ''), String(row.locale || 'en')),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    text: toSearchText(row.value)
  })).filter((doc) => doc.text && doc.text.length > 20);
}

async function loadHotels(db) {
  const rows = await db.collection('hotels').find(
    { active: { $ne: false } },
    {
      projection: {
        _id: 0,
        slug: 1,
        locales: 1,
        updatedAt: 1
      }
    }
  ).toArray();

  const docs = [];

  for (const row of rows) {
    const slug = String(row.slug || '').trim();
    if (!slug) continue;

    for (const locale of ['en', 'de', 'tr']) {
      const data = row?.locales?.[locale];
      if (!data || typeof data !== 'object') continue;
      const text = toSearchText(data);
      if (!text || text.length < 20) continue;
      docs.push({
        sourceId: `hotel:${slug}:${locale}`,
        title: `hotel.${slug} (${locale})`,
        locale,
        url: locale === 'en' ? `/hotels/${slug}` : `/${locale}/hotels/${slug}`,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        text
      });
    }
  }

  return docs;
}

async function main() {
  const mongo = new MongoClient(config.mongoUri);
  await mongo.connect();

  try {
    const db = mongo.db(config.mongoDb);
    const docs = [
      ...(await loadContentEntries(db)),
      ...(await loadHotels(db))
    ];

    if (docs.length === 0) {
      console.log('[index] no source docs found.');
      return;
    }

    console.log(`[index] loaded source docs: ${docs.length}`);

    const chunkRows = [];

    for (const doc of docs) {
      const chunks = chunkText(doc.text);
      for (let i = 0; i < chunks.length; i += 1) {
        chunkRows.push({
          ...doc,
          chunkIndex: i,
          text: chunks[i]
        });
      }
    }

    if (chunkRows.length === 0) {
      console.log('[index] no chunks generated.');
      return;
    }

    console.log(`[index] generated chunks: ${chunkRows.length}`);

    const sampleVector = await embedText(chunkRows[0].text);
    await ensureCollection(sampleVector.length);

    const BATCH_SIZE = 32;

    for (let i = 0; i < chunkRows.length; i += BATCH_SIZE) {
      const batch = chunkRows.slice(i, i + BATCH_SIZE);
      const points = [];

      for (const row of batch) {
        const vector = await embedText(row.text);
        points.push({
          id: stablePointId(`${row.sourceId}:${row.chunkIndex}`),
          vector,
          payload: {
            sourceId: row.sourceId,
            title: row.title,
            locale: row.locale,
            url: row.url,
            updatedAt: row.updatedAt,
            chunkIndex: row.chunkIndex,
            text: row.text
          }
        });
      }

      await upsertPoints(points);
      console.log(`[index] upserted ${Math.min(i + BATCH_SIZE, chunkRows.length)} / ${chunkRows.length}`);
    }

    console.log('[index] done');
  } finally {
    await mongo.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
