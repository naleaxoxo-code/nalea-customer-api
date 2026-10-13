// Everything you will want to change lives here.
export const SITE = {
  name: "Mpho Sauli",
  email: "support@mphosauli.com",
  // TODO: your WhatsApp number in international format, no plus or spaces (e.g. 27821234567).
  whatsapp: "27000000000",
  instagram: "https://instagram.com/",
  tiktok: "https://tiktok.com/",
  // Booking link (Calendly, Cal.com…). Falls back to the contact form.
  booking: "#contact",
  // Shopify store used for "Buy now" checkout links.
  shop: "https://4pqks1-fs.myshopify.com",
}

export const waLink = (text: string) =>
  "https://wa.me/" + SITE.whatsapp + "?text=" + encodeURIComponent(text)

export type Pkg = {
  name: string
  price: string
  note?: string
  blurb: string
  features: string[]
  featured?: boolean
  custom?: boolean
}

export const PACKAGES: { id: string; title: string; tagline: string; items: Pkg[] }[] = [
  {
    id: "web",
    title: "Web Making",
    tagline: "Websites and Shopify stores that look like nothing else in your industry.",
    items: [
      {
        name: "Regular",
        price: "R4 500",
        blurb: "A glossy one-page site that gets you online fast.",
        features: ["1 animated landing page", "Mobile-perfect layout", "WhatsApp + contact buttons", "Basic SEO setup", "1 round of changes"],
      },
      {
        name: "Pro",
        price: "R9 500",
        blurb: "A full Shopify store or business site, built to sell.",
        features: ["Up to 6 pages or Shopify store", "Up to 25 products loaded", "Motion & scroll effects", "Payments + shipping setup", "SEO + Google indexing", "3 rounds of changes"],
        featured: true,
      },
      {
        name: "Elite",
        price: "R18 500",
        blurb: "The showpiece. Glass, 3D, motion — the site people screenshot.",
        features: ["Unlimited pages", "Custom glass & 3D animations", "Custom Shopify theme sections", "Customer accounts & apps", "Speed + SEO optimisation", "30 days of free support"],
      },
      {
        name: "Custom",
        price: "Quote",
        blurb: "Something bigger or different? We build it around you.",
        features: ["Booking systems, portals, web apps", "Integrations & automations", "Ongoing retainers"],
        custom: true,
      },
    ],
  },
  {
    id: "ads",
    title: "Ads & Brand",
    tagline: "Scroll-stopping e-commerce ads, motion and full brand kits — Canva and beyond.",
    items: [
      {
        name: "Regular",
        price: "R1 500",
        blurb: "Fresh, on-brand designs for your socials.",
        features: ["6 ad / post designs", "Canva templates you keep", "Sized for IG, TikTok & Facebook", "1 round of changes"],
      },
      {
        name: "Pro",
        price: "R3 800",
        blurb: "Ads that move — motion, effects and animation.",
        features: ["12 static designs", "4 motion / animated ads", "Logo animation", "Product mock-ups", "Mini brand kit (colours, fonts)"],
        featured: true,
      },
      {
        name: "Elite",
        price: "R6 900",
        note: "/ month",
        blurb: "Your full creative team, every month.",
        features: ["30 designs a month", "10 motion video ads", "Full brand identity & guidelines", "Launch & sale campaigns", "Priority turnaround"],
      },
      {
        name: "Custom",
        price: "Quote",
        blurb: "Weddings, events, launches and full rebrands.",
        features: ["Wedding & event visuals", "Invitations & motion reels", "Packaging & print"],
        custom: true,
      },
    ],
  },
  {
    id: "fix",
    title: "Shopify Fix",
    tagline: "Something broken on your Shopify store? I find it and fix it.",
    items: [
      {
        name: "Quick Fix",
        price: "R450",
        note: "/ issue",
        blurb: "One bug, fixed fast.",
        features: ["Broken buttons, layouts, images", "Checkout & cart issues", "Fixed within 48 hours"],
      },
      {
        name: "Store Tune-Up",
        price: "R1 800",
        blurb: "A full health check of your store.",
        features: ["Speed & mobile audit", "Up to 8 fixes", "App clean-up", "SEO & product check"],
        featured: true,
      },
      {
        name: "Care Plan",
        price: "R1 200",
        note: "/ month",
        blurb: "Never worry about your store again.",
        features: ["Unlimited small fixes", "Monthly updates & checks", "Priority WhatsApp support"],
      },
    ],
  },
]
