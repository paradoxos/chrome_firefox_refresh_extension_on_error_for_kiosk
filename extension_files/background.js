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


chrome.webNavigation.onErrorOccurred.addListener(details => {
  console.log("Error occurred in tab:", details.tabId, "Error:", details.error);
  if (['net::ERR_INTERNET_DISCONNECTED', 'net::ERR_NAME_NOT_RESOLVED', 'net::ERR_CONNECTION_REFUSED', 'net::ERR_ABORTED'].includes(details.error)) {
    chrome.tabs.executeScript(details.tabId, {
      code: `document.body.innerHTML = '<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 10000; display: flex; align-items: center; justify-content: center; font-size: 20px;">Cannot connect. Check connection and <button onclick="location.reload();">retry</button>.</div>' + document.body.innerHTML;`
    });
  }
});

