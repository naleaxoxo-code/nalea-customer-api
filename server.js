const express = require('express');
const crypto  = require('crypto');
const fetch   = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const multer  = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
app.use(express.json({ limit: '5mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
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

function verifyWebhookHmac(req) {
  const header = req.get('X-Shopify-Hmac-Sha256');
  if (!header || !req.rawBody) return false;
  try {
    const digest = crypto.createHmac('sha256', SHOPIFY_CLIENT_SECRET).update(req.rawBody).digest('base64');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(header));
  } catch { return false; }
}

// ===== PUBLIC AVATAR REGISTRY =====
// Keeps shop.metafields.custom.public_avatars in sync.
// A customer appears in the registry only if BOTH photo_public=true AND show_on_reviews=true.
async function updatePublicRegistry(customerId, isPublic) {
  const adminHeaders = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const jsonHeaders  = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const shopBase     = `https://${SHOPIFY_STORE}/admin/api/2024-04`;

  // Get customer name + profile_photo
  const custRes  = await fetch(`${shopBase}/customers/${customerId}.json`, { headers: adminHeaders });
  const custData = await custRes.json();
  const c        = custData.customer;
  if (!c) return;
  const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
  if (!fullName) return;

  // Get profile_photo metafield
  const mfRes  = await fetch(`${shopBase}/customers/${customerId}/metafields.json?namespace=custom&key=profile_photo`, { headers: adminHeaders });
  const mfData = await mfRes.json();
  const photo  = mfData.metafields?.[0]?.value || null;

  // Get show_on_reviews metafield (default true if not set)
  const sorRes  = await fetch(`${shopBase}/customers/${customerId}/metafields.json?namespace=custom&key=show_on_reviews`, { headers: adminHeaders });
  const sorData = await sorRes.json();
  const showOnReviews = sorData.metafields?.[0]?.value !== 'false'; // true by default

  // Read existing shop-level registry
  const regRes  = await fetch(`${shopBase}/metafields.json?namespace=custom&key=public_avatars`, { headers: adminHeaders });
  const regData = await regRes.json();
  let registry  = {};
  let regId     = null;
  if (regData.metafields?.length > 0) {
    regId = regData.metafields[0].id;
    const raw = regData.metafields[0].value;
    try { registry = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch {}
  }

  // Only include if photo_public=true AND show_on_reviews=true AND photo exists
  const isEmoji = photo && photo.length <= 10 && !photo.startsWith('http') && !photo.startsWith('data:');
  const registryValue = isEmoji ? photo : `/apps/nalea/photo/${customerId}`;

  if (isPublic && showOnReviews && photo) {
    registry[fullName] = registryValue;
  } else {
    delete registry[fullName];
  }

  const newValue = JSON.stringify(registry);
  console.log(`Registry update for ${fullName}: isPublic=${isPublic}, showOnReviews=${showOnReviews}, photo=${photo ? photo.substring(0, 30) + '...' : 'none'}`);

  let saveRes;
  if (regId) {
    saveRes = await fetch(`${shopBase}/metafields/${regId}.json`, {
      method: 'PUT', headers: jsonHeaders,
      body: JSON.stringify({ metafield: { id: regId, value: newValue, type: 'json' } })
    });
  } else {
    saveRes = await fetch(`${shopBase}/metafields.json`, {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({ metafield: { namespace: 'custom', key: 'public_avatars', value: newValue, type: 'json' } })
    });
  }
  if (!saveRes.ok) {
    const errBody = await saveRes.text();
    console.error(`Registry save FAILED: status=${saveRes.status}, body=${errBody.substring(0, 500)}`);
  } else {
    console.log(`Registry saved OK for ${fullName}`);
  }
}

// ===== GAME COUPONS — append a won coupon to the customer's coupon wallet =====
async function saveGameCoupon(customerId, coupon) {
  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const jsonHeaders = { 'Content-Type': 'application/json', ...headers };

  const listRes  = await fetch(`${base}.json?namespace=custom&key=game_coupons`, { headers });
  const listData = await listRes.json();
  let coupons = [];
  let mfId = null;
  if (listData.metafields?.length > 0) {
    mfId = listData.metafields[0].id;
    try { coupons = JSON.parse(listData.metafields[0].value); } catch { coupons = []; }
  }
  coupons.unshift({
    code: coupon.code,
    tier: coupon.tier,
    isNewSignup: !!coupon.isNewSignup,
    date: new Date().toISOString()
  });

  const value = JSON.stringify(coupons);
  if (mfId) {
    return fetch(`${base}/${mfId}.json`, {
      method: 'PUT', headers: jsonHeaders,
      body: JSON.stringify({ metafield: { id: mfId, value, type: 'json' } })
    });
  }
  return fetch(`${base}.json`, {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({ metafield: { namespace: 'custom', key: 'game_coupons', value, type: 'json' } })
  });
}

// ===== METAFIELDS (personal info, contact, style) =====
app.post('/customer', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { namespace = 'custom', metafields, customer_fields, game_coupon } = req.body;

  if (game_coupon) {
    try {
      const saveRes = await saveGameCoupon(customerId, game_coupon);
      if (!saveRes.ok) {
        const errBody = await saveRes.text();
        console.error('Game coupon save FAILED:', saveRes.status, errBody.substring(0, 300));
        return res.status(saveRes.status).json({ error: 'Failed to save coupon' });
      }
    } catch (err) {
      console.error('Game coupon save exception:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (!metafields) return res.json({ success: true });
  if (!Array.isArray(metafields)) return res.status(400).json({ error: 'metafields array required' });

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

// ===== GAME COUPONS — GET (for profile page display) =====
app.get('/game-coupons', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.json({ success: true, coupons: [] });

  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=game_coupons`, { headers });
    const listData = await listRes.json();
    if (listData.metafields?.length > 0) {
      try {
        const coupons = JSON.parse(listData.metafields[0].value);
        return res.json({ success: true, coupons: Array.isArray(coupons) ? coupons : [] });
      } catch(e) { return res.json({ success: true, coupons: [] }); }
    }
    return res.json({ success: true, coupons: [] });
  } catch (err) {
    console.error('Game coupons GET error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== LOYALTY POINTS — GET balance =====
app.get('/loyalty', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.json({ success: true, points: 0 });

  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=loyalty_points`, { headers });
    const listData = await listRes.json();
    const points = listData.metafields?.[0]?.value ? parseInt(listData.metafields[0].value, 10) || 0 : 0;
    return res.json({ success: true, points });
  } catch (err) {
    console.error('Loyalty GET error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== LOYALTY POINTS — awarded automatically via the orders/paid webhook =====
// 1 point per whole currency unit spent (e.g. R1 = 1 point). Register this webhook in
// Shopify Admin > Settings > Notifications > Webhooks, event "Order payment", pointing at
// https://<your-api-host>/webhooks/orders-paid
app.post('/webhooks/orders-paid', async (req, res) => {
  if (!verifyWebhookHmac(req)) return res.status(401).send('Unauthorized');
  res.status(200).send('ok'); // ack immediately, Shopify expects a fast response

  try {
    const order = req.body;
    const customerId = order?.customer?.id;
    const total = parseFloat(order?.total_price || '0');
    if (!customerId || !total) return;
    const pointsEarned = Math.floor(total);
    if (pointsEarned <= 0) return;

    const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
    const headers = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
    const jsonHeaders = { 'Content-Type': 'application/json', ...headers };

    const listRes  = await fetch(`${base}.json?namespace=custom&key=loyalty_points`, { headers });
    const listData = await listRes.json();
    const mfId = listData.metafields?.[0]?.id || null;
    const current = mfId ? (parseInt(listData.metafields[0].value, 10) || 0) : 0;
    const newValue = String(current + pointsEarned);

    if (mfId) {
      await fetch(`${base}/${mfId}.json`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: mfId, value: newValue, type: 'number_integer' } })
      });
    } else {
      await fetch(`${base}.json`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'loyalty_points', value: newValue, type: 'number_integer' } })
      });
    }
    console.log(`Awarded ${pointsEarned} loyalty points to customer ${customerId} (order total ${total})`);
  } catch (err) {
    console.error('Loyalty points award exception:', err.message);
  }
});

