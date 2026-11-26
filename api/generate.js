module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API manquante côté serveur' });
  }

  const { platform, item, condition, price, details } = req.body || {};
  if (!item || typeof item !== 'string' || item.length > 200) {
    return res.status(400).json({ error: 'Objet invalide' });
  }

  const clean = (s, max) => String(s || '').slice(0, max);
  const prompt = `Tu es un expert de la vente d'occasion en France.
Rédige une annonce ${clean(platform, 20)} courte, honnête et vendeuse, en français.

Infos :
- Objet : ${clean(item, 200)}
- État : ${clean(condition, 50)}
- Prix : ${clean(price, 10)} €
- Détails : ${clean(details, 500)}

Format de réponse (sans markdown, sans astérisques) :
TITRE : (max 60 caractères, avec marque/taille/mot-clé qui se cherche)
DESCRIPTION : (3 à 5 phrases, ton sympa, mentionne l'état avec honnêteté, termine par une invitation à poser des questions)
MOTS-CLÉS : (6 à 8 mots-clés séparés par des virgules)

N'invente aucune information qui n'est pas fournie.`;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = String(data?.error?.message || 'erreur inconnue').slice(0, 300);
      return res.status(502).json({ error: `IA (${r.status}) : ${msg}` });
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: 'Réponse vide du service IA' });
    }
    return res.status(200).json({ text: text.trim() });
  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

