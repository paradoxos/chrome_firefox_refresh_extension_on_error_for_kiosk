document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('settingsForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const message = document.getElementById('maintenanceMessage').value;
        const enableMaintenanceTab = document.getElementById('enableMaintenanceTab').checked;
        const failCountForMaintenanceToAppear = document.getElementById('failCountForMaintenanceToAppear').value;
        const urlPatterns = document.getElementById('urlPatterns').value.split(',').map(pattern => pattern.trim()); // Split and trim patterns

        chrome.storage.local.set({
            'maintenanceMessage': message,
            'enableMaintenanceTab': enableMaintenanceTab,
            'failCountForMaintenanceToAppear': parseInt(failCountForMaintenanceToAppear) || 3,
            'urlPatterns': urlPatterns // Store the user-defined URL patterns
        }, function() {
            console.log('Settings saved successfully!');
            alert('Settings saved successfully!');
        });
    });

    // Load current settings on page load
    chrome.storage.local.get(['maintenanceMessage', 'enableMaintenanceTab', 'failCountForMaintenanceToAppear', 'urlPatterns'], function(data) {
        if (data.maintenanceMessage) {
            document.getElementById('maintenanceMessage').value = data.maintenanceMessage;
        }
        document.getElementById('enableMaintenanceTab').checked = data.enableMaintenanceTab ?? false;
        document.getElementById('failCountForMaintenanceToAppear').value = data.failCountForMaintenanceToAppear || 3;

        if (data.urlPatterns) {
            document.getElementById('urlPatterns').value = data.urlPatterns.join(', ');
        }
    });
});
