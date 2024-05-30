chrome.webNavigation.onCompleted.addListener(details => {
  console.log("Navigation completed for tab:", details.tabId, "URL:", details.url);
  chrome.storage.local.get([details.tabId.toString(), `${details.tabId}_failCount`], function(result) {
    if (result[details.tabId.toString()] === 'offline') {
      console.log("Reloading tab due to previous offline status:", details.tabId);
      chrome.tabs.reload(details.tabId, {bypassCache: true});
      chrome.storage.local.remove([details.tabId.toString(), `${details.tabId}_url`, `${details.tabId}_maintenanceTabId`, `${details.tabId}_failCount`]);
    }
  });
}, {url: [{urlPrefix: 'http://'}, {urlPrefix: 'https://'}, {urlContains: 'local'}]});


function createMaintenanceTabIfNeeded(tabId, failCount) {
  console.log('Set a tab for ' + tabId + ' with failCount ' + failCount);
  chrome.storage.local.get([`${tabId}_maintenanceTabId`, 'enableMaintenanceTab' , 'failCountForMaintenanceToAppear'], function(data) {
    let maintenanceTabId = data[`${tabId}_maintenanceTabId`];
    let enableMaintenanceTab = data['enableMaintenanceTab'];
    let failCountForMaintenanceToAppear = data['failCountForMaintenanceToAppear'];

    // Only create a new tab if enabled and no maintenance tab is currently open
    if(failCount >= failCountForMaintenanceToAppear){
      if (enableMaintenanceTab && !maintenanceTabId) {
        chrome.tabs.create({ url: chrome.runtime.getURL('maintenance.html') }, function(tab) {
          chrome.storage.local.set({
            [`${tabId}_maintenanceTabId`]: tab.id
          });
          console.log("Maintenance tab created for tab:", tabId);
        });
      }else{
        console.log("Maintenance Tab is Disabled or Already Running");
      }
    }
  });
}

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  // Use the tabId to clear related data from chrome.storage.local
  chrome.storage.local.get(null, function(items) {
    // Check if this tab had any related data stored
    if(items[`${tabId}_url`] || items[`${tabId}_failCount`] || items[`${tabId}_maintenanceTabId`]) {
      console.log(`Cleaning up data for closed tab: ${tabId}`);
      chrome.storage.local.remove([`${tabId}_url`, `${tabId}_failCount`, `${tabId}_maintenanceTabId`, tabId.toString()], function() {
        if (chrome.runtime.lastError) {
          console.log(`Error removing data for tab ${tabId}: ${chrome.runtime.lastError}`);
        } else {
          console.log(`Data removed for tab ${tabId}`);
        }
      });
    }
  });
});

chrome.webNavigation.onErrorOccurred.addListener(details => {
  console.log("Error occurred in tab:", details.tabId, "Error:", details.error, "Assigned to Maintenance Checks");
  if (['net::ERR_INTERNET_DISCONNECTED', 'net::ERR_NAME_NOT_RESOLVED', 'net::ERR_CONNECTION_REFUSED', 'net::ERR_ABORTED'].includes(details.error)) {
    chrome.storage.local.get([`${details.tabId}_failCount`], function(result) {
      let failCount = (result[`${details.tabId}_failCount`] || 0) + 1;
      chrome.storage.local.set({
        [`${details.tabId}_failCount`]: failCount,
        [`${details.tabId}_url`]: details.url,
        [details.tabId.toString()]: 'offline'
      }, function() {
        createMaintenanceTabIfNeeded(details.tabId, failCount);
      });
      console.log("Failure count for tab:", details.tabId, "is now", failCount);
    });
  }
});




setInterval(() => {
  chrome.storage.local.get(null, function(items) {
    console.log("Checking network status for all tabs...");
    Object.keys(items).forEach(key => {
      if (key.includes('_url')) {
        let tabId = parseInt(key.split('_')[0]);
        let failCount = items[`${tabId}_failCount`] || 0;
        let maintenanceTabId = items[`${tabId}_maintenanceTabId`];

        console.log("Checking " + tabId + " with maintenanceTabId " + maintenanceTabId);
        fetch(items[key])
            .then(response => {
              if (response.ok) {
                // Lets reload the Original Tab
                chrome.tabs.reload(tabId);
                // Close the maintenance tab if it exists
                if (maintenanceTabId) {
                  chrome.tabs.remove(maintenanceTabId, () => {
                    console.log("Maintenance tab closed for tab ID:", tabId);
                    if (chrome.runtime.lastError) {
                      console.log("Failed to close maintenance tab:", chrome.runtime.lastError.message);
                    }
                  });
                }
                // Remove all local Storage information
                chrome.storage.local.remove([tabId.toString(), `${tabId}_url`, `${tabId}_maintenanceTabId`, `${tabId}_failCount`]);
              } else {
                console.log("Response not OK, not reloading:", response.status);
              }
            })
            .catch(error => {
              console.log('Fetch error for URL:', items[key], "Error:", error.message);
              createMaintenanceTabIfNeeded(tabId, failCount + 1);
            });
      }
    });
  });
}, 5000);
