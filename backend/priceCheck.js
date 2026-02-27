const fetch = require('node-fetch');
const { checkRate } = require('./rateLimit');
const cache = require('./cache');

const SERPAPI_KEY = process.env.SERPAPI_KEY;

// ── Extract product name from URL slug (no HTTP request needed) ──
function extractNameFromUrl(url) {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);
    const skip = new Set([
      'products', 'product', 'p', 'dp', 'item', 'items',
      'shop', 'store', 'buy', 'detail', 'details', 'pd', 'ip',
    ]);
    const candidates = segments.filter(
      (s) => !skip.has(s.toLowerCase()) && s.length > 3,
    );
    if (candidates.length === 0) return null;
    const slug = candidates.reduce((a, b) => (a.length >= b.length ? a : b));
    return slug
      .replace(/[-_]+/g, ' ')
      .replace(/[^a-z0-9 ]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
  } catch {
    return null;
  }
}

// ── Try fetching the HTML <title> (may fail on some sites like Coach) ──
async function fetchPageTitle(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GirlMathBot/1.0)' },
      timeout: 6000,
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match && match[1]) {
      const title = match[1]
        .replace(
          /\s*[-|]+\s*(Amazon|Walmart|Target|eBay|Best Buy|Nordstrom|Coach|Sephora|Ulta).*$/i,
          '',
        )
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .trim()
        .slice(0, 120);
      const bad = [
        'access denied', '403', '404', 'not found', 'error', 'just a moment',
      ];
      if (bad.some((b) => title.toLowerCase().includes(b))) return null;
      return title;
    }
  } catch (err) {
    console.log('Page title fetch skipped:', err.message);
  }
  return null;
}

// ── Resolve product name: try page title first, fall back to URL slug ──
async function resolveProductName(url) {
  const title = await fetchPageTitle(url);
  if (title) return title;
  return extractNameFromUrl(url);
}

// ── Search SerpAPI Google Shopping ──
async function searchPrices(productName) {
  const params = [
    'engine=google_shopping',
    'q=' + encodeURIComponent(productName),
    'api_key=' + SERPAPI_KEY,
    'num=10',
    'gl=us',
    'hl=en',
  ].join('&');

  const res = await fetch('https://serpapi.com/search.json?' + params);
  if (!res.ok) {
    const body = await res.text();
    console.error('SerpAPI error:', res.status, body.slice(0, 200));
    throw new Error('SerpAPI ' + res.status);
  }
  return res.json();
}

