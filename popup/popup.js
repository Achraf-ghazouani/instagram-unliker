// ── Popup Script for Instagram Mass Unliker ─────────────
// Uses chrome.scripting.executeScript to directly inject code
// into the Instagram tab — no content script dependency.

const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const resetBtn = document.getElementById("reset-btn");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const unlikeCount = document.getElementById("unlike-count");
const delayInput = document.getElementById("delay-input");

// ── Restore saved state on popup open ───────────────────
chrome.storage.local.get(["unlikeState", "unlikeDelay"], (result) => {
  const state = result.unlikeState || { running: false, unliked: 0 };
  const delay = result.unlikeDelay || 300;
  delayInput.value = delay;
  updateUI(state);
});

// ── Poll state to keep popup in sync ─────────────────────
setInterval(() => {
  chrome.storage.local.get(["unlikeState"], (result) => {
    if (result.unlikeState) updateUI(result.unlikeState);
  });
}, 800);

// ── Start Selecting ─────────────────────────────────────
startBtn.addEventListener("click", async () => {
  const delay = parseInt(delayInput.value, 10) || 300;
  chrome.storage.local.set({ unlikeDelay: delay });

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab || !tab.url || !tab.url.includes("instagram.com")) {
    alert("Please navigate to Instagram first!\n\nhttps://www.instagram.com/your_activity/interactions/likes/");
    return;
  }

  if (!tab.url.includes("your_activity/interactions/likes")) {
    alert("Please go to the Likes page first:\n\nhttps://www.instagram.com/your_activity/interactions/likes/");
    return;
  }

  // Set running state
  chrome.storage.local.set({ unlikeState: { running: true, unliked: 0 } });
  updateUI({ running: true, unliked: 0 });

  // Inject and execute the selection function directly in the tab
  try {
    // First inject the script file
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["injected.js"],
    });
    // Then call the start function
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (d) => { window.__igUnlikerStart(d, 0, 0); },
      args: [delay],
    });
  } catch (err) {
    console.error("Injection error:", err);
    alert("Error: " + err.message + "\n\nTry refreshing the Instagram page and try again.");
    chrome.storage.local.set({ unlikeState: { running: false, unliked: 0 } });
    updateUI({ running: false, unliked: 0 });
  }
});

// ── Stop ────────────────────────────────────────────────
stopBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => { window.__IG_UNLIKER_STOP = true; },
      });
    } catch {}
  }
  // Clear auto-resume so it doesn't restart after reload
  chrome.storage.local.set({ unlikeAutoResume: { shouldResume: false } });
  chrome.storage.local.get(["unlikeState"], (result) => {
    const state = result.unlikeState || { running: false, unliked: 0 };
    state.running = false;
    chrome.storage.local.set({ unlikeState: state });
    updateUI(state);
  });
});

// ── Reset Counter ───────────────────────────────────────
resetBtn.addEventListener("click", () => {
  chrome.storage.local.set({
    unlikeState: { running: false, unliked: 0 },
    unlikeAutoResume: { shouldResume: false },
  });
  updateUI({ running: false, unliked: 0 });
});

// ── UI Update Helper ────────────────────────────────────
function updateUI(state) {
  unlikeCount.textContent = state.unliked || 0;
  if (state.running) {
    statusDot.className = "dot running";
    statusText.textContent = "Selecting...";
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    statusDot.className = "dot idle";
    statusText.textContent = state.unliked > 0 ? "Done — click Unlike!" : "Idle";
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

// Main unlike logic is in injected.js — loaded as a file by both
// popup.js (first run) and background.js (auto-resume after page reload).
