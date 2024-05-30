document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('settingsForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const message = document.getElementById('maintenanceMessage').value;
        const enableMaintenanceTab = document.getElementById('enableMaintenanceTab').checked;
        chrome.storage.local.set({
            'maintenanceMessage': message,
            'enableMaintenanceTab': enableMaintenanceTab
        }, function() {
            console.log('Settings saved successfully!');
            alert('Settings saved successfully!');
        });
    });

    // Load current settings on page load
    chrome.storage.local.get(['maintenanceMessage', 'enableMaintenanceTab'], function(data) {
        if (data.maintenanceMessage) {
            document.getElementById('maintenanceMessage').value = data.maintenanceMessage;
        }
        document.getElementById('enableMaintenanceTab').checked = data.enableMaintenanceTab ?? false;
    });
});