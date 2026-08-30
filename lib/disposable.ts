// Small curated list of well-known disposable/temporary email providers.
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'yopmail.com',
  'throwawaymail.com',
  'trashmail.com',
  'getnada.com',
  'fakeinbox.com',
  'dispostable.com',
  'sharklasers.com',
  'maildrop.cc',
  'mintemail.com',
  'mailnesia.com',
  'moakt.com',
  'mohmal.com',
  'emailondeck.com',
  'fakemailgenerator.com',
  'dropmail.me',
]);

export function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}
