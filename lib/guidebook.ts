import type { PillarId } from '@/types';

export interface ChecklistItem {
  id: string;
  label: string;
  why: string;
  jumpTo?: { pillar: PillarId; moduleId: string };
}

export interface ChecklistGroup {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export const CHECKLISTS: ChecklistGroup[] = [
  {
    id: 'upload',
    name: 'Upload testing',
    items: [
      {
        id: 'upload-max-size',
        label: 'Max file size enforced?',
        why: 'Test with ONE oversized-but-valid file - never flood the server with many large uploads.',
        jumpTo: { pillar: 'utility', moduleId: 'uploadtest' },
      },
      { id: 'upload-mime-server', label: 'MIME type validated server-side (not just client-side)?', why: 'Client-side checks are trivially bypassed by editing the request.' },
      {
        id: 'upload-magic-bytes',
        label: 'Magic-byte / content check performed?',
        why: 'A renamed file with a spoofed extension should still be rejected if the actual content does not match.',
        jumpTo: { pillar: 'utility', moduleId: 'uploadtest' },
      },
      {
        id: 'upload-double-ext',
        label: 'Double-extension blocked (e.g. x.php.jpg)?',
        why: 'Some servers only check the last extension, or misconfigured handlers execute the first.',
        jumpTo: { pillar: 'utility', moduleId: 'uploadtest' },
      },
      {
        id: 'upload-svg-sanitized',
        label: 'SVG sanitized (SVG-XSS)?',
        why: 'SVGs can embed <script> and fire XSS when rendered inline or opened directly.',
        jumpTo: { pillar: 'utility', moduleId: 'uploadtest' },
      },
      {
        id: 'upload-exif-stripped',
        label: 'EXIF stripped on stored images?',
        why: 'Uploaded photos can leak GPS coordinates and device info if metadata is preserved.',
        jumpTo: { pillar: 'osint', moduleId: 'exifpeek' },
      },
      {
        id: 'upload-separate-domain',
        label: 'Files served from a separate, non-executable domain?',
        why: 'Prevents an uploaded file from ever being executed in the app\'s own origin/context.',
      },
      {
        id: 'upload-path-traversal',
        label: 'Path traversal in filename handled?',
        why: 'A filename like ../../evil.php should not escape the intended storage directory.',
      },
    ],
  },
  {
    id: 'recon',
    name: 'Recon',
    items: [
      { id: 'recon-subdomains', label: 'Subdomains enumerated', why: 'Widens the attack surface beyond the primary host.', jumpTo: { pillar: 'osint', moduleId: 'subfinder' } },
      { id: 'recon-robots', label: 'robots.txt checked', why: 'Often reveals paths the owner wants hidden from search engines.', jumpTo: { pillar: 'utility', moduleId: 'autofinder' } },
      { id: 'recon-sitemap', label: 'sitemap.xml checked', why: 'Can reveal the full site structure at once.', jumpTo: { pillar: 'utility', moduleId: 'autofinder' } },
      { id: 'recon-wayback', label: 'Wayback Machine checked for old/removed endpoints', why: 'Historical snapshots can expose endpoints no longer linked but still live.' },
      { id: 'recon-buckets', label: 'Cloud storage buckets checked', why: 'Misconfigured S3/GCS/Azure buckets are a common source of data exposure.', jumpTo: { pillar: 'osint', moduleId: 'bucketspot' } },
      { id: 'recon-favicon', label: 'Favicon hash checked against known frameworks', why: 'Can fingerprint the underlying admin panel or framework.' },
      { id: 'recon-git', label: '.git directory exposure checked', why: 'An exposed .git folder can leak full source history.' },
    ],
  },
  {
    id: 'auth',
    name: 'Auth / session',
    items: [
      { id: 'auth-cookie-flags', label: 'Cookie flags checked (Secure/HttpOnly/SameSite)', why: 'Missing flags increase exposure to XSS/CSRF and network sniffing.', jumpTo: { pillar: 'tab-inspector', moduleId: 'cookiejar' } },
      { id: 'auth-jwt', label: 'JWT algorithm/claims inspected', why: 'Weak algorithms (none/HS256 confusion) or missing expiry are common issues.', jumpTo: { pillar: 'encode-payload', moduleId: 'encoderkit' } },
      { id: 'auth-fixation', label: 'Session fixation tested', why: 'Session ID should rotate on privilege change (e.g. login).' },
      { id: 'auth-logout', label: 'Logout actually invalidates the session server-side', why: 'A client-only logout leaves the session token valid if replayed.' },
      { id: 'auth-rate-limit', label: 'Login/reset rate-limiting present', why: 'Missing rate limits enable credential stuffing and brute force.' },
    ],
  },
  {
    id: 'headers',
    name: 'Headers',
    items: [
      { id: 'headers-csp', label: 'Content-Security-Policy present and meaningful', why: 'Mitigates XSS impact by restricting script/resource sources.', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
      { id: 'headers-hsts', label: 'Strict-Transport-Security present', why: 'Prevents protocol downgrade attacks.', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
      { id: 'headers-xfo', label: 'X-Frame-Options / frame-ancestors present', why: 'Prevents clickjacking via iframe embedding.', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
      { id: 'headers-nosniff', label: 'X-Content-Type-Options: nosniff present', why: 'Stops browsers from MIME-sniffing responses into executable types.', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
      { id: 'headers-referrer', label: 'Referrer-Policy present', why: 'Controls how much of the URL leaks to third parties on navigation.', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
      { id: 'headers-permissions', label: 'Permissions-Policy present', why: 'Restricts access to sensitive browser features (camera, geolocation, etc).', jumpTo: { pillar: 'tab-inspector', moduleId: 'headergrade' } },
    ],
  },
];
