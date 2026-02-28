// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  injected.js — Instagram Mass Unliker
//  This file is injected into the Instagram tab by both
//  popup.js (first run) and background.js (auto-resume after reload).
//
//  FLOW: Select up to 100 → click "Unlike" → confirm → reload → repeat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Expose the start function globally so background.js can call it
window.__igUnlikerStart = async function (clickDelay, resumeTotalUnliked, resumeBatchNumber) {
  window.__IG_UNLIKER_STOP = false;

  const BATCH_SIZE = 100;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let totalUnliked = resumeTotalUnliked || 0;
  let batchNumber = resumeBatchNumber || 0;

  function saveState(running) {
    chrome.storage.local.set({
      unlikeState: { running, unliked: totalUnliked },
    });
  }

  function notify(msg) {
    let el = document.getElementById("__ig_unliker_toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "__ig_unliker_toast";
      Object.assign(el.style, {
        position: "fixed", top: "12px", left: "50%",
        transform: "translateX(-50%)", zIndex: "2147483647",
        background: "linear-gradient(135deg,#e1306c,#fd1d1d)",
        color: "#fff", padding: "10px 20px", borderRadius: "10px",
        fontSize: "14px", fontWeight: "600",
        fontFamily: "system-ui,sans-serif",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
  }

  function log(msg) {
    console.log(`%c[Unliker] ${msg}`, "color:#e1306c;font-weight:bold");
  }

  function findTextElement(texts) {
    for (const text of texts) {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.trim() === text) {
          const parent = node.parentElement;
          if (parent) {
            const rect = parent.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) return parent;
          }
        }
      }
    }
    return null;
  }

  // ── Enter selection mode ──────────────────────────────
  async function enterSelectionMode() {
    if (findTextElement(["Cancel", "إلغاء"])) {
      log("Already in selection mode.");
      return true;
    }
    const selectEl = findTextElement(["Select", "تحديد"]);
    if (selectEl) {
      log("Clicking 'Select'...");
      selectEl.click();
      await sleep(1500);
      return true;
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim().toLowerCase();
      if (t === "select" || t === "تحديد") {
        const parent = node.parentElement;
        if (parent && parent.getBoundingClientRect().width > 0) {
          parent.click();
          await sleep(1500);
          return true;
        }
      }
    }
    return false;
  }

  // ── Click Unlike + confirmation dialog ────────────────
  async function clickUnlikeButton() {
    // STEP A: Click the "Unlike" at the bottom bar
    for (let attempt = 0; attempt < 5; attempt++) {
      const unlikeEl = findTextElement(["Unlike", "إلغاء الإعجاب"]);
      if (unlikeEl) {
        log("Found 'Unlike' button — clicking...");
        unlikeEl.click();
        await sleep(2000);
        break;
      }
      await sleep(1000);
    }

    // STEP B: Click "Unlike" in the confirmation dialog
    for (let attempt = 0; attempt < 8; attempt++) {
      // Strategy 1: dialog role
      const dialog = document.querySelector(
        '[role="dialog"], [role="alertdialog"], [class*="dialog"], [class*="modal"], [class*="overlay"]'
      );
      if (dialog) {
        const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
          const txt = node.textContent.trim();
          if (txt === "Unlike" || txt === "إلغاء الإعجاب") {
            const btn = node.parentElement;
            if (btn && btn.getBoundingClientRect().width > 0) {
              log("Clicking 'Unlike' in confirmation dialog...");
              btn.click();
              await sleep(2000);
              return true;
            }
          }
        }
      }

      // Strategy 2: Find all "Unlike" text nodes, click the last one
      const allUnlike = [];
      const walker2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      let n2;
      while ((n2 = walker2.nextNode())) {
        const txt = n2.textContent.trim();
        if (txt === "Unlike" || txt === "إلغاء الإعجاب") {
          const parent = n2.parentElement;
          if (parent && parent.getBoundingClientRect().width > 0) {
            allUnlike.push(parent);
          }
        }
      }
      if (allUnlike.length >= 1) {
        const confirmBtn = allUnlike[allUnlike.length - 1];
        log("Clicking confirmation 'Unlike' (" + allUnlike.length + " matches)...");
        confirmBtn.click();
        await sleep(2000);
        return true;
      }

      // Strategy 3: buttons in fixed/absolute overlays
      for (const btn of document.querySelectorAll("button")) {
        const txt = btn.textContent.trim();
        if (txt === "Unlike" || txt === "إلغاء الإعجاب") {
          let el = btn.parentElement;
          while (el) {
            const pos = getComputedStyle(el).position;
            if (pos === "fixed" || pos === "absolute") {
              if (el.getBoundingClientRect().width > 200) {
                log("Clicking 'Unlike' in overlay...");
                btn.click();
                await sleep(2000);
                return true;
              }
            }
            el = el.parentElement;
          }
        }
      }
      await sleep(500);
    }

    log("No confirmation dialog found — unlike may have completed directly.");
    return true;
  }

  // ── Select posts in a batch ───────────────────────────
  async function selectBatch() {
    let batchSelected = 0;
    let emptyScrolls = 0;

    while (!window.__IG_UNLIKER_STOP && batchSelected < BATCH_SIZE && emptyScrolls < 5) {
      let foundNew = false;
      const imgs = document.querySelectorAll("img[src]");

      for (const img of imgs) {
        if (window.__IG_UNLIKER_STOP) break;
        if (batchSelected >= BATCH_SIZE) break;
        if (img.dataset.igUnlikerDone === "1") continue;

        const r = img.getBoundingClientRect();
        if (r.width < 80 || r.height < 80) continue;

        img.dataset.igUnlikerDone = "1";

        let target = null;
        let p = img;
        for (let i = 0; i < 10; i++) {
          p = p.parentElement;
          if (!p) break;
          if (
            p.tagName === "A" || p.tagName === "BUTTON" ||
            p.getAttribute("role") === "button" ||
            p.getAttribute("role") === "menuitem" ||
            p.getAttribute("tabindex") != null
          ) { target = p; break; }
          const cs = getComputedStyle(p);
          if (cs.cursor === "pointer") { target = p; break; }
        }
        if (!target) target = img.parentElement || img;
        if (target.dataset.igUnlikerDone === "1") continue;
        target.dataset.igUnlikerDone = "1";

        if (r.top < 0 || r.bottom > window.innerHeight) {
          target.scrollIntoView({ behavior: "instant", block: "center" });
          await sleep(150);
        }

        target.click();
        batchSelected++;
        totalUnliked++;
        foundNew = true;
        saveState(true);
        log(`Batch ${batchNumber + 1}: Selected ${batchSelected}/${BATCH_SIZE}  (Total: ${totalUnliked})`);
        notify(`Batch ${batchNumber + 1}: Selecting ${batchSelected}/${BATCH_SIZE}  |  Total: ${totalUnliked}`);
        await sleep(clickDelay);
      }

      if (!foundNew) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
        log(`Scrolling for more (attempt ${emptyScrolls + 1}/5)...`);
        await sleep(2000);
        emptyScrolls++;
      } else {
        emptyScrolls = 0;
      }
    }
    return batchSelected;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  MAIN: One batch — select → unlike → reload
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  batchNumber++;
  log(`Starting batch ${batchNumber}...`);
  notify(`Batch ${batchNumber}: Entering selection mode...`);

  window.scrollTo({ top: 0, behavior: "instant" });
  await sleep(1000);

  const entered = await enterSelectionMode();
  if (!entered) {
    log("Cannot enter selection mode. Stopping.");
    notify("Error: Cannot find 'Select'. Stopping.");
    chrome.storage.local.set({ unlikeAutoResume: { shouldResume: false } });
    saveState(false);
    return;
  }
  await sleep(800);

  notify(`Batch ${batchNumber}: Selecting posts...`);
  const count = await selectBatch();

  if (window.__IG_UNLIKER_STOP) {
    chrome.storage.local.set({ unlikeAutoResume: { shouldResume: false } });
    saveState(false);
    notify(`Stopped! ${totalUnliked} posts unliked in ${batchNumber} batches.`);
    return;
  }

  if (count === 0) {
    log("No more posts to select. All done!");
    chrome.storage.local.set({ unlikeAutoResume: { shouldResume: false } });
    saveState(false);
    notify(`All done! ${totalUnliked} posts unliked in ${batchNumber} batches! 🎉`);
    return;
  }

  log(`Batch ${batchNumber}: Selected ${count}. Clicking 'Unlike'...`);
  notify(`Batch ${batchNumber}: Clicking 'Unlike' for ${count} posts...`);

  const unliked = await clickUnlikeButton();
  if (!unliked) {
    log("Could not click 'Unlike'. Stopping.");
    chrome.storage.local.set({ unlikeAutoResume: { shouldResume: false } });
    saveState(false);
    notify("Error: Could not find 'Unlike' button. Stopping.");
    return;
  }

  log(`Batch ${batchNumber} done! Reloading for next batch...`);
  notify(`Batch ${batchNumber} done! ${totalUnliked} total. Reloading...`);

  // Save resume state and reload
  chrome.storage.local.set({
    unlikeState: { running: true, unliked: totalUnliked },
    unlikeAutoResume: {
      shouldResume: true,
      totalUnliked: totalUnliked,
      batchNumber: batchNumber,
      clickDelay: clickDelay,
    },
  });

  await sleep(1500);
  location.reload();
};
