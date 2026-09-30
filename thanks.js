// netlify/functions/thanks.js
//
// GET  /api/thanks            -> { "Teacher Name": 3, "Other Teacher": 1, ... }
// POST /api/thanks  { "teacher": "Teacher Name" } -> { "teacher": "...", "count": 4 }
//
// Uses Netlify Blobs, which needs no setup or credentials when this function
// runs on Netlify itself (the site ID/token are injected automatically).

const { connectLambda, getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  connectLambda(event); // required for Lambda-compatible functions (exports.handler)
  const store = getStore('teacher-thanks');

  if (event.httpMethod === 'GET') {
    const { blobs } = await store.list();
    const counts = {};
    await Promise.all(
      blobs.map(async (b) => {
        const raw = await store.get(b.key);
        counts[decodeURIComponent(b.key)] = parseInt(raw || '0', 10);
      })
    );
    return { statusCode: 200, headers, body: JSON.stringify(counts) };
  }

  if (event.httpMethod === 'POST') {
    let teacher;
    try {
      teacher = JSON.parse(event.body || '{}').teacher;
    } catch (e) {
      // fall through to validation error below
    }
    if (!teacher || typeof teacher !== 'string' || !teacher.trim() || teacher.length > 150) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'invalid teacher name' }) };
    }
    teacher = teacher.trim();
    const key = encodeURIComponent(teacher);
    const current = parseInt((await store.get(key)) || '0', 10);
    const next = current + 1;
    await store.set(key, String(next));
    return { statusCode: 200, headers, body: JSON.stringify({ teacher, count: next }) };
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'method not allowed' }) };
};
