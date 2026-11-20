# Security Policy & Architecture — Domino Sky

This document details the security posture, threat model, and defense-in-depth architecture implemented across **Domino Sky**.

---

## 1. Threat Model & Key Risks

| Threat Category | Potential Attack Vector | Impact | Mitigations |
|---|---|---|---|
| **Secret Leakage** | Bundling server API keys into browser assets | Unauthorized API usage, quota theft | Server-only secrets via `.env`, verified 0 occurrences in `dist/` |
| **Denial of Service (DoS)** | Sending oversized payloads to backend routes | Heap exhaustion, server crash | 256 KB hard limit with immediate stream destruction (`413`) |
| **API Quota Exhaustion** | Automated spamming of the AI dispatch endpoint | High API costs, service degradation | In-memory sliding-window rate limiter (10 req/min/IP, `429`) |
| **Information Leakage** | Returning upstream API errors or stack traces | Exposing internals or credentials | Errors logged server-side only; sanitized generic client responses |
| **Prompt Injection** | Crafting malicious dispatcher queries to hijack AI | Hallucination, rule violations | 300-char length cap, control char removal, tag encapsulation |
| **Client Injection (XSS)** | Malicious URL hash or model response HTML | Session compromise, script execution | Zero `dangerouslySetInnerHTML`, strict hash parsing, strict CSP |
| **Cross-Origin Hijacking** | Unauthorized third-party origins calling API | Data tampering, CSRF | Origin-restricted CORS, preflight validation, anti-framing |

---

## 2. Secrets Management & Isolation

1. **Server-Only Credentials**:
   - `GEMINI_API_KEY` and `GEMINI_MODEL` are loaded exclusively inside `server/` via `process.env`.
   - The Vite frontend code interacts solely with the local relative endpoint `/api/dispatch`. No API keys exist in `src/`.
2. **Repository Protection**:
   - `.env` and `.env.local` are explicitly excluded in `.gitignore`.
   - `.env.example` contains non-secret placeholder variables only.
   - Automated git history and bundle distribution scans verify that no Google API key patterns (`AIza...`) exist in client-side bundles.

---

## 3. Backend Route Defense (`/api/dispatch`)

### A. Request Size Limiting
- Incoming request streams are monitored in real time. If total bytes exceed **256 KB** (`262,144 bytes`), the socket is destroyed immediately and the server responds with:
  ```json
  HTTP/1.1 413 Payload Too Large
  Content-Type: application/json

  {"error": "Payload too large. Maximum body size is 256KB."}
  ```

### B. Content-Type and HTTP Method Enforcement
- Only `POST` (and preflight `OPTIONS`) are accepted. Non-POST requests receive `405 Method Not Allowed` with an `Allow: POST` header.
- The `Content-Type` header must include `application/json`; requests with missing or alternative MIME types receive `415 Unsupported Media Type`.

### C. Per-IP Rate Limiting
- The server tracks request timestamps per client IP over a sliding **60-second window**.
- Max allowance: **10 requests per minute**.
- When exceeded, requests are immediately rejected:
  ```json
  HTTP/1.1 429 Too Many Requests
  Retry-After: 60
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 0

  {"error": "Too many requests. Please wait before requesting another AI recommendation."}
  ```

### D. Strict Request Schema Validation
- The JSON payload is validated through `server/requestValidator.ts`:
  - Enforces required objects: `baseResult` (with numeric KPIs) and `topActions` (1 to 10 actions).
  - Rejects unknown / extra top-level fields (strict mode).
  - Validates numerical bounds (delay minutes >= 0, passenger counts >= 0, flight counts <= 70).
  - Restricts closure arrays to a maximum of 3 items.

### E. Error Masking & Sanitization
- Unhandled errors, upstream Gemini timeouts, or internal exceptions are logged solely on the server console.
- Client responses are masked:
  ```json
  HTTP/1.1 500 Internal Server Error
  Content-Type: application/json

  {"error": "An internal error occurred while processing the recommendation."}
  ```

### F. Security Headers & CORS Policy
Every response emitted by the dispatcher server carries defensive HTTP headers:
- `Content-Security-Policy`:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- CORS is restricted to designated local and production application origins; wildcard `*` origins are rejected.

---

## 4. Prompt Injection & Model Safety

1. **Untrusted Input Sanitization**:
   - User chat questions (`query`) are capped at **300 characters**.
   - ASCII control characters (`\x00-\x1F\x7F`) are stripped.
   - System instruction delimiters (e.g. `SYSTEM_INSTRUCTION`) are neutralized.
2. **Isolated Prompt Context**:
   - Instructions remain inside the Gemini SDK's `systemInstruction` configuration parameter and are never concatenated into the user payload.
   - The user query is encapsulated in dedicated context tags: `<USER_DISPATCHER_QUERY>`.
3. **Deterministic Output Cross-Checking**:
   - Model outputs are constrained to a JSON schema (`summary`, `options`, `caveats`).
   - All numbers mentioned in the model's text are extracted and verified against the deterministic simulation's `ResultJSON`.
   - If any number fails verification, the response is rejected and regenerated; if still non-compliant, a verified deterministic template is substituted.
4. **DOM Safety**:
   - All AI responses are rendered as pure text children in React.
   - Zero usage of `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function`.

---

## 5. Client-Side Safety & URL State Sanitization

- The state deserializer in `src/utils/urlState.ts` validates all input parsed from `window.location.hash`:
  - Airport IDs must match the 16 recognized network airports (`DEL`, `BOM`, `BLR`, etc.).
  - Minutes are clamped to the 24-hour day (`0 <= start < end <= 1440`).
  - Maximum 3 simultaneous closures allowed.
  - Scenario names are capped at 60 characters and stripped of HTML/script delimiters.
  - Malformed or hostile hash strings fail silently without throwing exceptions or executing code.

---

## 6. Reporting a Vulnerability

If you discover a security vulnerability within Domino Sky, please report it directly via GitHub issues or email the project maintainer. Reports are acknowledged within 24 hours.
