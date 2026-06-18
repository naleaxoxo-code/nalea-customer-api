const express = require('express');
const crypto  = require('crypto');
const fetch   = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const multer  = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// ===== PUBLIC AVATAR REGISTRY — keeps shop.metafields.custom.public_avatars in sync =====
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

  // Get profile_photo from customer metafields
  const mfRes  = await fetch(`${shopBase}/customers/${customerId}/metafields.json?namespace=custom&key=profile_photo`, { headers: adminHeaders });
  const mfData = await mfRes.json();
  const photo  = mfData.metafields?.[0]?.value || null;

  // Read existing registry (shop metafields live at /metafields.json with no owner_resource filter)
  const regRes  = await fetch(`${shopBase}/metafields.json?namespace=custom&key=public_avatars`, { headers: adminHeaders });
  const regData = await regRes.json();
  let registry  = {};
  let regId     = null;
  if (regData.metafields?.length > 0) {
    regId = regData.metafields[0].id;
    const raw = regData.metafields[0].value;
    try { registry = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch {}
  }

  // Update registry
  if (isPublic && photo) {
    registry[fullName] = photo;
  } else {
    delete registry[fullName];
  }

  const newValue = JSON.stringify(registry);
  if (regId) {
    await fetch(`${shopBase}/metafields/${regId}.json`, {
      method: 'PUT', headers: jsonHeaders,
      body: JSON.stringify({ metafield: { id: regId, value: newValue, type: 'json' } })
    });
  } else {
    await fetch(`${shopBase}/metafields.json`, {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({ metafield: { namespace: 'custom', key: 'public_avatars', value: newValue, type: 'json' } })
    });
  }
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

// ===== PROFILE — GET photo URL + visibility setting =====
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

    const profile_photo    = photoData.metafields?.[0]?.value || null;
    const photo_public     = publicData.metafields?.[0]?.value === 'true';
    const show_on_reviews  = reviewsData.metafields?.[0]?.value !== 'false';

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
    // Step 1 — create a staged upload target on Shopify
    const stagedRes = await fetch(graphqlUrl, {
      method: 'POST',
      headers: jsonHeaders,
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

    // Step 2 — upload the file bytes to the staged S3 URL
    const form = new FormData();
    for (const { name, value } of target.parameters) form.append(name, value);
    form.append('file', new Blob([buffer], { type: mimetype }), originalname || 'photo.jpg');

    const uploadRes = await fetch(target.url, { method: 'POST', body: form });
    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      console.error('S3 upload error:', uploadRes.status, text);
      return res.status(500).json({ error: 'Photo upload to CDN failed' });
    }

    // Step 3 — register the file in Shopify Files
    const fileRes = await fetch(graphqlUrl, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        query: `mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files { ... on MediaImage { image { url } } ... on GenericFile { url } }
            userErrors { field message }
          }
        }`,
        variables: {
          files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE' }]
        }
      })
    });

    const fileData = await fileRes.json();
    // resourceUrl is the permanent CDN URL — use it directly since fileCreate may still be processing
    const cdnUrl = target.resourceUrl;

    // Step 4 — save CDN URL as customer metafield
    const mfBase    = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
    const listRes   = await fetch(`${mfBase}.json?namespace=custom&key=profile_photo`, { headers: adminHeaders });
    const listData  = await listRes.json();

    let mfResponse;
    if (listData.metafields?.length > 0) {
      const mfId = listData.metafields[0].id;
      mfResponse = await fetch(`${mfBase}/${mfId}.json`, {
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: mfId, value: cdnUrl, type: 'single_line_text_field' } })
      });
    } else {
      mfResponse = await fetch(`${mfBase}.json`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'profile_photo', value: cdnUrl, type: 'single_line_text_field' } })
      });
    }

    const mfData = await mfResponse.json();
    if (!mfResponse.ok) {
      console.error('Profile photo metafield error:', JSON.stringify(mfData));
      return res.status(mfResponse.status).json({ error: mfData });
    }

    console.log('Profile photo saved for customer', customerId);
    // Check if customer has photo_public=true, then update registry
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

// ===== PROFILE PHOTO BASE64 — save base64 photo as metafield and update registry =====
app.post('/profile/photo-base64', async (req, res) => {
  if (!verifyProxySignature(req.query)) return res.status(401).json({ error: 'Unauthorized' });
  const customerId = req.query.logged_in_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No customer ID' });

  const photo = req.body.photo_data || req.body.photo;
  if (!photo) return res.status(400).json({ error: 'photo required' });

  const base       = `https://${SHOPIFY_STORE}/admin/api/2024-04/customers/${customerId}/metafields`;
  const jsonHeaders = { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };
  const getHeaders  = { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN };

  try {
    const listRes  = await fetch(`${base}.json?namespace=custom&key=profile_photo`, { headers: getHeaders });
    const listData = await listRes.json();

    let mfResponse;
    if (listData.metafields?.length > 0) {
      const mfId = listData.metafields[0].id;
      mfResponse = await fetch(`${base}/${mfId}.json`, {
        method: 'PUT', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: mfId, value: photo, type: 'multi_line_text_field' } })
      });
    } else {
      mfResponse = await fetch(`${base}.json`, {
        method: 'POST', headers: jsonHeaders,
        body: JSON.stringify({ metafield: { namespace: 'custom', key: 'profile_photo', value: photo, type: 'multi_line_text_field' } })
      });
    }

    const mfData = await mfResponse.json();
    if (!mfResponse.ok) {
      console.error('Photo-base64 metafield error:', JSON.stringify(mfData));
      return res.status(mfResponse.status).json({ error: mfData });
    }

    const pubCheck = await fetch(`${base}.json?namespace=custom&key=photo_public`, { headers: getHeaders });
    const pubData  = await pubCheck.json();
    const isPublic = pubData.metafields?.[0]?.value === 'true';
    updatePublicRegistry(customerId, isPublic).catch(e => console.error('Registry update error:', e.message));

    return res.json({ success: true, profile_photo: photo });
  } catch (err) {
    console.error('Photo-base64 exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== PROFILE VISIBILITY — set photo_public metafield (true/false) =====
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
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify({ metafield: { id: mfId, value, type: 'single_line_text_field' } })
      });
    } else {
      response = await fetch(`${base}.json`, {
        method: 'POST',
        headers: jsonHeaders,
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
    return res.json({ success: true, show_on_reviews: value === 'true' });
  } catch (err) {
    console.error('Review avatar toggle exception:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Nalea API listening on port ${PORT}`));
