# BugEye Privacy Policy

Last updated: 2026

## Summary

BugEye is a browser extension for authorized VAPT, bug bounty and your own
assets. It is privacy-respecting and local-first. Recon and OSINT only: it
does not auto-send exploit payloads.

## What BugEye collects

BugEye does NOT collect, store, transmit, or sell any personal data to the
developers or any third party. No analytics, no telemetry, no tracking.

## Data stored locally

Stored ONLY in your browser via chrome.storage.local, never sent to us:

- Saved target domains and notes.
- Settings and preferences.
- Any optional API keys you enter (for example Shodan or HIBP). These stay
  local in plaintext and are sent only to that provider's own API when you use
  the related feature. Never sent to us.

Remove the extension or clear its storage to erase all of this.

## Network requests

When you use a feature, BugEye sends requests directly from your browser to
the relevant public service (for example: crt.sh, crt.name, CertSpotter,
HackerTarget (including its free WHOIS API), AlienVault OTX, Shodan
InternetDB, ipwho.is / ip-api.com, DNS-over-HTTPS resolvers, XposedOrNot,
Wayback Machine, rdap.org, who.is, Gravatar, GitHub, hstspreload.org) to provide the result
you asked for. There is no BugEye server; nothing is proxied through us. Each
service has its own privacy policy.

## Permissions

BugEye requests the minimum needed (storage, cookies, tabs, activeTab,
scripting, webRequest, declarativeNetRequest, plus Chromium sidePanel or
Firefox sidebar). Site access is requested once, the first time any feature
needs to read a page; after that single grant, every feature works on any
site with no further per-site prompts.

## Authorized use only

BugEye is intended for contracted VAPT, bug bounty, and assets you own or
are explicitly authorized to test. You are responsible for how you use it.

## Changes

Any changes will be posted at this URL.

## Contact

Open an issue on the BugEye GitHub repository:
https://github.com/Esther7171/bugeye
