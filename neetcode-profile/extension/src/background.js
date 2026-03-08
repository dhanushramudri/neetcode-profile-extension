// background.js — NeetCode Profile Share

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "PROFILE_DATA_READY") {
    chrome.storage.local.set({
      neetcodeProfile: message.payload,
      lastUpdated: new Date().toISOString(),
    });
  }

  // Surface sync errors to the extension badge so users are aware
  if (message.type === "SYNC_ERROR") {
    console.error("[NeetCode Profile Share] Sync error:", message.code, message.message);

    if (message.code === 403) {
      // Red badge to indicate the username conflict
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#f87171" });
      chrome.storage.local.set({ syncError: message.message });
    }
  }

  if (message.type === "SYNC_OK") {
    // Clear any error badge on successful sync
    chrome.action.setBadgeText({ text: "" });
    chrome.storage.local.remove("syncError");
  }
});