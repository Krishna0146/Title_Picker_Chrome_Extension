// DOM Elements
const pickTitleBtn = document.getElementById('pickTitleBtn');
const titleContent = document.getElementById('titleContent');
const titleDisplay = document.getElementById('titleDisplay');
const copyBtn = document.getElementById('copyBtn');
const charCount = document.getElementById('charCount');
const timestamp = document.getElementById('timestamp');
const statusIndicator = document.getElementById('statusIndicator');
const historyList = document.getElementById('historyList');
const clearBtn = document.getElementById('clearBtn');
const toast = document.getElementById('toast');
const optionsBtn = document.getElementById('optionsBtn');
const aboutBtn = document.getElementById('aboutBtn');

// State
let currentTitle = '';
let titleHistory = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    await loadStoredData();
    setupEventListeners();
    updateUI();
});

// Load stored data
async function loadStoredData() {
    try {
        const data = await chrome.storage.sync.get(['currentTitle', 'titleHistory']);
        currentTitle = data.currentTitle || '';
        titleHistory = data.titleHistory || [];
        
        if (currentTitle && currentTitle !== 'No title captured yet') {
            displayTitle(currentTitle);
        }
    } catch (error) {
        console.error('Error loading stored data:', error);
        updateStatus('Error', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    pickTitleBtn.addEventListener('click', captureTitle);
    copyBtn.addEventListener('click', copyToClipboard);
    clearBtn.addEventListener('click', clearHistory);
    
    // Footer actions
    optionsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });
    
    aboutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showAbout();
    });
}

// Main function to capture title
async function captureTitle() {
    try {
        updateStatus('Capturing...', 'loading');
        pickTitleBtn.classList.add('loading');
        
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            throw new Error('No active tab found');
        }
        
        const title = tab.title || 'Untitled';
        currentTitle = title;
        
        // Save to storage
        await chrome.storage.sync.set({ currentTitle: title });
        
        // Add to history
        await addToHistory(title);
        
        // Update UI
        displayTitle(title);
        updateStatus('Captured!', 'success');
        
        // Reset status after 2 seconds
        setTimeout(() => {
            updateStatus('Ready', 'ready');
        }, 2000);
        
    } catch (error) {
        console.error('Error capturing title:', error);
        updateStatus('Error', 'error');
        showToast('Failed to capture title', 'error');
        
        // Reset status after 3 seconds
        setTimeout(() => {
            updateStatus('Ready', 'ready');
        }, 3000);
    } finally {
        pickTitleBtn.classList.remove('loading');
    }
}

// Display captured title
function displayTitle(title) {
    titleContent.textContent = title;
    titleDisplay.classList.add('has-content');
    
    // Update meta info
    charCount.textContent = `${title.length} characters`;
    timestamp.textContent = formatTime(new Date());
    
    // Auto-copy to clipboard
    copyToClipboard(false); // false = don't show toast
}

// Copy to clipboard
async function copyToClipboard(showToastMessage = true) {
    if (!currentTitle || currentTitle === 'Click "Capture Title" to get started') {
        return;
    }
    
    try {
        await navigator.clipboard.writeText(currentTitle);
        if (showToastMessage) {
            showToast('Title copied to clipboard!');
        }
        
        // Visual feedback
        copyBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            copyBtn.style.transform = 'scale(1)';
        }, 150);
        
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = currentTitle;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (showToastMessage) {
            showToast('Title copied to clipboard!');
        }
    }
}

// Add title to history
async function addToHistory(title) {
    // Don't add duplicates or empty titles
    if (!title || title === 'Untitled' || titleHistory.includes(title)) {
        return;
    }
    
    // Add to beginning and limit to 5 items
    titleHistory.unshift(title);
    titleHistory = titleHistory.slice(0, 5);
    
    // Save to storage
    await chrome.storage.sync.set({ titleHistory });
    
    // Update UI
    renderHistory();
}

// Render history list
function renderHistory() {
    if (titleHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-history">No titles captured yet</div>';
        return;
    }
    
    const historyHTML = titleHistory.map(title => `
        <div class="history-item" title="${escapeHtml(title)}" onclick="selectFromHistory('${escapeHtml(title).replace(/'/g, "\\'")}')">
            ${truncateText(title, 40)}
        </div>
    `).join('');
    
    historyList.innerHTML = historyHTML;
}

// Select title from history
function selectFromHistory(title) {
    currentTitle = title;
    displayTitle(title);
    showToast('Title selected from history');
}

// Clear history
async function clearHistory() {
    if (titleHistory.length === 0) return;
    
    titleHistory = [];
    await chrome.storage.sync.set({ titleHistory: [] });
    renderHistory();
    showToast('History cleared', 'info');
}

// Update status indicator
function updateStatus(message, type) {
    const statusSpan = statusIndicator.querySelector('span');
    const pulse = statusIndicator.querySelector('.pulse');
    
    statusSpan.textContent = message;
    
    // Remove existing classes
    statusIndicator.className = 'status-indicator';
    pulse.className = 'pulse';
    
    // Add type-specific classes
    switch (type) {
        case 'loading':
            statusIndicator.classList.add('loading');
            pulse.style.background = '#f6ad55';
            pulse.style.animation = 'pulse 0.5s infinite';
            break;
        case 'success':
            pulse.style.background = '#48bb78';
            pulse.style.animation = 'pulse 2s infinite';
            break;
        case 'error':
            pulse.style.background = '#f56565';
            pulse.style.animation = 'pulse 1s infinite';
            break;
        default: // ready
            pulse.style.background = '#48bb78';
            pulse.style.animation = 'pulse 2s infinite';
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    
    toastMessage.textContent = message;
    
    // Update icon and color based on type
    switch (type) {
        case 'error':
            toastIcon.textContent = '✗';
            toast.style.background = '#f56565';
            break;
        case 'info':
            toastIcon.textContent = 'ℹ';
            toast.style.background = '#4299e1';
            break;
        default: // success
            toastIcon.textContent = '✓';
            toast.style.background = '#48bb78';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show about dialog
function showAbout() {
    const aboutMessage = `
Title Picker Extension v1.0

A sleek and modern Chrome extension that captures and manages tab titles with ease.

Features:
• One-click title capture
• Automatic clipboard copying
• Title history (up to 5 items)
• Beautiful, responsive UI
• Instant feedback & notifications

Created with ❤️ for productivity enthusiasts.
    `.trim();
    
    alert(aboutMessage);
}

// Update UI on initialization
function updateUI() {
    renderHistory();
    
    if (currentTitle && currentTitle !== 'No title captured yet') {
        displayTitle(currentTitle);
    }
}

// Utility functions
function formatTime(date) {
    return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return escapeHtml(text);
    return escapeHtml(text.substring(0, maxLength - 3)) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to capture title
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        captureTitle();
    }
    
    // Ctrl/Cmd + C to copy (when title is displayed)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && currentTitle && currentTitle !== 'Click "Capture Title" to get started') {
        e.preventDefault();
        copyToClipboard();
    }
});