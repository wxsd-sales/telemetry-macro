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

This Macro was developed and tested on a Webex Codec Pro with Webex Room Navigator and a Touch 10 to verify the exist PWA mode feature. Other combinations of devices e.g. Desk/Board devices paired with a Navigator should also work but haven't been tested at this time.

## Support

Please reach out to the WXSD team at [wxsd@external.cisco.com](mailto:wxsd@external.cisco.com?subject=telemetry-macro).
