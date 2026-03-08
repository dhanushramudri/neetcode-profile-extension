// background.js — NeetCode Profile Share
// Simple service worker: caches data from content script.

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "PROFILE_DATA_READY") {
    chrome.storage.local.set({
      neetcodeProfile: message.payload,
      lastUpdated: new Date().toISOString(),
    });
  }
});