
require('dotenv').config();

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const QLOO_BASE_URL = 'https://hackathon.api.qloo.com';

app.use(express.json());

// Shared helper for requests to Qloo.
async function qlooRequest(path, params = {}) {
  const apiKey = process.env.QLOO_API_KEY;

  if (!apiKey) {
    const error = new Error('Qloo API key is not configured.');
    error.statusCode = 500;
    throw error;
  }

  const url = new URL(path, QLOO_BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });

  const responseBody = await response.text();

  if (!response.ok) {
    console.error(
      `Qloo request failed with HTTP ${response.status}:`,
      responseBody.slice(0, 1000)
    );

    const error = new Error('Qloo API request failed.');
    error.statusCode = 502;
    error.upstreamStatus = response.status;
    throw error;
  }

  try {
    return JSON.parse(responseBody);
  } catch {
    const error = new Error('Qloo returned an invalid JSON response.');
    error.statusCode = 502;
    throw error;
  }
}

// Basic server health check.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TasteTrail AI API',
  });
});

// Movie recommendations based on a supplied taste signal.
// Defaults to Interstellar when entityId is not provided.
app.get('/api/qloo-test', async (req, res) => {
  const defaultEntityId = '057DA9D9-399B-437E-8BCA-A80E499125EF';
  const entityId = req.query.entityId ?? defaultEntityId;

  if (
    typeof entityId !== 'string' ||
    !entityId.trim()
  ) {
    return res.status(400).json({
      error: 'entityId must be a non-empty string.',
    });
  }

  try {
    const data = await qlooRequest('/v2/insights', {
      'filter.type': 'urn:entity:movie',
      'signal.interests.entities': entityId.trim(),
      take: '5',
      'feature.explainability': 'true',
    });

    const entities = Array.isArray(data?.results?.entities)
      ? data.results.entities
      : [];

    const recommendations = entities.map((entity) => ({
      name: entity.name ?? null,
      entityId: entity.entity_id ?? entity.id ?? null,
      type: entity.type ?? null,
      affinity: entity.query?.affinity ?? null,
      disambiguation: entity.disambiguation ?? null,
    }));

    return res.json({
      status: 'ok',
      message: 'Qloo Insights request succeeded.',
      signalEntityId: entityId.trim(),
      count: recommendations.length,
      recommendations,
      explainability: data?.query?.explainability ?? null,
    });
  } catch (error) {
    console.error('Qloo Insights error:', error.message);

    return res.status(error.statusCode || 502).json({
      error: error.message || 'Could not complete the Qloo Insights request.',
      ...(error.upstreamStatus
        ? { upstreamStatus: error.upstreamStatus }
        : {}),
    });
  }
});

// Search Qloo entities by name, with an optional entity-type filter.
app.get('/api/qloo-search', async (req, res) => {
  const query = req.query.query;
  const types = req.query.types;

  if (typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({
      error: 'Provide a search query, e.g. ?query=Interstellar',
    });
  }

  if (
    types !== undefined &&
    (typeof types !== 'string' || !types.trim())
  ) {
    return res.status(400).json({
      error: 'The types parameter must be a non-empty string.',
    });
  }

  try {
    const params = {
      query: query.trim(),
    };

    if (typeof types === 'string' && types.trim()) {
      params.types = types.trim();
    }

    const data = await qlooRequest('/search', params);

    return res.json(data);
  } catch (error) {
    console.error('Qloo Search error:', error.message);

    return res.status(error.statusCode || 502).json({
      error: error.message || 'Could not complete the Qloo search request.',
      ...(error.upstreamStatus
        ? { upstreamStatus: error.upstreamStatus }
        : {}),
    });
  }
});

app.listen(PORT, () => {
  console.log(`TasteTrail AI API running on port ${PORT}`);
});
