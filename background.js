let currentTitle = '';

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ 
        currentTitle: 'No title captured yet',
        titleHistory: []
    });
});

// Listen for tab updates to automatically capture titles
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.title && tab.active) {
        currentTitle = changeInfo.title;
        chrome.storage.sync.set({ currentTitle });
    }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.title) {
        currentTitle = tab.title;
        chrome.storage.sync.set({ currentTitle });
    }
});