// ── Parse shopping_results into structured price data ──
function parseResults(data, userPrice) {
  const items = data.shopping_results || [];
  const options = [];

  for (const item of items) {
    let price = null;
    if (item.extracted_price != null) {
      price = item.extracted_price;
    } else if (item.price) {
      price = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    }
    if (!price || price <= 0 || price > 50000) continue;

    const store = item.source || 'Unknown';
    const title = item.title || '';
    const note = extractNote(item.extensions || []);
    options.push({ store, price, note, title });
  }

  if (options.length === 0) return null;

  // ══════════════════════════════════════════════════════════
  //  ONLY KEEP MAJOR RETAILERS — they are the price authority
  // ══════════════════════════════════════════════════════════
  const knownRetailers = new Set([
    // Department stores
    'amazon', 'walmart', 'target', 'nordstrom', 'macys', "macy's",
    'bloomingdales', "bloomingdale's", 'jcpenney', 'neiman marcus',
    'saks fifth avenue', 'marshalls', 'tj maxx', 'tjmaxx', 'ross',
    'burlington', 'kohls', "kohl's",
    // Beauty
    'sephora', 'sephora.com', 'ulta', 'ulta beauty', 'glossier',
    'fenty beauty', 'nars cosmetics', 'mac cosmetics', 'clinique',
    'estee lauder', 'bobbi brown', 'charlotte tilbury', 'rare beauty',
    'too faced', 'urban decay', 'benefit cosmetics', 'tarte',
    // Fashion
    'nike', 'adidas', 'lululemon', 'gap', 'old navy', 'zara', 'h&m',
    'anthropologie', 'free people', 'urban outfitters', 'asos',
    'revolve', 'ssense', 'farfetch', 'net-a-porter', 'shein', 'temu',
    'uniqlo', 'mango', 'cos stores', 'everlane', 'abercrombie',
    // Luxury
    'coach', 'coachoutlet.com', 'kate spade', 'michael kors',
    'tory burch', 'gucci', 'louis vuitton', 'prada', 'burberry',
    'harrods', 'selfridges', 'selfridges.com',
    // Electronics
    'best buy', 'b&h photo', 'apple', 'samsung', 'sony', 'dell',
    'hp', 'lenovo', 'microsoft', 'gamestop',
    // Home
    'wayfair', 'home depot', 'lowes', 'ikea', 'williams sonoma',
    'pottery barn', 'crate & barrel', 'west elm', 'cb2',
    // Shoes / sports
    'zappos', 'footlocker', 'finish line', 'dick\'s sporting goods',
    'rei', 'nike.com', 'adidas.com',
    // Pets
    'petco', 'petsmart', 'chewy',
    // Marketplace / resale
    'ebay', 'etsy', 'poshmark', 'mercari', 'depop',
    // Grocery / drugstore
    'walgreens', 'cvs', 'costco', 'sam\'s club',
    // Catch-all for brand official stores
    'overstock', 'qvc', 'hsn',
    'bath & body works', 'victoria\'s secret',
    'dyson', 'dyson.com',
    'dollar tree', 'five below',
  ]);

  function isKnown(store) {
    const low = store.toLowerCase().trim();
    if (knownRetailers.has(low)) return true;
    // Check if the store name contains a known retailer name as a whole word
    // Use word boundary matching to avoid "Cross Courtage" matching "ross"
    for (const k of knownRetailers) {
      if (k.length < 4) continue;
      // Build a regex with word boundaries for the retailer name
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('\\b' + escaped + '\\b', 'i');
      if (re.test(store)) return true;
    }
    return false;
  }

  // Only keep results from known retailers
  let filtered = options.filter((o) => isKnown(o.store));

  // If no known retailers found at all, fall back to all results
  // (better to show something than nothing)
  if (filtered.length === 0) filtered = options;

  // Deduplicate by store (keep cheapest per store)
  const byStore = new Map();
  for (const opt of filtered) {
    const existing = byStore.get(opt.store);
    if (!existing || opt.price < existing.price) {
      byStore.set(opt.store, opt);
    }
  }

  // Show up to 5 results sorted by price
  const topOptions = Array.from(byStore.values())
    .sort((a, b) => a.price - b.price)
    .slice(0, 5);

  const prices = topOptions.map((o) => o.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const cheapest = prices[0];
  const median = prices[Math.floor(prices.length / 2)];

  // Verdict: compare USER's price against major retailer prices
  let verdict = 'fair';
  if (userPrice && userPrice > 0) {
    if (userPrice <= cheapest * 1.05) {
      verdict = 'steal';
    } else if (userPrice >= median * 1.15) {
      verdict = 'overpriced';
    }
  } else {
    if (high > 0 && cheapest <= high * 0.6) verdict = 'steal';
    else if (cheapest >= high * 0.92 && high - low > 5) verdict = 'overpriced';
  }

  return {
    verdict,
    range: {
      low: Math.round(low * 100) / 100,
      high: Math.round(high * 100) / 100,
    },
    topOptions: topOptions.map((o) => ({
      store: o.store,
      price: Math.round(o.price * 100) / 100,
      note: o.note || undefined,
    })),
  };
}

function extractNote(extensions) {
  if (!Array.isArray(extensions)) return undefined;
  const joined = extensions.join(' ').toLowerCase();
  if (joined.includes('free shipping') || joined.includes('free delivery'))
    return 'free shipping';
  if (joined.includes('sale') || joined.includes('% off')) return 'on sale';
  if (joined.includes('clearance')) return 'clearance';
  return undefined;
}

// ── Express handler ──
async function priceCheckHandler(req, res) {
  try {
    const { productName, userPrice, deviceId } = req.body;
    console.log(`💰 price-check | product="${productName}" price=${userPrice} device=${deviceId || 'unknown'}`);

    if (!productName || typeof productName !== 'string' || productName.trim().length < 2) {
      return res.status(400).json({ error: 'Missing product name' });
    }

    const cleanName = productName.trim().slice(0, 120);
    const userId = deviceId || req.ip || 'unknown';

    // Rate limit
    const rate = checkRate(userId);
    if (!rate.allowed) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message:
          'You have used all ' +
          (process.env.MAX_CHECKS_PER_USER_PER_DAY || 3) +
          ' price checks today. Come back tomorrow!',
        remaining: 0,
      });
    }

    // Cache by product name (lowercase for consistency)
    const cacheKey = cleanName.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached) {
      // Re-calculate verdict with current userPrice even on cache hit
      const up = parseFloat(userPrice) || 0;
      if (up > 0) {
        cached.verdict = computeVerdict(cached.topOptions, up);
      }
      return res.json({ ...cached, remaining: rate.remaining, cached: true });
    }

    // API key check
    if (!SERPAPI_KEY || SERPAPI_KEY === 'your_serpapi_key_here') {
      return res.status(503).json({
        error: 'API not configured',
        message: 'Add your SerpAPI key to .env',
      });
    }

    console.log('Searching prices for: "' + cleanName + '"');

    // Search
    const searchData = await searchPrices(cleanName);
    searchData._query = cleanName; // attach query for relevance scoring
    const result = parseResults(searchData, parseFloat(userPrice) || 0);

    if (!result) {
      return res.status(404).json({
        error: 'No prices found',
        message: 'No comparison prices found for "' + cleanName + '"',
        productTitle: cleanName,
      });
    }

    result.productTitle = cleanName;
    cache.set(cacheKey, result);

    return res.json({ ...result, remaining: rate.remaining, cached: false });
  } catch (err) {
    console.error('Price check error:', err);
    return res.status(500).json({
      error: 'Server error',
      message: 'Something broke! Try again in a sec.',
    });
  }
}

// Helper to re-compute verdict when user price changes on cached results
function computeVerdict(topOptions, userPrice) {
  if (!topOptions || topOptions.length === 0) return 'fair';
  const cheapest = topOptions[0].price;
  const prices = topOptions.map(o => o.price);
  const median = prices[Math.floor(prices.length / 2)];
  if (userPrice <= cheapest * 1.05) return 'steal';
  if (userPrice >= median * 1.15) return 'overpriced';
  return 'fair';
}

module.exports = { priceCheckHandler };
