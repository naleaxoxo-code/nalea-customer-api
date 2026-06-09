const express = require('express');
const crypto  = require('crypto');
const fetch   = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const app  = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const SHOPIFY_STORE         = process.env.SHOPIFY_STORE;
const SHOPIFY_ADMIN_TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_PROXY_SECRET  = process.env.SHOPIFY_PROXY_SECRET;
const SHOPIFY_CLIENT_ID     = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
app.get('/', (req, res) => {
  res.json({ status: 'Nalea Customer API running ✅' });
});
app.get('/auth/callback', async (req, res) => {
  const { code, shop } = req.query;
  if (!code || !shop) return res.status(400).send('Missing code or shop');
  try {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, code })
    });
    const text = await response.text();
    res.send(`<pre>${text}</pre>`);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
});
function verifyProxySignature(query) {
  const signature = query.signature;
  if (!signature) return false;
  const params = Object.keys(query).filter(k => k !== 'signature').sort().map(k => `${k}=${query[k]}`).join('');
  const hmac = crypto.createHmac('sha256', SHOPIFY_PROXY_SECRET).update(params).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature)); } catch { return false; }
}
app.post('/apps/nalea/customer', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });
  const { namespace = 'custom', metafields } = req.body;
  if (!metafields || !Array.isArray(metafields)) return res.status(400).json({ error: 'metafields array required' });
  const payload = { customer: { id: customerId, metafields: metafields.map(mf => ({ namespace, key: mf.key, value: mf.value, type: mf.type || 'single_line_text_field' })) } };
  try {
    const response = await fetch(`https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nalea API listening on port ${PORT}`));
