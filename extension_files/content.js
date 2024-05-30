// content.js
document.addEventListener('DOMContentLoaded', function() {
    const mainMessage = document.getElementById('main-message');
    console.log('DOM LOADED');
    if (mainMessage) {
        // Clear existing content
        mainMessage.innerHTML = '';

        // Add a custom message
        const customMessage = document.createElement('p');
        customMessage.textContent = "Click the button below to try reconnecting immediately.";
        mainMessage.appendChild(customMessage);

        // Add a retry button
        const retryButton = document.createElement('button');
        retryButton.textContent = "Retry Now";
        retryButton.style.marginTop = "20px";
        retryButton.style.padding = "10px 20px";
        retryButton.style.fontSize = "16px";
        retryButton.style.cursor = "pointer";
        retryButton.style.backgroundColor = "#4CAF50";
        retryButton.style.color = "white";
        retryButton.style.border = "none";
        retryButton.style.borderRadius = "5px";
        retryButton.style.outline = "none";
        retryButton.onclick = function() {
            window.location.reload(); // Reload the current page
        };
        mainMessage.appendChild(retryButton);
    }
});