// ===== GIFT CARDS — GET (Shopify's native gift cards issued to this customer) =====
app.get('/gift-cards', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.json({ success: true, giftCards: [] });

  const graphqlUrl = `https://${SHOPIFY_STORE}/admin/api/2024-04/graphql.json`;
  const jsonHeaders = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const gqlRes = await fetch(graphqlUrl, {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({
        query: `query giftCardsForCustomer($query: String!) {
          giftCards(first: 20, query: $query) {
            nodes {
              lastCharacters
              maskedCode
              balance { amount currencyCode }
              initialValue { amount currencyCode }
              expiresOn
              enabled
            }
          }
        }`,
        variables: { query: `customer_id:${customerId}` }
      })
    });
    const gqlData = await gqlRes.json();
    const giftCards = gqlData?.data?.giftCards?.nodes || [];
    return res.json({ success: true, giftCards });
  } catch (err) {
    console.error('Gift cards GET error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== DEVICES — lightweight "active sessions" approximation =====
// Shopify does not expose real customer login sessions via any API, so this tracks
// browser/device fingerprints the customer's own client reports while logged in.
function parseUserAgent(ua) {
  ua = ua || '';
  let browser = 'Unknown browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';

  let os = 'Unknown device';
  if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Macintosh/.test(ua)) os = 'Mac';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Linux/.test(ua)) os = 'Linux';

  return `${browser} on ${os}`;
}

