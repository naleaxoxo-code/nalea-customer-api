const express = require('express');
const crypto  = require('crypto');
const fetch   = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

const app  = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── ENV VARS (set in Railway dashboard) ──────────────────────────────────────
const SHOPIFY_STORE          = process.env.SHOPIFY_STORE;          // e.g. nalea-xoxo.myshopify.com
const SHOPIFY_ADMIN_TOKEN    = process.env.SHOPIFY_ADMIN_TOKEN;    // Admin API access token
const SHOPIFY_PROXY_SECRET   = process.env.SHOPIFY_PROXY_SECRET;   // App proxy shared secret

// ── VERIFY SHOPIFY PROXY SIGNATURE ───────────────────────────────────────────
function verifyProxySignature(query) {
  const signature = query.signature;
  if (!signature) return false;

  const params = Object.keys(query)
    .filter(k => k !== 'signature')
    .sort()
    .map(k => `${k}=${query[k]}`)
    .join('');

  const hmac = crypto
    .createHmac('sha256', SHOPIFY_PROXY_SECRET)
    .update(params)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'Nalea Customer API running ✅' });
});

// ── UPDATE CUSTOMER METAFIELDS ────────────────────────────────────────────────
// Called from your Liquid JS via: POST /apps/nalea/customer
app.post('/apps/nalea/customer', async (req, res) => {

  // 1. Verify request is from Shopify
  if (!verifyProxySignature(req.query)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const customerId = req.query.logged_in_customer_id;
  if (!customerId) {
    return res.status(400).json({ error: 'No customer ID' });
  }

  const { namespace = 'custom', metafields } = req.body;

  if (!metafields || !Array.isArray(metafields)) {
    return res.status(400).json({ error: 'metafields array required' });
  }

  // 2. Build metafield payload
  // metafields should be: [{ key: 'gender', value: 'Female', type: 'single_line_text_field' }, ...]
  const payload = {
    customer: {
      id: customerId,
      metafields: metafields.map(mf => ({
        namespace,
        key:   mf.key,
        value: mf.value,
        type:  mf.type || 'single_line_text_field'
      }))
    }
  };

  // 3. Call Shopify Admin API
  try {
    const response = await fetch(
      `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}.json`,
      {
        method:  'PUT',
        headers: {
          'Content-Type':              'application/json',
          'X-Shopify-Access-Token':    SHOPIFY_ADMIN_TOKEN
        },
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Shopify error:', data);
      return res.status(response.status).json({ error: data });
    }

    return res.json({ success: true, customer: data.customer });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nalea API listening on port ${PORT}`));
