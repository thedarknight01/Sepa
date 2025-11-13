// API base URL
const API_BASE = window.location.origin;

// DOM Elements
const createView = document.getElementById('createView');
const successView = document.getElementById('successView');
const viewPaste = document.getElementById('viewPaste');
const loading = document.getElementById('loading');

const pasteContent = document.getElementById('pasteContent');
const createBtn = document.getElementById('createBtn');
const createError = document.getElementById('createError');

const pasteUrl = document.getElementById('pasteUrl');
const copyBtn = document.getElementById('copyBtn');
const copySuccess = document.getElementById('copySuccess');
const newPasteBtn = document.getElementById('newPasteBtn');

const pasteText = document.getElementById('pasteText');
const copyContentBtn = document.getElementById('copyContentBtn');
const copyContentSuccess = document.getElementById('copyContentSuccess');
const viewError = document.getElementById('viewError');
const createNewBtn = document.getElementById('createNewBtn');

// Helper Functions
function showView(view) {
    [createView, successView, viewPaste, loading].forEach(v => {
        v.classList.remove('active');
    });
    view.classList.add('active');
}

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function hideError(element) {
    element.classList.add('hidden');
}

function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

// Create Paste
async function createPaste() {
    const content = pasteContent.value.trim();
    
    if (!content) {
        showError(createError, 'Please enter some text to share');
        return;
    }
    
    hideError(createError);
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/api/paste`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create paste');
        }
        
        // Show success view
        const fullUrl = `${API_BASE}/paste/${data.id}`;
        pasteUrl.value = fullUrl;
        hideLoading();
        showView(successView);
        
        // Clear the textarea
        pasteContent.value = '';
        
    } catch (error) {
        hideLoading();
        showError(createError, error.message);
    }
}

// Copy URL to clipboard
async function copyUrlToClipboard() {
    try {
        await navigator.clipboard.writeText(pasteUrl.value);
        copySuccess.classList.remove('hidden');
        setTimeout(() => {
            copySuccess.classList.add('hidden');
        }, 2000);
    } catch (error) {
        alert('Failed to copy to clipboard');
    }
}

// Copy content to clipboard
async function copyContentToClipboard() {
    try {
        await navigator.clipboard.writeText(pasteText.textContent);
        copyContentSuccess.classList.remove('hidden');
        setTimeout(() => {
            copyContentSuccess.classList.add('hidden');
        }, 2000);
    } catch (error) {
        alert('Failed to copy to clipboard');
    }
}

// Load Paste
async function loadPaste(id) {
    showLoading();
    hideError(viewError);
    
    try {
        const response = await fetch(`${API_BASE}/api/paste/${id}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Paste not found');
            }
            throw new Error('Failed to load paste');
        }
        
        const data = await response.json();
        pasteText.textContent = data.content;
        hideLoading();
        showView(viewPaste);
        
    } catch (error) {
        hideLoading();
        showError(viewError, error.message);
        showView(viewPaste);
    }
}

// Event Listeners
createBtn.addEventListener('click', createPaste);

pasteContent.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        createPaste();
    }
});

copyBtn.addEventListener('click', copyUrlToClipboard);

newPasteBtn.addEventListener('click', () => {
    showView(createView);
    window.history.pushState({}, '', '/');
});

copyContentBtn.addEventListener('click', copyContentToClipboard);

createNewBtn.addEventListener('click', () => {
    showView(createView);
    window.history.pushState({}, '', '/');
});

// Initialize
function init() {
    const path = window.location.pathname;
    const match = path.match(/^\/paste\/([a-z0-9]+)$/);
    
    if (match) {
        const pasteId = match[1];
        loadPaste(pasteId);
    } else {
        showView(createView);
    }
}

// Handle browser back/forward
window.addEventListener('popstate', init);

// Start the app
init();
