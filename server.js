const express = require('express');
const crypto  = require('crypto');
const fetch   = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SHOPIFY_STORE        = process.env.SHOPIFY_STORE;
const SHOPIFY_ADMIN_TOKEN  = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_PROXY_SECRET = process.env.SHOPIFY_PROXY_SECRET;
const SHOPIFY_CLIENT_ID    = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

app.get('/', (req, res) => res.json({ status: 'Nalea Customer API running ✅' }));

function verifyProxySignature(query) {
  const signature = query.signature;
  if (!signature) return false;
  const params = Object.keys(query)
    .filter(k => k !== 'signature')
    .sort()
    .map(k => `${k}=${query[k]}`)
    .join('');
  try {
    const h1 = crypto.createHmac('sha256', SHOPIFY_PROXY_SECRET).update(params).digest('hex');
    const h2 = crypto.createHmac('sha256', SHOPIFY_CLIENT_SECRET).update(params).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(signature)) ||
           crypto.timingSafeEqual(Buffer.from(h2), Buffer.from(signature));
  } catch { return false; }
}

// ===== METAFIELDS (personal info, contact, style) =====
app.post('/customer', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { namespace = 'custom', metafields } = req.body;
  if (!metafields || !Array.isArray(metafields)) return res.status(400).json({ error: 'metafields array required' });

  const payload = {
    customer: {
      id: customerId,
      metafields: metafields.map(mf => ({
        namespace,
        key: mf.key,
        value: mf.value,
        type: mf.type || 'single_line_text_field'
      }))
    }
  };

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

// ===== ADDRESSES (add / edit / delete / set default) =====
app.post('/address', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { action, address, addressId } = req.body;
  const base = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/addresses`;
  const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    let response, data;

    if (action === 'create') {
      response = await fetch(`${base}.json`, { method: 'POST', headers, body: JSON.stringify({ address }) });
      data = await response.json();
      if (response.ok && address && address.default && data.customer_address) {
        await fetch(`${base}/${data.customer_address.id}/default.json`, { method: 'PUT', headers });
      }

    } else if (action === 'update') {
      response = await fetch(`${base}/${addressId}.json`, { method: 'PUT', headers, body: JSON.stringify({ address }) });
      data = await response.json();
      if (response.ok && address && address.default) {
        await fetch(`${base}/${addressId}/default.json`, { method: 'PUT', headers });
      }

    } else if (action === 'delete') {
      response = await fetch(`${base}/${addressId}.json`, { method: 'DELETE', headers });
      data = response.ok ? { deleted: true } : await response.json();

    } else if (action === 'default') {
      response = await fetch(`${base}/${addressId}/default.json`, { method: 'PUT', headers });
      data = await response.json();

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    if (!response.ok) return res.status(response.status).json({ error: data });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nalea API listening on port ${PORT}`));
