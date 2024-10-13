// Listen for completed navigation to inject content scripts
chrome.webNavigation.onCompleted.addListener(details => {
    chrome.storage.local.get(['urlPatterns', `${details.tabId}_contentInjected`], function (data) {
        const alreadyInjected = data[`${details.tabId}_contentInjected`];

        if (data.urlPatterns && data.urlPatterns.length > 0 && !alreadyInjected) {
            const urlPatterns = data.urlPatterns;
            const matchesPattern = urlPatterns.some(pattern => new RegExp(patternToRegex(pattern)).test(details.url));

            if (matchesPattern) {
                chrome.scripting.executeScript({
                    target: {tabId: details.tabId},
                    files: ['content.js']
                }, () => {
                    console.log(`Injected content script into tab: ${details.tabId}`);
                    chrome.storage.local.set({[`${details.tabId}_contentInjected`]: true});
                });
            }
        }
    });
}, {url: [{urlPrefix: 'http://'}, {urlPrefix: 'https://'}]});

// Helper function to convert URL patterns to regex
function patternToRegex(pattern) {
    return pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
}

// Clean up storage for a closed tab
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    chrome.storage.local.remove([`${tabId}_contentInjected`, `${tabId}_url`, `${tabId}_failCount`, `${tabId}_maintenanceTabId`], function () {
        console.log(`Removed injected state and other data for tab ${tabId}`);
    });
});

// Function to create a maintenance tab if needed
// Function to create a maintenance tab if needed
function createMaintenanceTabIfNeeded(tabId, failCount) {
    console.log(`Checking if a maintenance tab is needed for tab ${tabId} with failCount ${failCount}`);
    chrome.storage.local.get([`${tabId}_maintenanceTabId`, 'enableMaintenanceTab', 'failCountForMaintenanceToAppear'], function (data) {
        let maintenanceTabId = data[`${tabId}_maintenanceTabId`];
        let enableMaintenanceTab = data['enableMaintenanceTab'] !== false;  // Default to true if not set
        let failCountForMaintenanceToAppear = data['failCountForMaintenanceToAppear'] || 3;  // Default threshold is 3

        console.log(`Enable Maintenance Tab: ${enableMaintenanceTab}, Fail Count Threshold: ${failCountForMaintenanceToAppear}, Current Fail Count: ${failCount}`);

        // Check if the fail count has reached or exceeded the threshold
        if (failCount >= failCountForMaintenanceToAppear) {
            if (enableMaintenanceTab && !maintenanceTabId) {
                console.log("Creating maintenance tab...");
                chrome.tabs.create({url: chrome.runtime.getURL('maintenance.html')}, function (tab) {
                    chrome.storage.local.set({
                        [`${tabId}_maintenanceTabId`]: tab.id
                    });
                    console.log("Maintenance tab created for tab:", tabId);
                });
            } else if (maintenanceTabId) {
                console.log("Maintenance Tab is Already Running");
            }
        } else {
            console.log(`Fail count (${failCount}) has not reached threshold (${failCountForMaintenanceToAppear})`);
        }
    });
}

// Handle web navigation errors (e.g., network issues)
chrome.webNavigation.onErrorOccurred.addListener(details => {
    console.log("Error occurred in tab:", details.tabId, "Error:", details.error, "Assigned to Maintenance Checks");
    const networkErrors = [
        'net::ERR_INTERNET_DISCONNECTED',
        'net::ERR_NAME_NOT_RESOLVED',
        'net::ERR_CONNECTION_REFUSED',
        'net::ERR_ABORTED',
        'net::ERR_CONNECTION_RESET',
        'net::ERR_CONNECTION_TIMED_OUT',
        'net::ERR_CERT_AUTHORITY_INVALID'
    ];

    if (networkErrors.includes(details.error)) {
        chrome.storage.local.get([`${details.tabId}_failCount`], function (result) {
            let failCount = (result[`${details.tabId}_failCount`] || 0) + 1;
            console.log(`Incrementing fail count for tab ${details.tabId} to ${failCount}`);
            chrome.storage.local.set({
                [`${details.tabId}_failCount`]: failCount,
                [`${details.tabId}_url`]: details.url,
                [details.tabId.toString()]: 'offline'
            }, function () {
                createMaintenanceTabIfNeeded(details.tabId, failCount);
            });
            console.log("Failure count for tab:", details.tabId, "is now", failCount);
        });
    }
});

