// Log to confirm the script is running
console.log('Content script running on:', window.location.href);

// Listen to any fetch requests in the page and check the response status
(function() {
    const originalFetch = window.fetch;

    // Override fetch to capture server error responses
    window.fetch = function(...args) {
        return originalFetch(...args)
            .then(response => {
                console.log('Fetch Response:', response.url, response.status);
                if ([500, 502, 503, 504].includes(response.status)) {
                    console.log('Fetch Response - Server Error Detected:', response.url, response.status);
                    // Send a message to the background script
                    chrome.runtime.sendMessage({
                        action: 'serverError',
                        status: response.status,
                        url: response.url
                    });
                }
                return response;
            });
    };

    // Listen to XHR requests as well
    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(...args) {
        this.addEventListener('load', function() {
            console.log('XHR Response:', this.responseURL, this.status);
            if ([500, 502, 503, 504].includes(this.status)) {
                console.log('XHR Response - Server Error Detected:', this.responseURL, this.status);
                // Send a message to the background script
                chrome.runtime.sendMessage({
                    action: 'serverError',
                    status: this.status,
                    url: this.responseURL
                });
            }
        });
        return originalXHR.apply(this, args);
    };
})();

// Continue with the existing body or title check as fallback
window.addEventListener('load', function() {
    console.log('Page fully loaded, performing error checks.');

    setTimeout(function() {
        // Check for server error codes in the title (500, 502, 503, 504)
        const titleContainsError = /500|502|503|504|404/.test(document.title);
        const bodyContainsError = document.body && /Internal Server Error|502 Bad Gateway|503 Service Unavailable|404 Not Found/.test(document.body.innerText);

        // Debugging logs
        // console.log('Document title:', document.title);
        // console.log('Document:', document.body.innerText);


        if (titleContainsError || bodyContainsError) {
            console.log('Server error detected in the page content.');

            // Send a message to the background script with the error information
            chrome.runtime.sendMessage({
                action: 'serverError',
                status: document.title || 'Unknown Error',
                url: window.location.href
            });
        }
    }, 500);  // Delay the check slightly to ensure all content is loaded
});
