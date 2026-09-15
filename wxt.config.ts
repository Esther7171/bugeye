import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  // Firefox defaults to MV2 in WXT; MV3 is required for optional host
  // permissions and declarativeNetRequest session rules.
  manifestVersion: 3,
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: ({ browser }) => {
    const chrome = browser !== 'firefox';
    return {
      name: 'BugEye',
      description:
        'BugEye - spot what others miss. Recon, OSINT and pentest triage for authorized VAPT. No auto-exploitation.',
      version: '1.0.2',
      // sidePanel is Chrome/Edge only. WXT maps entrypoints/sidepanel to
      // side_panel (Chrome) or sidebar_action (Firefox), do not declare
      // sidePanel here or Firefox rejects the addon.
      permissions: [
        'storage',
        'cookies',
        'tabs',
        'activeTab',
        'scripting',
        'webRequest',
        'declarativeNetRequest',
        ...(chrome ? (['sidePanel'] as const) : []),
      ],
      optional_host_permissions: ['http://*/*', 'https://*/*'],
      action: {},
      commands: chrome
        ? {
            _execute_action: {
              suggested_key: {
                default: 'Ctrl+Shift+K',
                mac: 'Command+Shift+K',
              },
              description: 'Open BugEye side panel',
            },
          }
        : {
            _execute_sidebar_action: {
              suggested_key: {
                default: 'Ctrl+Shift+K',
                mac: 'Command+Shift+K',
              },
              description: 'Open BugEye sidebar',
            },
          },
      ...(chrome
        ? {}
        : {
            browser_specific_settings: {
              gecko: {
                id: 'bugeye-recon@esther7171.github.io',
                strict_min_version: '128.0',
                // AMO requires new extensions to declare data collection. BugEye
                // collects nothing (no telemetry, no data sent to us), so this is
                // the explicit "none" declaration.
                data_collection_permissions: { required: ['none'] },
              },
            },
          }),
    };
  },
});
