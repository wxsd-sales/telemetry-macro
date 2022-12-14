# Telemetry Macro

This macro sends periodic sensor data from your Webex Device to a telemetry server. It can also monitor status and events to trigger immediate notifications such as when a calls has been placed or a presentations stopped or started.

## Requirements

1. RoomOS/CE 9.6.x or above Webex Device.
2. Web admin access to the device to uplaod the macro.
3. Network connectivity for your Webex Device to make HTTP POSTs directly with your telemetry server.

## Setup

1. Download the ``telemetry-macro.js`` file and upload it to your Webex Room devices Macro editor via the web interface.
2. Configure the Macro by changing the initial values, there are comments explaining each one.
3. Enable the Macro on the editor.


## Validation

Validated Hardware:

* Room Kit Pro
* Desk Pro
* Desk Hub
* Room Kit

This macro should work on other Webex Devices but has not been validated at this time.

## Support

Please reach out to the WXSD team at [wxsd@external.cisco.com](mailto:wxsd@external.cisco.com?subject=telemetry-macro).
