# chrome_firefox_refresh_extension_on_error_kiosk
This extension will automatically refresh the page after a Network outage.

Adds a new tab with a Maintenance message until the connection is restored.

supports these network errors 

    'net::ERR_INTERNET_DISCONNECTED',
    'net::ERR_NAME_NOT_RESOLVED',
    'net::ERR_CONNECTION_REFUSED',
    'net::ERR_ABORTED',
    'net::ERR_CONNECTION_RESET',
    'net::ERR_CONNECTION_TIMED_OUT',
    'net::ERR_CERT_AUTHORITY_INVALID'

and some 500 error messages from the server based the page error titles