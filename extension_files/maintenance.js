document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get('maintenanceMessage', function(data) {
        var messageElement = document.getElementById('message');
        messageElement.textContent = data.maintenanceMessage || 'WE ARE SORRY THIS MACHINE IS NOT AVAILABLE RIGHT NOW';
    });
});