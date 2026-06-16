const express = require('express');
const crypto  = require('crypto');
const fetch   = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SHOPIFY_STORE         = process.env.SHOPIFY_STORE;
const SHOPIFY_ADMIN_TOKEN   = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_PROXY_SECRET  = process.env.SHOPIFY_PROXY_SECRET;
const SHOPIFY_CLIENT_ID     = process.env.SHOPIFY_CLIENT_ID;
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

  const { namespace = 'custom', metafields, customer_fields } = req.body;
  if (!metafields || !Array.isArray(metafields)) return res.status(400).json({ error: 'metafields array required' });

  const payload = {
    customer: {
      id: customerId,
      ...(customer_fields || {}),
      metafields: metafields.map(mf => ({
        namespace,
        key:   mf.key,
        value: mf.value,
        type:  mf.type || 'single_line_text_field'
      }))
    }
  };

  try {
    const response = await fetch(`https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}.json`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN },
      body:    JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Customer metafield error:', response.status, JSON.stringify(data));
      return res.status(response.status).json({ error: data });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Customer metafield exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== ADDRESSES (add / edit / delete / set default) =====
app.post('/address', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { action, address, addressId } = req.body;
  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/addresses`;
  const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    let response, data;

    if (action === 'create') {
      // Strip 'default' field — Shopify doesn't accept it in the address body
      const { default: setDefault, ...addressPayload } = address;

      console.log(`Creating address for customer ${customerId}:`, JSON.stringify(addressPayload));

      response = await fetch(`${base}.json`, {
        method:  'POST',
        headers,
        body:    JSON.stringify({ address: addressPayload })
      });
      data = await response.json();

      if (!response.ok) {
        console.error('Shopify address create error:', response.status, JSON.stringify(data));
        return res.status(response.status).json({ error: data });
      }

      // Now set as default if requested
      if (setDefault && data.customer_address && data.customer_address.id) {
        const defRes = await fetch(`${base}/${data.customer_address.id}/default.json`, { method: 'PUT', headers });
        console.log('Set default result:', defRes.status);
      }

    } else if (action === 'update') {
      // Strip 'default' field here too
      const { default: setDefault, ...addressPayload } = address;

      response = await fetch(`${base}/${addressId}.json`, {
        method:  'PUT',
        headers,
        body:    JSON.stringify({ address: addressPayload })
      });
      data = await response.json();

      if (!response.ok) {
        console.error('Shopify address update error:', response.status, JSON.stringify(data));
        return res.status(response.status).json({ error: data });
      }

      if (setDefault) {
        await fetch(`${base}/${addressId}/default.json`, { method: 'PUT', headers });
      }

    } else if (action === 'delete') {
      response = await fetch(`${base}/${addressId}.json`, { method: 'DELETE', headers });
      data     = response.ok ? { deleted: true } : await response.json();

      if (!response.ok) {
        console.error('Shopify address delete error:', response.status, JSON.stringify(data));
        return res.status(response.status).json({ error: data });
      }

    } else if (action === 'default') {
      response = await fetch(`${base}/${addressId}/default.json`, { method: 'PUT', headers });
      data     = await response.json();

      if (!response.ok) {
        console.error('Shopify set-default error:', response.status, JSON.stringify(data));
        return res.status(response.status).json({ error: data });
      }

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Address exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PAYMENT CARDS — GET (read from Shopify) =====
app.get('/cards', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.json({ success: true, cards: [] });

  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=payment_cards`, { headers });
    const listData = await listRes.json();
    if (listData.metafields && listData.metafields.length > 0) {
      try {
        const cards = JSON.parse(listData.metafields[0].value);
        return res.json({ success: true, cards: Array.isArray(cards) ? cards : [] });
      } catch(e) { return res.json({ success: true, cards: [] }); }
    }
    return res.json({ success: true, cards: [] });
  } catch (err) {
    console.error('Cards GET error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PAYMENT CARDS (dedicated metafields endpoint) =====
app.post('/cards', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { cards } = req.body;
  if (typeof cards === 'undefined') return res.status(400).json({ error: 'cards required' });

  const cardsValue = typeof cards === 'string' ? cards : JSON.stringify(cards);
  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    // Check if metafield already exists for this customer
    const listRes  = await fetch(`${base}.json?namespace=custom&key=payment_cards`, { headers });
    const listData = await listRes.json();

    let response, data;
    if (listData.metafields && listData.metafields.length > 0) {
      // Update existing
      const mfId = listData.metafields[0].id;
      response = await fetch(`${base}/${mfId}.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ metafield: { id: mfId, value: cardsValue, type: 'multi_line_text_field' } })
      });
    } else {
      // Create new
      response = await fetch(`${base}.json`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'payment_cards', value: cardsValue, type: 'multi_line_text_field' } })
      });
    }

    data = await response.json();
    if (!response.ok) {
      console.error('Cards save error:', response.status, JSON.stringify(data));
      return res.status(response.status).json({ error: data });
    }
    console.log('Cards saved for customer', customerId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Cards exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== LIKED ITEMS — GET =====
app.get('/liked', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.json({ success: true, items: [], removed: [] });

  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=liked_items`, { headers });
    const listData = await listRes.json();
    if (listData.metafields && listData.metafields.length > 0) {
      try {
        const raw = JSON.parse(listData.metafields[0].value);
        if (Array.isArray(raw)) {
          return res.json({ success: true, items: raw, removed: {} });
        }
        return res.json({ success: true, items: raw.items || [], removed: raw.removed || {} });
      } catch(e) { return res.json({ success: true, items: [], removed: {} }); }
    }
    return res.json({ success: true, items: [], removed: {} });
  } catch (err) {
    console.error('Liked GET error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== LIKED ITEMS — POST =====
app.post('/liked', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { items, removed } = req.body;
  if (typeof items === 'undefined') return res.status(400).json({ error: 'items required' });

  const data = { items: Array.isArray(items) ? items : [], removed: (removed && typeof removed === 'object' && !Array.isArray(removed)) ? removed : {} };
  const itemsValue = JSON.stringify(data);
  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=liked_items`, { headers: { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN } });
    const listData = await listRes.json();

    let response;
    if (listData.metafields && listData.metafields.length > 0) {
      const mfId = listData.metafields[0].id;
      response = await fetch(`${base}/${mfId}.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ metafield: { id: mfId, value: itemsValue, type: 'multi_line_text_field' } })
      });
    } else {
      response = await fetch(`${base}.json`, {
        method: 'POST', headers,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'liked_items', value: itemsValue, type: 'multi_line_text_field' } })
      });
    }

    const data = await response.json();
    if (!response.ok) {
      console.error('Liked save error:', response.status, JSON.stringify(data));
      return res.status(response.status).json({ error: data });
    }
    console.log('Liked items saved for customer', customerId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Liked POST error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nalea API listening on port ${PORT}`));
