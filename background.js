// Background service worker for Instagram Mass Unliker

// Listen for Instagram likes page completing load — auto-resume if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === "complete" &&
    tab.url &&
    tab.url.includes("instagram.com/your_activity/interactions/likes")
  ) {
    // Check if we should auto-resume
    chrome.storage.local.get(["unlikeAutoResume"], (result) => {
      const resume = result.unlikeAutoResume;
      if (resume && resume.shouldResume) {
        console.log("[Unliker BG] Page reloaded, auto-resuming...");

        // Small delay to let the page fully render
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["injected.js"],
          }).then(() => {
            // Now call the function with resume params
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: (totalUnliked, batchNumber, clickDelay) => {
                if (typeof window.__igUnlikerStart === "function") {
                  window.__igUnlikerStart(clickDelay, totalUnliked, batchNumber);
                }
              },
              args: [resume.totalUnliked, resume.batchNumber, resume.clickDelay || 300],
            });
          }).catch((err) => {
            console.error("[Unliker BG] Failed to inject:", err);
          });
        }, 3000);
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATE") {
    chrome.storage.local.get(["unlikeState"], (result) => {
      sendResponse(result.unlikeState || { running: false, unliked: 0 });
    });
    return true;
  }
  if (message.type === "UPDATE_STATE") {
    chrome.storage.local.set({ unlikeState: message.state });
  }
  if (message.type === "RESET_STATE") {
    chrome.storage.local.set({
      unlikeState: { running: false, unliked: 0 },
      unlikeAutoResume: { shouldResume: false },
    });
  }
});
