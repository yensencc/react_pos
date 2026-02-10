# Android WebView Setup Guide

## Architecture Overview
The React POS app can run in Android via WebView by:
1. Building React app to static files (`dist/` folder)
2. Serving static files + API through a Node.js server
3. Embedding that server with the app or running locally
4. Loading WebView from `http://localhost:PORT`

## Step 1: Build the React App
```bash
npm run build
```
This creates the `dist/` folder with all assets ready.

## Step 2: Update the Server to Serve Static Files
The server already handles API routes. We need to add static file serving for the built React app.

Update `server/index.js` to serve the `dist/` folder at the root path.

## Step 3: Android App Configuration

### WebView Setup in Android (Kotlin/Java)
```kotlin
// MainActivity.kt
val webView = findViewById<WebView>(R.id.webview)
webView.settings.apply {
    javaScriptEnabled = true
    domStorageEnabled = true
    databaseEnabled = true
    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
}
// Load from local server running on the device
webView.loadUrl("http://localhost:3000")
```

### Android Manifest Permissions
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Step 4: Network Access on Android
- WebView must access `http://localhost:3000` where the Node server runs
- Can use `10.0.2.2` on Android emulator instead of `localhost`
- On physical devices, must be on same network or use port forwarding

## Step 5: Database/File Storage
- Current app uses JSON files on the server
- Ensure server process has write access to `src/data/` directory
- Consider using SQLite for better performance on mobile

## Implementation Checklist
- [ ] Build React app: `npm run build`
- [ ] Update server to serve `dist/` folder
- [ ] Set up Android WebView with correct settings
- [ ] Configure localhost/emulator network access
- [ ] Test API calls work from WebView
- [ ] Handle app lifecycle (pause/resume)
- [ ] Optional: Implement deep linking for app URLs

## Development vs. Production
- **Dev**: Use `npm run start:all` to run server + dev server, load from `http://localhost:5173`
- **Prod**: Build React, serve from port 3000, load from `http://localhost:3000`
