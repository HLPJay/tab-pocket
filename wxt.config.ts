import { defineConfig } from 'wxt'

export default defineConfig({
  extensionApi: 'chrome',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Tab Pocket',
    description: 'A lightweight sidebar tool for managing browser tabs.',
    permissions: ['tabs', 'storage', 'sidePanel'],
    action: {},
  },
})
