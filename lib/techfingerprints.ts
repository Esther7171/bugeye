// Wappalyzer-style client-side fingerprint dataset. Originally authored for
// BugEye (not a verbatim import of any third-party technologies.json), using
// the same detection categories and signal types as the reference tools:
// response headers, cookie names, meta generator tags, script/stylesheet URL
// patterns, and JS globals exposed on the page. Dynamically imported from
// TechStack so this data does not load with the module itself, only when a
// scan actually runs.
import type { TechHit } from './techstack';

export type TechCategory =
  | 'Frameworks'
  | 'JS libraries'
  | 'UI'
  | 'Analytics'
  | 'Tag managers'
  | 'CDN'
  | 'Security'
  | 'Payment'
  | 'CMS / Ecommerce'
  | 'Hosting'
  | 'Monitoring'
  | 'Chat / Support'
  | 'Fonts';

export interface TechFingerprint {
  name: string;
  category: TechCategory;
  headers?: { header: string; pattern?: RegExp }[];
  cookies?: RegExp[];
  scriptSrc?: RegExp[];
  styleSrc?: RegExp[];
  metaGenerator?: RegExp;
  jsGlobals?: string[];
}

export const TECH_FINGERPRINTS: TechFingerprint[] = [
  // Frameworks
  { name: 'React', category: 'Frameworks', jsGlobals: ['React', 'ReactDOM'], scriptSrc: [/react(-dom)?(\.production)?(\.min)?\.js/i] },
  { name: 'Next.js', category: 'Frameworks', jsGlobals: ['__NEXT_DATA__'], scriptSrc: [/_next\/static\//i] },
  { name: 'Vue.js', category: 'Frameworks', jsGlobals: ['Vue', '__VUE__'], scriptSrc: [/vue(\.global)?(\.runtime)?(\.min)?\.js/i] },
  { name: 'Nuxt.js', category: 'Frameworks', jsGlobals: ['__NUXT__'], scriptSrc: [/_nuxt\//i] },
  { name: 'Angular', category: 'Frameworks', jsGlobals: ['angular', 'ng'], scriptSrc: [/angular(\.min)?\.js/i] },
  { name: 'Ember.js', category: 'Frameworks', jsGlobals: ['Ember'], scriptSrc: [/ember(\.min|\.debug)?\.js/i] },
  { name: 'Svelte', category: 'Frameworks', scriptSrc: [/svelte/i] },
  { name: 'Alpine.js', category: 'Frameworks', jsGlobals: ['Alpine'], scriptSrc: [/alpinejs(@[\d.]+)?(\.min)?\.js/i] },
  { name: 'htmx', category: 'Frameworks', jsGlobals: ['htmx'], scriptSrc: [/htmx(\.min)?\.js/i] },
  { name: 'Backbone.js', category: 'Frameworks', jsGlobals: ['Backbone'], scriptSrc: [/backbone(\.min)?\.js/i] },

  // JS libraries
  { name: 'jQuery', category: 'JS libraries', jsGlobals: ['jQuery'], scriptSrc: [/jquery(-[\d.]+)?(\.min|\.slim)?\.js/i] },
  { name: 'Lodash', category: 'JS libraries', scriptSrc: [/lodash(\.min)?\.js/i] },
  { name: 'D3.js', category: 'JS libraries', jsGlobals: ['d3'], scriptSrc: [/d3(\.v\d+)?(\.min)?\.js/i] },
  { name: 'Three.js', category: 'JS libraries', jsGlobals: ['THREE'], scriptSrc: [/three(\.min)?\.js/i] },
  { name: 'Chart.js', category: 'JS libraries', jsGlobals: ['Chart'], scriptSrc: [/chart(\.min|\.umd)?\.js/i] },
  { name: 'Moment.js', category: 'JS libraries', jsGlobals: ['moment'], scriptSrc: [/moment(\.min)?\.js/i] },
  { name: 'Axios', category: 'JS libraries', scriptSrc: [/axios(\.min)?\.js/i] },
  { name: 'GSAP', category: 'JS libraries', jsGlobals: ['gsap'], scriptSrc: [/gsap(\.min)?\.js/i] },
  { name: 'Swiper', category: 'JS libraries', jsGlobals: ['Swiper'], scriptSrc: [/swiper(-bundle)?(\.min)?\.js/i] },

  // UI / CSS frameworks (also see class-token heuristics in TechStack.tsx)
  { name: 'Bootstrap', category: 'UI', jsGlobals: ['bootstrap'], scriptSrc: [/bootstrap(\.bundle)?(\.min)?\.js/i], styleSrc: [/bootstrap(\.min)?\.css/i] },
  { name: 'Bulma', category: 'UI', styleSrc: [/bulma(\.min)?\.css/i] },
  { name: 'Foundation', category: 'UI', jsGlobals: ['Foundation'], scriptSrc: [/foundation(\.min)?\.js/i] },
  { name: 'Semantic UI', category: 'UI', styleSrc: [/semantic(\.min)?\.css/i] },

  // Analytics
  { name: 'Google Analytics', category: 'Analytics', jsGlobals: ['ga', 'gtag'], scriptSrc: [/googletagmanager\.com\/gtag|google-analytics\.com\/analytics\.js/i] },
  { name: 'Google Tag Manager', category: 'Tag managers', jsGlobals: ['dataLayer', 'google_tag_manager'], scriptSrc: [/googletagmanager\.com\/gtm\.js/i] },
  { name: 'Segment', category: 'Analytics', jsGlobals: ['analytics'], scriptSrc: [/cdn\.segment\.com/i] },
  { name: 'Mixpanel', category: 'Analytics', jsGlobals: ['mixpanel'], scriptSrc: [/cdn\.mxpnl\.com/i] },
  { name: 'Hotjar', category: 'Analytics', jsGlobals: ['hj'], scriptSrc: [/static\.hotjar\.com/i] },
  { name: 'Amplitude', category: 'Analytics', jsGlobals: ['amplitude'], scriptSrc: [/cdn\.amplitude\.com/i] },
  { name: 'Plausible', category: 'Analytics', scriptSrc: [/plausible\.io\/js/i] },
  { name: 'Matomo / Piwik', category: 'Analytics', jsGlobals: ['Matomo', 'Piwik'], scriptSrc: [/matomo\.js|piwik\.js/i] },
  { name: 'Adobe Analytics', category: 'Analytics', jsGlobals: ['s_gi'], scriptSrc: [/assets\.adobedtm\.com|omtrdc\.net/i] },
  { name: 'Meta Pixel', category: 'Analytics', jsGlobals: ['fbq'], scriptSrc: [/connect\.facebook\.net\/.*fbevents/i] },
  { name: 'Microsoft Clarity', category: 'Analytics', jsGlobals: ['clarity'], scriptSrc: [/clarity\.ms/i] },
  { name: 'Yandex Metrica', category: 'Analytics', jsGlobals: ['ym'], scriptSrc: [/mc\.yandex\.ru/i] },

  // Tag managers / consent
  { name: 'OneTrust', category: 'Tag managers', jsGlobals: ['OneTrust'], scriptSrc: [/cdn\.cookielaw\.org|onetrust\.com/i] },
  { name: 'Cookiebot', category: 'Tag managers', jsGlobals: ['Cookiebot'], scriptSrc: [/consent\.cookiebot\.com/i] },
  { name: 'Termly', category: 'Tag managers', scriptSrc: [/app\.termly\.io/i] },
  { name: 'TrustArc', category: 'Tag managers', scriptSrc: [/consent\.trustarc\.com/i] },

  // CDN
  { name: 'Cloudflare', category: 'CDN', headers: [{ header: 'server', pattern: /cloudflare/i }, { header: 'cf-ray' }], cookies: [/^__cfduid$|^cf_clearance$/i] },
  { name: 'Fastly', category: 'CDN', headers: [{ header: 'x-served-by', pattern: /cache-/i }, { header: 'x-fastly-request-id' }] },
  { name: 'Akamai', category: 'CDN', headers: [{ header: 'server', pattern: /akamaighost/i }, { header: 'x-akamai-transformed' }] },
  { name: 'Amazon CloudFront', category: 'CDN', headers: [{ header: 'via', pattern: /cloudfront/i }, { header: 'x-amz-cf-id' }] },
  { name: 'Vercel', category: 'CDN', headers: [{ header: 'server', pattern: /vercel/i }, { header: 'x-vercel-id' }] },
  { name: 'Netlify', category: 'CDN', headers: [{ header: 'server', pattern: /netlify/i }, { header: 'x-nf-request-id' }] },
  { name: 'jsDelivr', category: 'CDN', scriptSrc: [/cdn\.jsdelivr\.net/i], styleSrc: [/cdn\.jsdelivr\.net/i] },
  { name: 'cdnjs', category: 'CDN', scriptSrc: [/cdnjs\.cloudflare\.com/i], styleSrc: [/cdnjs\.cloudflare\.com/i] },
  { name: 'unpkg', category: 'CDN', scriptSrc: [/unpkg\.com/i] },

  // Security (client-detectable bot/challenge widgets and WAF markers)
  { name: 'Google reCAPTCHA', category: 'Security', jsGlobals: ['grecaptcha'], scriptSrc: [/www\.gstatic\.com\/recaptcha|www\.google\.com\/recaptcha/i] },
  { name: 'hCaptcha', category: 'Security', jsGlobals: ['hcaptcha'], scriptSrc: [/hcaptcha\.com/i] },
  { name: 'Cloudflare Turnstile', category: 'Security', jsGlobals: ['turnstile'], scriptSrc: [/challenges\.cloudflare\.com\/turnstile/i] },
  { name: 'Sucuri', category: 'Security', headers: [{ header: 'x-sucuri-id' }, { header: 'server', pattern: /sucuri/i }] },
  { name: 'Imperva / Incapsula', category: 'Security', cookies: [/^incap_ses_|^visid_incap_/i], headers: [{ header: 'x-iinfo' }] },
  { name: 'PerimeterX / HUMAN', category: 'Security', scriptSrc: [/px-cdn\.net|humansecurity\.com/i] },

  // Payment
  { name: 'Stripe', category: 'Payment', jsGlobals: ['Stripe'], scriptSrc: [/js\.stripe\.com/i] },
  { name: 'PayPal', category: 'Payment', jsGlobals: ['paypal'], scriptSrc: [/paypal\.com\/sdk\/js|paypalobjects\.com/i] },
  { name: 'Braintree', category: 'Payment', jsGlobals: ['braintree'], scriptSrc: [/js\.braintreegateway\.com/i] },
  { name: 'Adyen', category: 'Payment', jsGlobals: ['AdyenCheckout'], scriptSrc: [/checkoutshopper-live\.adyen\.com/i] },
  { name: 'Square', category: 'Payment', jsGlobals: ['Square'], scriptSrc: [/js\.squareup\.com/i] },
  { name: 'Klarna', category: 'Payment', jsGlobals: ['Klarna'], scriptSrc: [/x\.klarnacdn\.net/i] },

  // CMS / Ecommerce
  { name: 'WordPress', category: 'CMS / Ecommerce', metaGenerator: /wordpress/i, scriptSrc: [/wp-content\/|wp-includes\//i] },
  { name: 'Shopify', category: 'CMS / Ecommerce', jsGlobals: ['Shopify'], scriptSrc: [/cdn\.shopify\.com/i], cookies: [/^_shopify_/i] },
  { name: 'WooCommerce', category: 'CMS / Ecommerce', scriptSrc: [/woocommerce/i] },
  { name: 'Magento', category: 'CMS / Ecommerce', scriptSrc: [/mage\/cookies\.js|Magento_/i] },
  { name: 'BigCommerce', category: 'CMS / Ecommerce', jsGlobals: ['BCData'], scriptSrc: [/cdn11\.bigcommerce\.com/i] },
  { name: 'Wix', category: 'CMS / Ecommerce', metaGenerator: /wix\.com/i, scriptSrc: [/static\.wixstatic\.com/i] },
  { name: 'Squarespace', category: 'CMS / Ecommerce', metaGenerator: /squarespace/i, scriptSrc: [/static1\.squarespace\.com/i] },
  { name: 'Webflow', category: 'CMS / Ecommerce', jsGlobals: ['Webflow'], metaGenerator: /webflow/i },
  { name: 'Ghost', category: 'CMS / Ecommerce', metaGenerator: /ghost/i },
  { name: 'Drupal', category: 'CMS / Ecommerce', metaGenerator: /drupal/i },
  { name: 'Joomla', category: 'CMS / Ecommerce', metaGenerator: /joomla/i },

  // Hosting
  { name: 'Heroku', category: 'Hosting', headers: [{ header: 'via', pattern: /heroku/i }] },
  { name: 'Firebase Hosting', category: 'Hosting', headers: [{ header: 'server', pattern: /firebase/i }] },
  { name: 'GitHub Pages', category: 'Hosting', headers: [{ header: 'server', pattern: /GitHub\.com/i }] },
  { name: 'Render', category: 'Hosting', headers: [{ header: 'server', pattern: /^render$/i }] },

  // Monitoring / error tracking
  { name: 'Sentry', category: 'Monitoring', jsGlobals: ['Sentry', '__SENTRY__'], scriptSrc: [/browser\.sentry-cdn\.com|js\.sentry-cdn\.com/i] },
  { name: 'Datadog RUM', category: 'Monitoring', jsGlobals: ['DD_RUM', 'DD_LOGS'], scriptSrc: [/datadoghq-browser-agent\.com/i] },
  { name: 'New Relic', category: 'Monitoring', jsGlobals: ['NREUM'], scriptSrc: [/js-agent\.newrelic\.com/i] },
  { name: 'Bugsnag', category: 'Monitoring', jsGlobals: ['Bugsnag'], scriptSrc: [/unpkg\.com\/@bugsnag/i] },
  { name: 'LogRocket', category: 'Monitoring', jsGlobals: ['LogRocket'], scriptSrc: [/cdn\.lr-in(-cdn|geration)?\.com|cdn\.logrocket\.io/i] },
  { name: 'Rollbar', category: 'Monitoring', jsGlobals: ['Rollbar'], scriptSrc: [/cdn\.rollbar\.com/i] },

  // Chat / support
  { name: 'Intercom', category: 'Chat / Support', jsGlobals: ['Intercom'], scriptSrc: [/widget\.intercom\.io/i] },
  { name: 'Zendesk', category: 'Chat / Support', jsGlobals: ['zE', 'zEmbed'], scriptSrc: [/static\.zdassets\.com/i] },
  { name: 'Drift', category: 'Chat / Support', jsGlobals: ['drift'], scriptSrc: [/js\.driftt\.com/i] },
  { name: 'Crisp', category: 'Chat / Support', jsGlobals: ['$crisp'], scriptSrc: [/client\.crisp\.chat/i] },
  { name: 'Tawk.to', category: 'Chat / Support', jsGlobals: ['Tawk_API'], scriptSrc: [/embed\.tawk\.to/i] },
  { name: 'HubSpot', category: 'Chat / Support', jsGlobals: ['_hsq', 'HubSpotConversations'], scriptSrc: [/js\.hs-scripts\.com|js\.hubspot\.com|js\.hs-analytics\.net/i] },

  // Fonts
  { name: 'Google Fonts', category: 'Fonts', styleSrc: [/fonts\.googleapis\.com/i] },
  { name: 'Adobe Fonts (Typekit)', category: 'Fonts', scriptSrc: [/use\.typekit\.net/i] },
  { name: 'Font Awesome', category: 'Fonts', styleSrc: [/font-?awesome|kit\.fontawesome\.com/i], scriptSrc: [/kit\.fontawesome\.com/i] },
];

export function allJsGlobals(): string[] {
  return Array.from(new Set(TECH_FINGERPRINTS.flatMap((f) => f.jsGlobals ?? [])));
}

function getHeader(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

export interface MatchInputs {
  headers: Record<string, string>;
  cookieNames: string[];
  scriptSrcs: string[];
  styleSrcs: string[];
  metaGenerator: string | null;
  globals: string[];
}

export function matchFingerprints(input: MatchInputs): TechHit[] {
  const hits: TechHit[] = [];

  for (const fp of TECH_FINGERPRINTS) {
    let matched: { source: TechHit['source']; detail: string } | null = null;

    if (!matched && fp.headers) {
      for (const h of fp.headers) {
        const val = getHeader(input.headers, h.header);
        if (val !== undefined && (!h.pattern || h.pattern.test(val))) {
          matched = { source: 'header', detail: `${h.header} header` };
          break;
        }
      }
    }
    if (!matched && fp.cookies) {
      for (const pattern of fp.cookies) {
        const hit = input.cookieNames.find((n) => pattern.test(n));
        if (hit) {
          matched = { source: 'cookie', detail: `Cookie: ${hit}` };
          break;
        }
      }
    }
    if (!matched && fp.metaGenerator && input.metaGenerator && fp.metaGenerator.test(input.metaGenerator)) {
      matched = { source: 'meta', detail: 'meta[name=generator]' };
    }
    if (!matched && fp.scriptSrc) {
      for (const pattern of fp.scriptSrc) {
        const hit = input.scriptSrcs.find((s) => pattern.test(s));
        if (hit) {
          matched = { source: 'script', detail: hit };
          break;
        }
      }
    }
    if (!matched && fp.styleSrc) {
      for (const pattern of fp.styleSrc) {
        const hit = input.styleSrcs.find((s) => pattern.test(s));
        if (hit) {
          matched = { source: 'script', detail: hit };
          break;
        }
      }
    }
    if (!matched && fp.jsGlobals) {
      const hit = fp.jsGlobals.find((g) => input.globals.includes(g));
      if (hit) matched = { source: 'dom', detail: `window.${hit}` };
    }

    if (matched) hits.push({ name: fp.name, category: fp.category, source: matched.source, detail: matched.detail });
  }

  return hits;
}
