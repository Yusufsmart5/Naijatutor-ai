// netlify/functions/chat.js
//
// This function receives a prompt from the NaijaTutor AI frontend,
// forwards it to Google's Gemini API using your private API key
// (kept safely on the server, never exposed to the browser),
// and returns the explanation text back to the app.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt } = JSON.parse(event.body || '{}');
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'GEMINI_API_KEY is not set in Netlify environment variables' })
      };
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      return { statusCode: geminiResponse.status, body: JSON.stringify({ error: errText }) };
    }

    const data = await geminiResponse.json();
    const explanation = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!explanation) {
      return { statusCode: 502, body: JSON.stringify({ error: 'No explanation returned from Gemini' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ explanation })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
