import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'BugEye',
    description:
      'BugEye - spot what others miss. Minimal-permission recon, OSINT and pentest triage toolkit. Authorized targets only.',
    version: '0.1.0',
    permissions: [
      'storage',
      'cookies',
      'tabs',
      'sidePanel',
      'activeTab',
      'scripting',
      'webRequest',
      'declarativeNetRequest',
    ],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: {},
    side_panel: {
      default_path: 'sidepanel.html',
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+K',
        },
        description: 'Open BugEye side panel',
      },
    },
  },
});
