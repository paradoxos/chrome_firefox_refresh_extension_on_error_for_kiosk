document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('settingsForm');
    form.addEventListener('submit', function(event) {
        event.preventDefault();  // Prevent the default form submission
        const message = document.getElementById('maintenanceMessage').value;
        chrome.storage.local.set({'maintenanceMessage': message}, function() {
            console.log('Settings saved successfully!');
            alert('Settings saved successfully!');
        });
    });

    // Additionally, load current settings on page load
    chrome.storage.local.get('maintenanceMessage', function(data) {
        if (data.maintenanceMessage) {
            document.getElementById('maintenanceMessage').value = data.maintenanceMessage;
        }
    });
});