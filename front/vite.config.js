import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend (Spring) runs on :8080 and issues session cookies + Kakao OAuth
// redirects. We proxy /api and /oauth2 through the Vite dev server (instead
// of calling :8080 directly) so the browser only ever talks to :5173 — that
// keeps the session cookie and the OAuth redirect_uri on a single origin.
// changeOrigin is intentionally left off: Spring resolves "{baseUrl}" for the
// Kakao redirect_uri from the incoming Host header, so keeping it as
// localhost:5173 makes Spring build the callback URL as
// http://localhost:5173/api/v1/auth/kakao/callback — that exact value must be
// registered as the Redirect URI in the Kakao Developers console.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
      '/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
    },
  },
})
