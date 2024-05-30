document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('settingsForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const message = document.getElementById('maintenanceMessage').value;
        const enableMaintenanceTab = document.getElementById('enableMaintenanceTab').checked;
        const failCountForMaintenanceToAppear = document.getElementById('failCountForMaintenanceToAppear').value;

        chrome.storage.local.set({
            'maintenanceMessage': message,
            'enableMaintenanceTab': enableMaintenanceTab,
            'failCountForMaintenanceToAppear': parseInt(failCountForMaintenanceToAppear) || 3 // Default to 3 if invalid or empty
        }, function() {
            console.log('Settings saved successfully!');
            alert('Settings saved successfully!');
        });
    });

    // Load current settings on page load
    chrome.storage.local.get(['maintenanceMessage', 'enableMaintenanceTab', 'failCountForMaintenanceToAppear'], function(data) {
        if (data.maintenanceMessage) {
            document.getElementById('maintenanceMessage').value = data.maintenanceMessage;
        }
        document.getElementById('enableMaintenanceTab').checked = data.enableMaintenanceTab ?? false;
        document.getElementById('failCountForMaintenanceToAppear').value = data.failCountForMaintenanceToAppear || 3;
    });
});