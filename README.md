VidGen Ad Studio — AI-ready Frontend (Proxy-first)

Files:
- index.html
- style.css
- app.js

What it is:
- A single-page, AI-ready frontend that prefers calling a server proxy for AI tasks (recommended).
- If no proxy is set, you may paste an OpenAI API key in settings for quick local testing (NOT secure for production).
- Works offline with local fallbacks (rule-based copy + placeholder images).

How to use (proxy recommended):
1. Unzip and host these files on any static host (Vercel/Netlify/GitHub Pages).
2. Run a server proxy (example server provided earlier) that exposes:
   - POST /generate-copy  -> { prompt, tone }  returns { headline, sub, cta }
   - POST /generate-image -> { prompt } returns { imageUrl }
3. Open the app, click AI Settings, set Proxy Base URL (e.g., http://localhost:4000), save.
4. Use Generate Copy / Generate Image. The app will call your proxy and return results.
5. Apply generated content to the canvas, edit, save locally, export PNG/HTML, or download projects as JSON.

In-browser key (developer/testing only):
- Paste OpenAI key into settings. The app will call OpenAI directly if no proxy is configured.
- Security warning: Do NOT use this on public-hosted pages — your key would be visible to users.

Notes:
- For production, always use a server proxy that keeps keys secret and enforces quotas.
- Image generation may return remote URLs; the app attempts to convert to data URLs for reliable export.
