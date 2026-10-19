// Store designs and widgets sold in the showroom.
// Files + screenshots are served from GitHub, pinned to a commit so they never change under a buyer.
const REV = "e0782beec959b17fd83ac3d691d99ae55d6db8e2"
const RAW = `https://raw.githubusercontent.com/naleaxoxo-code/nalea-customer-api/${REV}/mphosauli-site/templates`

export type Kind = "store" | "widget"

export type ShowItem = {
  slug: string
  name: string
  kind: Kind
  tag: string
  blurb: string
  html: string
  shot: string
  full: string
  mobile: string
  code: { id: string; price: number }
  install: { id: string; price: number }
}

const STORE = { code: 1500, install: 3500 }
const WIDGET = { code: 350, install: 750 }

function item(
  slug: string,
  name: string,
  kind: Kind,
  tag: string,
  blurb: string,
  codeVariant: string,
  installVariant: string,
  dir = kind === "store" ? "" : "widgets/",
): ShowItem {
  const base = `${RAW}/${dir}`
  const p = kind === "store" ? STORE : WIDGET
  return {
    slug, name, kind, tag, blurb,
    html: `${base}${slug}.html`,
    shot: `${base}shots/${slug}-desktop.jpg`,
    full: `${base}shots/${slug}-full.jpg`,
    mobile: `${base}shots/${slug}-mobile.jpg`,
    code: { id: codeVariant, price: p.code },
    install: { id: installVariant, price: p.install },
  }
}

export const SHOWROOM: ShowItem[] = [
  item("04-velvet-hour", "Velvet Hour", "store", "Luxury · Beauty", "Deep velvet tones and slow, expensive motion for premium brands.", "67716006150422", "67716006183190"),
  item("03-sunday-linen", "Sunday Linen", "store", "Fashion · Home", "Soft, airy and calm. Made for linen, homeware and slow fashion.", "67716006936854", "67716006969622"),
  item("13-the-gentlemans-cut", "The Gentleman's Cut", "store", "Grooming · Menswear", "Sharp, confident layouts for barbers, grooming and menswear.", "67716009558294", "67716009591062"),
  item("16-ubuntu-threads", "Ubuntu Threads", "store", "Proudly SA · Apparel", "Bold African-inspired energy for local clothing brands.", "67716010443030", "67716010475798"),
  item("07-retro-reel", "Retro Reel", "store", "Streetwear · Vintage", "Film-grain nostalgia with loud, playful product drops.", "67716007985430", "67716008018198"),
  item("09-bloom-and-thread", "Bloom & Thread", "store", "Florals · Crafts", "Petal-soft colours for florists, gifting and handmade goods.", "67716008706326", "67716008739094"),
  item("14-ocean-drift", "Ocean Drift", "store", "Swim · Wellness", "Cool blues and flowing sections for swim, skin and wellness.", "67716009656598", "67716009689366"),
  item("11-indigo-works", "Indigo Works", "store", "Tech · Workwear", "Clean, structured and modern for gear, tech and workwear.", "67716009165078", "67716009197846"),
  item("05-little-sprout", "Little Sprout", "store", "Kids · Baby", "Friendly, rounded and bright for kids and baby stores.", "67716007428374", "67716007461142"),
  item("17-thrift-and-tell", "Thrift & Tell", "store", "Thrift · Pre-loved", "Story-led layouts that make second-hand feel one-of-one.", "67716010869014", "67716010901782"),

  item("01-slot-machine", "Slot Machine", "widget", "Gamified discount", "Visitors spin for a discount code. Grows your email list fast.", "67716011983126", "67716012015894"),
  item("04-memory-match", "Memory Match", "widget", "Gamified discount", "A quick card-flip game that rewards shoppers with a code.", "67716013523222", "67716013555990"),
  item("01-product-spotlight", "Product Spotlight", "widget", "Conversion", "Puts your hero product centre stage with motion.", "67716012736790", "67716012769558"),
  item("04-new-arrival-slidein", "New Arrival Slide-in", "widget", "Conversion", "A slide-in card that announces your latest drop.", "67716013949206", "67716013981974"),
  item("05-bundle-deal-stack", "Bundle Deal Stack", "widget", "Bigger orders", "Stacked bundle offers that raise your average order value.", "67716014670102", "67716014702870"),
  item("upsell-components", "Upsell Components", "widget", "Bigger orders", "A pack of upsell blocks for product and cart pages.", "67716015063318", "67716015096086"),
  item("sa-holidays-2026", "SA Holidays 2026", "widget", "Campaigns", "Ready-made banners for every South African holiday in 2026.", "67716015784214", "67716015816982"),
  item("16-amethyst-glass", "Amethyst Glass", "widget", "Glass info card", "Live clock, local weather, order tracking and chat in purple glass.", "67716016242966", "67716016275734", ""),
  item("17-citrine-glass", "Citrine Glass", "widget", "Glass info card", "The glass info card in warm citrine.", "67716016963862", "67716016996630", ""),
  item("18-graphite-chrome", "Graphite Chrome", "widget", "Glass info card", "The glass info card in cool graphite chrome.", "67716017684758", "67716017717526", ""),
  item("19-rose-gold", "Rose Gold", "widget", "Glass info card", "The glass info card in rose gold.", "67716018077974", "67716018110742", ""),
  item("20-ocean-glass", "Ocean Glass", "widget", "Glass info card", "The glass info card in ocean blue.", "67716018798870", "67716018831638", ""),
]

export const rand = (n: number) => "R" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
