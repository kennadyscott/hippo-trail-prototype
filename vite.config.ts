import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath} from 'node:url'

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// The lesson code in src/khi is copied from the CMS (ck12-CMS-V2, branch knowhippo-intervention) and keeps its import paths;
// these aliases point them at the copies and at small stand-ins for the two Next.js modules it uses.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      {find: '@/lib', replacement: at('./src/khi/lib')},
      {find: '@/components', replacement: at('./src/khi/components')},
      {find: 'next/link', replacement: at('./src/shims/next/link.tsx')},
      {find: 'next/navigation', replacement: at('./src/shims/next/navigation.ts')},
    ],
  },
  build: {rollupOptions: {input: {main: at('./index.html'), plan: at('./plan.html')}}},
})