// Handle server errors from content scripts
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === 'serverError') {
        console.log(`Server error detected on tab ${sender.tab.id} with status: ${message.status}`);

        // Increment the failCount for this tab
        chrome.storage.local.get([`${sender.tab.id}_failCount`], function (result) {
            let failCount = (result[`${sender.tab.id}_failCount`] || 0) + 1;
            console.log(`Incrementing fail count for tab ${sender.tab.id} to ${failCount}`);
            chrome.storage.local.set({
                [`${sender.tab.id}_failCount`]: failCount,
                [`${sender.tab.id}_url`]: message.url
            }, function () {
                createMaintenanceTabIfNeeded(sender.tab.id, failCount);
            });
            console.log("Failure count for tab:", sender.tab.id, "is now", failCount);
        });
    }
});

// Helper function to validate the URL scheme (http/https)
function isValidHttpUrl(url) {
    return url.startsWith('http://') || url.startsWith('https://');
}

// Retry fetch logic with exponential backoff
let retryDelay = 5000;  // Start with 5 seconds
const maxDelay = 60000; // Cap retries at 1 minute

// Retry fetch logic with exponential backoff and proper fail count increment
function retryFetch(url, tabId, maintenanceTabId, failCount) {
    // Skip invalid URL schemes
    if (!isValidHttpUrl(url)) {
        console.log(`Invalid URL scheme for ${url}. Skipping fetch.`);
        return;  // Skip invalid URL schemes
    }

    if (navigator.onLine) {
        fetch(url)
            .then(response => {
                if (response.ok) {
                    chrome.tabs.reload(tabId);
                    if (maintenanceTabId) {
                        chrome.tabs.remove(maintenanceTabId, () => console.log("Maintenance tab closed for tab ID:", tabId));
                    }
                    retryDelay = 5000;  // Reset delay after success
                    chrome.storage.local.remove([tabId.toString(), `${tabId}_url`, `${tabId}_maintenanceTabId`, `${tabId}_failCount`]);
                } else if ([500, 502, 503, 504].includes(response.status)) {
                    console.log(`Server error ${response.status} for tab ${tabId}. Retrying...`);
                    createMaintenanceTabIfNeeded(tabId, failCount + 1);
                    scheduleRetry(url, tabId, maintenanceTabId, failCount + 1);
                } else {
                    console.log(`Response not OK (${response.status}), not reloading.`);
                }
            })
            .catch(error => {
                console.log(`Fetch error for tab ${tabId}: ${error.message}`);
                createMaintenanceTabIfNeeded(tabId, failCount + 1);
                scheduleRetry(url, tabId, maintenanceTabId, failCount + 1);
            });
    } else {
        console.log("Network is offline, retrying later.");
        chrome.storage.local.get([`${tabId}_failCount`], function (result) {
            let newFailCount = (result[`${tabId}_failCount`] || 0) + 1;
            chrome.storage.local.set({
                [`${tabId}_failCount`]: newFailCount
            }, function () {
                createMaintenanceTabIfNeeded(tabId, newFailCount);  // Show maintenance tab if necessary
            });
        });
        scheduleRetry(url, tabId, maintenanceTabId, failCount + 1);
    }
}

// Schedule the next retry
function scheduleRetry(url, tabId, maintenanceTabId, failCount) {
    retryDelay = Math.min(retryDelay * 2, maxDelay);  // Exponential backoff
    setTimeout(() => retryFetch(url, tabId, maintenanceTabId, failCount), retryDelay);
}

// Periodically check network status for all tabs
setInterval(() => {
    chrome.storage.local.get(null, function (items) {
        console.log("Checking network status for all tabs...");
        Object.keys(items).forEach(key => {
            if (key.includes('_url')) {
                let tabId = parseInt(key.split('_')[0]);
                let failCount = items[`${tabId}_failCount`] || 0;
                let maintenanceTabId = items[`${tabId}_maintenanceTabId`];
                let url = items[key];

                console.log("Checking " + tabId + " with maintenanceTabId " + maintenanceTabId);
                retryFetch(url, tabId, maintenanceTabId, failCount);
            }
        });
    });
}, 5000);