app.post('/devices/ping', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { device_id } = req.body;
  if (!device_id) return res.status(400).json({ error: 'device_id required' });

  const label = parseUserAgent(req.get('User-Agent'));
  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const jsonHeaders = { 'Content-Type': 'application/json', ...headers };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=devices`, { headers });
    const listData = await listRes.json();
    let devices = [];
    let mfId = null;
    if (listData.metafields?.length > 0) {
      mfId = listData.metafields[0].id;
      try { devices = JSON.parse(listData.metafields[0].value); } catch { devices = []; }
    }

    devices = devices.filter(d => d.id !== device_id);
    devices.unshift({ id: device_id, label, lastSeen: new Date().toISOString() });
    devices = devices.slice(0, 10);

    const value = JSON.stringify(devices);
    if (mfId) {
      await fetch(`${base}/${mfId}.json`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: mfId, value, type: 'json' } })
      });
    } else {
      await fetch(`${base}.json`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'devices', value, type: 'json' } })
      });
    }
    return res.json({ success: true, devices });
  } catch (err) {
    console.error('Devices ping error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/devices', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.json({ success: true, devices: [] });

  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=devices`, { headers });
    const listData = await listRes.json();
    if (listData.metafields?.length > 0) {
      try {
        const devices = JSON.parse(listData.metafields[0].value);
        return res.json({ success: true, devices: Array.isArray(devices) ? devices : [] });
      } catch(e) { return res.json({ success: true, devices: [] }); }
    }
    return res.json({ success: true, devices: [] });
  } catch (err) {
    console.error('Devices GET error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/devices/remove', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { device_id } = req.body;
  if (!device_id) return res.status(400).json({ error: 'device_id required' });

  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const jsonHeaders = { 'Content-Type': 'application/json', ...headers };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=devices`, { headers });
    const listData = await listRes.json();
    if (!listData.metafields?.length) return res.json({ success: true, devices: [] });

    const mfId = listData.metafields[0].id;
    let devices = [];
    try { devices = JSON.parse(listData.metafields[0].value); } catch { devices = []; }
    devices = devices.filter(d => d.id !== device_id);

    await fetch(`${base}/${mfId}.json`, {
      method: 'PUT', headers: jsonHeaders,
      body: JSON.stringify({ metafield: { id: mfId, value: JSON.stringify(devices), type: 'json' } })
    });
    return res.json({ success: true, devices });
  } catch (err) {
    console.error('Devices remove error:', err.message);
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
      const { default: setDefault, ...addressPayload } = address;
      console.log(`Creating address for customer ${customerId}:`, JSON.stringify(addressPayload));
      response = await fetch(`${base}.json`, {
        method: 'POST', headers,
        body: JSON.stringify({ address: addressPayload })
      });
      data = await response.json();
      if (!response.ok) {
        console.error('Shopify address create error:', response.status, JSON.stringify(data));
        return res.status(response.status).json({ error: data });
      }
      if (setDefault && data.customer_address && data.customer_address.id) {
        const defRes = await fetch(`${base}/${data.customer_address.id}/default.json`, { method: 'PUT', headers });
        console.log('Set default result:', defRes.status);
      }

    } else if (action === 'update') {
      const { default: setDefault, ...addressPayload } = address;
      response = await fetch(`${base}/${addressId}.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ address: addressPayload })
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

