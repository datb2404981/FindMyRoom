import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { jsonAuthPlugin } from './server/auth.js'
export default defineConfig({
  plugins: [jsonAuthPlugin(), vue()],
  server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/data/**', '**/server/**'] } },
})
