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
  console.log("Error occurred in tab:", details.tabId, "Error:", details.error);
  if (['net::ERR_INTERNET_DISCONNECTED', 'net::ERR_NAME_NOT_RESOLVED', 'net::ERR_CONNECTION_REFUSED', 'net::ERR_ABORTED'].includes(details.error)) {
    chrome.storage.local.set({[details.tabId.toString()]: 'offline', [`${details.tabId}_url`]: details.url});
    console.log("Stored offline status for tab:", details.tabId);
  }
}, {url: [{urlPrefix: 'http://'}, {urlPrefix: 'https://'}, {urlContains: 'local'}]});

setInterval(() => {
  console.log("Checking network status for all tabs...");
  chrome.storage.local.get(null, function(items) {
    Object.keys(items).forEach(key => {
      if (key.includes('_url')) {
        let tabId = parseInt(key.split('_')[0]);
        console.log("Attempting to fetch URL for tab:", tabId, "URL:", items[key]);
        fetch(items[key])
            .then(response => {
              console.log("Fetch response for tab:", tabId, "Status:", response.status);
              if (response.ok) {
                console.log("Network restored, reloading tab:", tabId);
                chrome.tabs.reload(tabId);
                chrome.storage.local.remove([tabId.toString(), key]);
              }
            })
            .catch(error => {
              console.error('Fetch error for URL:', items[key], "Error:", error);
            });
      }
    });
  });
}, 5000);
