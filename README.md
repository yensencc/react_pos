Teller POS Demo (Vite + React)

Quick start

1. Install dependencies:

```bash
npm install
```

2. Run dev server:

```bash
npm run dev
```

Open the URL printed by Vite (usually http://localhost:5173).

## Stripe Terminal (optional)

This project includes a minimal integration with **Stripe Terminal** (the web SDK). A few notes:

- The package used is `@stripe/terminal-js` (test-verified with `^0.26.0`). Older or mismatched versions can cause `npm install` to fail with `No matching version found` errors; if you see that, update `package.json` accordingly and run `npm install`.
- The Terminal requires HTTPS and a compatible Stripe reader (USB or network) to discover/connect and process payments. See Stripe Terminal docs for reader compatibility and discovery options.
- The Terminal UI is loaded dynamically only when you open it from `Settings -> Open Terminal`. If the package is missing or fails to load, you'll see an inline error message with instructions.

If you plan to use Terminal in production, follow Stripe's security and deployment recommendations and create server endpoints for connection tokens and PaymentIntent creation.
