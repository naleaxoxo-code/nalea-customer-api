# Nalea Customer API

Shopify App Proxy server for saving customer metafields from the storefront.

## Environment Variables (set in Railway)

| Variable | Description |
|---|---|
| `SHOPIFY_STORE` | Your store domain e.g. `nalea-xoxo.myshopify.com` |
| `SHOPIFY_ADMIN_TOKEN` | Admin API access token from Shopify Dev Dashboard |
| `SHOPIFY_PROXY_SECRET` | App proxy shared secret from Shopify Dev Dashboard |

## Endpoint

`POST /apps/nalea/customer` — updates customer metafields

### Body
```json
{
  "namespace": "custom",
  "metafields": [
    { "key": "gender", "value": "Female", "type": "single_line_text_field" },
    { "key": "pronouns", "value": "She/Her", "type": "single_line_text_field" }
  ]
}
```
