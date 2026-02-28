# Instagram Mass Unliker — Chrome Extension

Automatically unlike **all** your liked posts on Instagram. Runs fully hands-free: selects 100 posts → clicks Unlike → confirms → reloads the page → repeats until done.

---

## Features

- **Fully automatic** — no manual clicking required after pressing Start
- **Batch processing** — selects up to 100 posts per cycle (Instagram's max)
- **Auto-reload & resume** — reloads the page after each batch and continues automatically
- **Progress tracking** — live counter shows total posts unliked
- **Stop anytime** — pause the process and resume later
- **Adjustable speed** — configure the delay between clicks (200–2000ms)
- **Multi-language support** — works with English and Arabic Instagram interfaces

## Screenshots

| Popup UI | Running |
|----------|---------|
| Dark-themed popup with Start/Stop/Reset controls | Live toast notification on Instagram page showing progress |

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `instagram-unliker-extension` folder
5. The extension icon will appear in your toolbar

## Usage

1. Log in to [instagram.com](https://www.instagram.com)
2. Navigate to **Your Activity → Likes**:
   ```
   https://www.instagram.com/your_activity/interactions/likes/
   ```
3. Click the extension icon in the toolbar
4. Adjust the click delay if needed (default: 300ms)
5. Click **▶ Start Auto Unlike**
6. Keep the tab open — the extension runs automatically
7. Click **■ Stop** anytime to pause

## How It Works

1. **Enters selection mode** — clicks the "Select" button on the Likes page
2. **Selects posts** — clicks up to 100 post thumbnails one by one
3. **Clicks Unlike** — triggers the Unlike action for all selected posts
4. **Confirms** — automatically clicks "Unlike" in the confirmation dialog
5. **Reloads** — refreshes the page to load the next batch of liked posts
6. **Repeats** — the background script detects the reload and restarts the process

## Project Structure

```
instagram-unliker-extension/
├── manifest.json        # Extension manifest (Manifest V3)
├── background.js        # Service worker — auto-resumes after page reload
├── injected.js          # Main unlike logic — injected into the Instagram tab
├── content.js           # Placeholder content script
├── popup/
│   ├── popup.html       # Extension popup UI
│   ├── popup.css        # Dark-themed styling
│   └── popup.js         # Popup logic — handles Start/Stop/Reset
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Configuration

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| Click delay | 300ms | 100–2000ms | Time between selecting each post. Lower = faster but higher risk of rate limiting |

## Technical Details

- **Manifest V3** Chrome Extension
- Uses `chrome.scripting.executeScript` for direct code injection (no content script messaging)
- `chrome.storage.local` persists state across page reloads
- `chrome.tabs.onUpdated` listener in the background script detects page reload and auto-resumes
- TreeWalker API finds UI elements by visible text (supports English + Arabic)
- Data attributes (`data-ig-unliker-done`) prevent double-clicking posts

## Permissions

| Permission | Reason |
|------------|--------|
| `activeTab` | Access the current Instagram tab |
| `scripting` | Inject the unlike script into the page |
| `storage` | Save progress and resume state across reloads |
| `host_permissions: instagram.com` | Required to run scripts on Instagram |

## Tips

- **Speed**: 200–500ms delay works well for most accounts
- **Rate limits**: If Instagram shows errors, increase the delay or wait before restarting
- **Large accounts**: The extension handles thousands of likes — just let it run
- **Tab focus**: The tab doesn't need to be active, but the browser must stay open

## Disclaimer

This extension is for personal use only. Use at your own risk. Automated actions may violate Instagram's Terms of Service and could result in temporary restrictions on your account. The author is not responsible for any consequences.

## License

MIT