// ===== PAYMENT CARDS — GET =====
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

// ===== PAYMENT CARDS — POST =====
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
    const listRes  = await fetch(`${base}.json?namespace=custom&key=payment_cards`, { headers });
    const listData = await listRes.json();
    let response;
    if (listData.metafields && listData.metafields.length > 0) {
      const mfId = listData.metafields[0].id;
      response = await fetch(`${base}/${mfId}.json`, {
        method: 'PUT', headers,
        body: JSON.stringify({ metafield: { id: mfId, value: cardsValue, type: 'multi_line_text_field' } })
      });
    } else {
      response = await fetch(`${base}.json`, {
        method: 'POST', headers,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'payment_cards', value: cardsValue, type: 'multi_line_text_field' } })
      });
    }
    const data = await response.json();
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
        const raw   = JSON.parse(listData.metafields[0].value);
        const items = Array.isArray(raw) ? raw : (raw.items || []);
        return res.json({ success: true, items });
      } catch(e) { return res.json({ success: true, items: [] }); }
    }
    return res.json({ success: true, items: [] });
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

  const { items } = req.body;
  if (typeof items === 'undefined') return res.status(400).json({ error: 'items required' });

  const itemsValue = JSON.stringify(Array.isArray(items) ? items : []);
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

// ===== PUBLIC AVATARS — returns shop registry for all visitors =====
app.get('/public-avatars', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const headers  = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
    const regRes   = await fetch(`https://${SHOPIFY_STORE}/admin/api/2024-04/metafields.json?namespace=custom&key=public_avatars`, { headers });
    const regData  = await regRes.json();
    let registry   = {};
    if (regData.metafields?.length > 0) {
      const raw = regData.metafields[0].value;
      try { registry = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch {}
    }
    return res.json(registry);
  } catch (err) {
    console.error('Public avatars error:', err.message);
    return res.json({});
  }
});

