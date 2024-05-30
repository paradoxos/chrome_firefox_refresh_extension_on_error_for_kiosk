chrome.webNavigation.onCompleted.addListener(details => {
  console.log("Navigation completed for tab:", details.tabId, "URL:", details.url);
  chrome.storage.local.get([details.tabId.toString()], function(result) {
    if (result[details.tabId.toString()] === 'offline') {
      console.log("Reloading tab due to previous offline status:", details.tabId);
      chrome.tabs.reload(details.tabId, {bypassCache: true});
      chrome.storage.local.remove([details.tabId.toString()]);
    }
  });
}, {url: [{urlPrefix: 'http://'}, {urlPrefix: 'https://'}, {urlContains: 'local'}]});

chrome.webNavigation.onErrorOccurred.addListener(details => {
  // Log and handle all errors
  console.log("Error occurred in tab:", details.tabId, "Error:", details.error);
  if (['net::ERR_INTERNET_DISCONNECTED', 'net::ERR_NAME_NOT_RESOLVED', 'net::ERR_CONNECTION_REFUSED', 'net::ERR_ABORTED'].includes(details.error)) {
    // Store offline status regardless of the maintenance tab setting
    chrome.storage.local.set({
      [`${details.tabId}_maintenanceTabId`]: null, // We set this to null initially
      [details.tabId.toString()]: 'offline',
      [`${details.tabId}_url`]: details.url
    });

    // Check if maintenance tab feature is enabled before creating a new tab
    chrome.storage.local.get('enableMaintenanceTab', function(data) {
      if (data.enableMaintenanceTab) {
        chrome.tabs.create({ url: chrome.runtime.getURL('maintenance.html') }, function(tab) {
          // Update the storage to reflect the created maintenance tab ID
          chrome.storage.local.set({
            [`${details.tabId}_maintenanceTabId`]: tab.id
          });
          console.log("Maintenance tab created for tab:", details.tabId);
        });
      } else {
        console.log("Maintenance tab feature is disabled, no new tab created.");
      }
    });
  }
});

setInterval(() => {
  console.log("Checking network status for all tabs...");
  chrome.storage.local.get(null, function(items) {
    Object.keys(items).forEach(key => {
      if (key.includes('_url')) {
        let tabId = parseInt(key.split('_')[0]);
        let maintenanceTabId = items[`${tabId}_maintenanceTabId`];
        console.log("Attempting to fetch URL for tab:", tabId, "URL:", items[key]);
        fetch(items[key])
            .then(response => {
              console.log("Fetch response for tab:", tabId, "Status:", response.status);
              if (response.ok) {
                console.log("Network restored, reloading tab:", tabId);
                chrome.tabs.reload(tabId);
                chrome.storage.local.remove([tabId.toString(), `${tabId}_url`, `${tabId}_maintenanceTabId`]);
                // Close the maintenance tab if open
                if (maintenanceTabId) {
                  chrome.tabs.remove(maintenanceTabId);
                  console.log("Closed maintenance tab:", maintenanceTabId);
                }
              } else {
                console.log("Response not OK, not reloading:", response.status);
              }
            })
            .catch(error => {
              console.log('Fetch error for URL:', items[key], "Error:", error.message);
            });
      }
    });
  });
}, 5000);