// ===== PROFILE — GET photo URL + visibility settings =====
app.get('/profile', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.json({ success: true, profile_photo: null, photo_public: false });

  const base    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const headers = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const [photoRes, publicRes, reviewsRes] = await Promise.all([
      fetch(`${base}.json?namespace=custom&key=profile_photo`,   { headers }),
      fetch(`${base}.json?namespace=custom&key=photo_public`,    { headers }),
      fetch(`${base}.json?namespace=custom&key=show_on_reviews`, { headers })
    ]);
    const [photoData, publicData, reviewsData] = await Promise.all([photoRes.json(), publicRes.json(), reviewsRes.json()]);

    const profile_photo   = photoData.metafields?.[0]?.value || null;
    const photo_public    = publicData.metafields?.[0]?.value === 'true';
    const show_on_reviews = reviewsData.metafields?.[0]?.value !== 'false';

    return res.json({ success: true, profile_photo, photo_public, show_on_reviews });
  } catch (err) {
    console.error('Profile GET error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PROFILE PHOTO — upload to Shopify CDN and save URL as metafield =====
app.post('/profile/photo', upload.single('photo'), async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });
  if (!req.file)   return res.status(400).json({ error: 'No photo file provided' });

  const { buffer, mimetype, originalname, size } = req.file;
  const jsonHeaders  = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const adminHeaders = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const graphqlUrl   = `https://${SHOPIFY_STORE}/admin/api/2024-04/graphql.json`;

  try {
    const stagedRes = await fetch(graphqlUrl, {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({
        query: `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets { url resourceUrl parameters { name value } }
            userErrors { field message }
          }
        }`,
        variables: {
          input: [{
            filename:   originalname || `profile_${customerId}.jpg`,
            mimeType:   mimetype,
            resource:   'FILE',
            fileSize:   String(size),
            httpMethod: 'POST'
          }]
        }
      })
    });
    const stagedData = await stagedRes.json();
    const target = stagedData?.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!target) {
      console.error('Staged upload failed:', JSON.stringify(stagedData));
      return res.status(500).json({ error: 'Failed to create staged upload' });
    }

    const form = new FormData();
    for (const { name, value } of target.parameters) form.append(name, value);
    form.append('file', new Blob([buffer], { type: mimetype }), originalname || 'photo.jpg');
    const uploadRes = await fetch(target.url, { method: 'POST', body: form });
    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error('S3 upload error:', uploadRes.status, text);
      return res.status(500).json({ error: 'Photo upload to CDN failed' });
    }

    await fetch(graphqlUrl, {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({
        query: `mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files { ... on MediaImage { image { url } } ... on GenericFile { url } }
            userErrors { field message }
          }
        }`,
        variables: { files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE' }] }
      })
    });

    const cdnUrl = target.resourceUrl;
    const mfBase = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
    const listRes  = await fetch(`${mfBase}.json?namespace=custom&key=profile_photo`, { headers: adminHeaders });
    const listData = await listRes.json();

    let mfResponse;
    if (listData.metafields?.length > 0) {
      const mfId = listData.metafields[0].id;
      mfResponse = await fetch(`${mfBase}/${mfId}.json`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: mfId, value: cdnUrl, type: 'single_line_text_field' } })
      });
    } else {
      mfResponse = await fetch(`${mfBase}.json`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'profile_photo', value: cdnUrl, type: 'single_line_text_field' } })
      });
    }
    const mfData = await mfResponse.json();
    if (!mfResponse.ok) {
      console.error('Profile photo metafield error:', JSON.stringify(mfData));
      return res.status(mfResponse.status).json({ error: mfData });
    }

    console.log('Profile photo saved for customer', customerId);
    const pubCheck = await fetch(`https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields.json?namespace=custom&key=photo_public`, { headers: adminHeaders });
    const pubData  = await pubCheck.json();
    const isPublic = pubData.metafields?.[0]?.value === 'true';
    updatePublicRegistry(customerId, isPublic).catch(e => console.error('Registry update error:', e.message));
    return res.json({ success: true, profile_photo: cdnUrl });
  } catch (err) {
    console.error('Profile photo exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== SERVE PROFILE PHOTO — reads metafield and serves image =====
app.get('/photo/:customerId', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).send('Unauthorized');
  const customerId = req.params.customerId;
  const adminHeaders = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  try {
    const mfRes  = await fetch(`https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields.json?namespace=custom&key=profile_photo`, { headers: adminHeaders });
    const mfData = await mfRes.json();
    const photo  = mfData.metafields?.[0]?.value || null;
    if (!photo) return res.status(404).send('No photo');
    if (photo.startsWith('http')) return res.redirect(photo);
    const matches = photo.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      const buffer = Buffer.from(matches[2], 'base64');
      res.set('Content-Type', matches[1]);
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(buffer);
    }
    return res.status(404).send('Unknown format');
  } catch (err) {
    console.error('Photo serve exception:', err.message);
    return res.status(500).send('Error');
  }
});

// ===== PROFILE PHOTO BASE64 — save compressed base64 as metafield =====
app.post('/profile/photo-base64', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const photo = req.body.photo_data || req.body.photo;
  if (!photo) return res.status(400).json({ error: 'photo required' });

  const jsonHeaders  = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const adminHeaders = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const mfBase       = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;

  try {
    const listRes  = await fetch(`${mfBase}.json?namespace=custom&key=profile_photo`, { headers: adminHeaders });
    const listData = await listRes.json();
    let mfResponse;
    if (listData.metafields?.length > 0) {
      const mfId = listData.metafields[0].id;
      mfResponse = await fetch(`${mfBase}/${mfId}.json`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: mfId, value: photo, type: 'multi_line_text_field' } })
      });
    } else {
      mfResponse = await fetch(`${mfBase}.json`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'profile_photo', value: photo, type: 'multi_line_text_field' } })
      });
    }
    const mfData = await mfResponse.json();
    if (!mfResponse.ok) {
      console.error('Photo-base64 metafield error:', JSON.stringify(mfData));
      return res.status(mfResponse.status).json({ error: mfData });
    }

    console.log('Profile photo (base64) saved for customer', customerId, 'size:', photo.length);
    const pubCheck = await fetch(`${mfBase}.json?namespace=custom&key=photo_public`, { headers: adminHeaders });
    const pubData  = await pubCheck.json();
    const isPublic = pubData.metafields?.[0]?.value === 'true';
    updatePublicRegistry(customerId, isPublic).catch(e => console.error('Registry update error:', e.message));
    return res.json({ success: true, profile_photo: photo });
  } catch (err) {
    console.error('Photo-base64 exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PROFILE VISIBILITY — set photo_public metafield =====
app.post('/profile/visibility', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { photo_public } = req.body;
  if (typeof photo_public === 'undefined') return res.status(400).json({ error: 'photo_public required' });

  const value       = photo_public === true || photo_public === 'true' ? 'true' : 'false';
  const base        = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const jsonHeaders = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const getHeaders  = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=photo_public`, { headers: getHeaders });
    const listData = await listRes.json();
    let response;
    if (listData.metafields?.length > 0) {
      const mfId = listData.metafields[0].id;
      response = await fetch(`${base}/${mfId}.json`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: mfId, value, type: 'single_line_text_field' } })
      });
    } else {
      response = await fetch(`${base}.json`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'photo_public', value, type: 'single_line_text_field' } })
      });
    }
    const data = await response.json();
    if (!response.ok) {
      console.error('Visibility save error:', JSON.stringify(data));
      return res.status(response.status).json({ error: data });
    }
    updatePublicRegistry(customerId, value === 'true').catch(e => console.error('Registry update error:', e.message));
    return res.json({ success: true, photo_public: value === 'true' });
  } catch (err) {
    console.error('Visibility exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== REVIEW AVATAR TOGGLE — set show_on_reviews metafield =====
// When a customer toggles this, their photo is added or removed from the public registry.
app.post('/profile/review-avatar', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { show_on_reviews } = req.body;
  if (typeof show_on_reviews === 'undefined') return res.status(400).json({ error: 'show_on_reviews required' });

  const value       = show_on_reviews === true || show_on_reviews === 'true' ? 'true' : 'false';
  const base        = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const jsonHeaders = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const getHeaders  = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=show_on_reviews`, { headers: getHeaders });
    const listData = await listRes.json();
    let response;
    if (listData.metafields?.length > 0) {
      const mfId = listData.metafields[0].id;
      response = await fetch(`${base}/${mfId}.json`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: mfId, value, type: 'single_line_text_field' } })
      });
    } else {
      response = await fetch(`${base}.json`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'show_on_reviews', value, type: 'single_line_text_field' } })
      });
    }
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });

    // Re-sync the public registry so the change takes effect immediately on review cards
    const pubCheck = await fetch(`${base}.json?namespace=custom&key=photo_public`, { headers: getHeaders });
    const pubData  = await pubCheck.json();
    const isPublic = pubData.metafields?.[0]?.value === 'true';
    updatePublicRegistry(customerId, isPublic).catch(e => console.error('Registry update error:', e.message));

    return res.json({ success: true, show_on_reviews: value === 'true' });
  } catch (err) {
    console.error('Review avatar toggle exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PROFILE EMOJI — save emoji as profile photo =====
app.post('/profile/emoji', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const { emoji } = req.body;
  if (!emoji || typeof emoji !== 'string' || emoji.length > 10) return res.status(400).json({ error: 'emoji required' });

  const base        = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const jsonHeaders = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const getHeaders  = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=profile_photo`, { headers: getHeaders });
    const listData = await listRes.json();
    let saveRes;
    if (listData.metafields?.length > 0) {
      const mfId = listData.metafields[0].id;
      saveRes = await fetch(`${base}/${mfId}.json`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: mfId, value: emoji, type: 'single_line_text_field' } })
      });
    } else {
      saveRes = await fetch(`${base}.json`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'profile_photo', value: emoji, type: 'single_line_text_field' } })
      });
    }
    if (!saveRes.ok) {
      const errBody = await saveRes.text();
      console.error(`Emoji save FAILED: status=${saveRes.status}, body=${errBody.substring(0, 500)}`);
      return res.status(saveRes.status).json({ error: 'Failed to save emoji' });
    }

    const pubRes  = await fetch(`${base}.json?namespace=custom&key=photo_public`, { headers: getHeaders });
    const pubData = await pubRes.json();
    const isPublic = pubData.metafields?.[0]?.value === 'true';
    await updatePublicRegistry(customerId, isPublic);

    return res.json({ success: true, emoji });
  } catch (err) {
    console.error('Emoji save exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PRODUCT REVIEWS (verified buyers only) =====
app.post('/reviews', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(401).json({ error: 'Please log in to write a review.' });

  const { product_id, rating, title, body } = req.body || {};
  const r = parseInt(rating);
  if (!product_id || !r || r < 1 || r > 5) return res.status(400).json({ error: 'Please provide a star rating.' });

  const adminHeaders = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const jsonHeaders  = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const apiBase = `https://${SHOPIFY_STORE}/admin/api/2024-04`;
  const pid = String(product_id).replace(/[^0-9]/g, '');

  try {
    // 1) Verify the customer actually purchased this product
    const ordRes  = await fetch(`${apiBase}/customers/${customerId}/orders.json?status=any&limit=250`, { headers: adminHeaders });
    const ordData = await ordRes.json();
    const bought  = (ordData.orders || []).some(o => (o.line_items || []).some(li => String(li.product_id) === pid));
    if (!bought) return res.status(403).json({ error: 'Only verified buyers can review this product.' });

    // 2) Build display name (First L.)
    const custRes = await fetch(`${apiBase}/customers/${customerId}.json?fields=first_name,last_name`, { headers: adminHeaders });
    const cust    = (await custRes.json()).customer || {};
    const name    = ((cust.first_name || 'Customer') + ' ' + (cust.last_name ? cust.last_name.charAt(0) + '.' : '')).trim();

    // 3) Read existing reviews metafield
    const mfRes    = await fetch(`${apiBase}/products/${pid}/metafields.json?namespace=custom&key=reviews`, { headers: adminHeaders });
    const existing = (await mfRes.json()).metafields?.[0];
    let reviews = [];
    if (existing) { try { reviews = JSON.parse(existing.value); } catch { reviews = []; } }

    // One review per customer per product — latest wins
    reviews = reviews.filter(rv => String(rv.cid) !== String(customerId));
    reviews.unshift({
      cid:      String(customerId),
      name,
      rating:   r,
      title:    (title || '').toString().slice(0, 80),
      body:     (body  || '').toString().slice(0, 600),
      verified: true,
      date:     new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
    });

    // 4) Persist
    let saveRes;
    if (existing) {
      saveRes = await fetch(`${apiBase}/metafields/${existing.id}.json`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: existing.id, type: 'json', value: JSON.stringify(reviews) } })
      });
    } else {
      saveRes = await fetch(`${apiBase}/products/${pid}/metafields.json`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'reviews', type: 'json', value: JSON.stringify(reviews) } })
      });
    }
    if (!saveRes.ok) {
      const t = await saveRes.text();
      console.error('Review save failed:', saveRes.status, t.slice(0, 300));
      return res.status(500).json({ error: 'Could not save your review.' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Review exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== REVIEWS — GET =====
app.get('/reviews', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const pid = String(req.query.product_id || '').replace(/[^0-9]/g, '');
  if (!pid) return res.status(400).json({ error: 'product_id required' });
  const adminHeaders = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const apiBase = `https://${SHOPIFY_STORE}/admin/api/2024-04`;
  try {
    const mf = (await (await fetch(`${apiBase}/products/${pid}/metafields.json?namespace=custom&key=reviews`, { headers: adminHeaders })).json()).metafields?.[0];
    let reviews = [];
    if (mf) { try { reviews = JSON.parse(mf.value); } catch {} }
    const count   = reviews.length;
    const average = count ? Math.round((reviews.reduce((s, r) => s + (r.rating || 0), 0) / count) * 10) / 10 : 0;
    return res.json({ success: true, count, average, reviews: reviews.map(({ cid, ...rest }) => rest) });
  } catch (err) {
    console.error('Review GET exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PERSONALIZATION BOARD — photo upload =====
// Called by the product page JS when a customer uploads a photo on a personalization board.
// Returns a CDN URL that gets stored as a Shopify line-item property on the order.
app.post('/personalization/photo', upload.single('photo'), async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ error: 'No photo provided' });

  const { buffer, mimetype, originalname, size } = req.file;
  const jsonHeaders = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const graphqlUrl  = `https://${SHOPIFY_STORE}/admin/api/2024-04/graphql.json`;

  try {
    // Stage an upload slot on Shopify CDN
    const stagedRes = await fetch(graphqlUrl, {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({
        query: `mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets { url resourceUrl parameters { name value } }
            userErrors { field message }
          }
        }`,
        variables: {
          input: [{
            filename:   originalname || 'personalization.jpg',
            mimeType:   mimetype,
            resource:   'FILE',
            fileSize:   String(size),
            httpMethod: 'POST'
          }]
        }
      })
    });
    const stagedData = await stagedRes.json();
    const target = stagedData?.data?.stagedUploadsCreate?.stagedTargets?.[0];
    if (!target) {
      console.error('Personalization staged upload failed:', JSON.stringify(stagedData));
      return res.status(500).json({ error: 'Failed to create staged upload' });
    }

    // Upload file bytes to GCS
    const form = new FormData();
    for (const { name, value } of target.parameters) form.append(name, value);
    form.append('file', new Blob([buffer], { type: mimetype }), originalname || 'photo.jpg');
    const uploadRes = await fetch(target.url, { method: 'POST', body: form });
    if (!uploadRes.ok) {
      console.error('Personalization GCS upload error:', uploadRes.status);
      return res.status(500).json({ error: 'Photo upload failed' });
    }

    // Register in Shopify Files (async — resourceUrl is already the permanent CDN URL)
    fetch(graphqlUrl, {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({
        query: `mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files { ... on MediaImage { image { url } } }
            userErrors { field message }
          }
        }`,
        variables: { files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE' }] }
      })
    }).catch(e => console.error('fileCreate error:', e.message));

    const customerId = req.query.logged_in_customer_id || 'guest';
    console.log(`Personalization photo uploaded — customer: ${customerId}, url: ${target.resourceUrl.substring(0, 60)}...`);
    return res.json({ success: true, url: target.resourceUrl });
  } catch (err) {
    console.error('Personalization photo exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nalea API listening on port ${PORT}`));
