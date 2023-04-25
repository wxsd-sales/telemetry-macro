/********************************************************
 * 
 * Macro Author:      	William Mills
 *                    	Technical Solutions Specialist 
 *                    	wimills@cisco.com
 *                    	Cisco Systems
 * 
 * Version: 1-0-3
 * Released: 11/28/22
 * 
 * This macro sends perodic telemetry data of all your Webex Devices sensors
 * and can send immediate updates when specific status changes or events occur.
 * 
 * Full Readme, source code and license agreement available on Github:
 * https://github.com/wxsd-sales/telemetry-macro
 * 
 ********************************************************/
import xapi from 'xapi';

/*********************************************************
 * Configure the settings below
**********************************************************/


const config = {
  telemetryServer: 'https://< your telemetry server address>',
  accessToken: '<your webhooks access token>',  // Your telemetry services Bearer Access Token
  intervalTime: 120000,    // Specify the delay between telemetry events (milliseconds)
  id: {       // Sepecify which identification do you want in the payload
    IPAddress: true,
    IPAddressV6: true,
    MACAddress: true,
    ProductID: true,
    ProductType: true,   // All ID settings can be toggles off by setting to false
    SWVersion: true,
    SerialNumber: true,
    SystemName: true,
    DeviceId: true
  },
  sensors: {    //Specify which sensors you want to monitor on the device
    device: {   // Main device sensor data
      AmbientNoiseLevelA: true,
      AmbientTemperature: true,
      CloseProximity: true,
      RelativeHumidity: true,     // Select which RoomAnalyics sensor you want to monitor
      PeoplePresence: true,
      PeopleCountCurrent: true,
      SoundLevelA: true,
      T3Alarm: true
    },
    periherals: {
      AirQualityIndex: true,      // If a Inside room navigator is present
      AmbientTemperature: true,   // Is sensor values can be included and overwrite 
      RelativeHumidity: true      // the main devices readings if it has the same sensors
    }
  },
  status: {     //Specify which status you want to monitor on the device
    NumberOfActiveCalls: true,
    PeoplePresence: true,
    PeopleCountCurrent: true
  },
  event: {    //Specify which events you want to monitor on the device
    BootEvent: true,
    PresentationStarted: true,
    PresentationStopped: true
  }
};

// Store Identification information in memory
let id = {}

// Initialize and begine monitoring changes and sending periodic telemetry
async function main() {
  await applyConfiguration();
  await getIdentifications();
  subscribeToChanges();
  sendTelemetry();
  setInterval(sendTelemetry, config.intervalTime);
}

setTimeout(main, 2000);

async function sendTelemetry() {
  console.log('Sending Telemetry Event');
  let payload = {}
  payload.id = id;
  payload.status = await getStatus();
  sendPaylod(payload);
}

async function getStatus() {
  let status = {}

  let roomAnalytics, peripherals, state;

  try {
    roomAnalytics = await xapi.Status.RoomAnalytics.get();
  } catch (e) {
    console.error('Unable to get Room Analytics Status:', e.message);
  }

  try {
    peripherals = await xapi.Status.Peripherals.get();
  } catch (e) {
    console.error('Unable to get Peripherals Status:', e);
  }

  try {
    state = await xapi.Status.SystemUnit.State.get();
  } catch (e) {
    console.error('Unable to jget SystemUnit State:', e.message);
  }

  if (roomAnalytics.hasOwnProperty('PeopleCount'))
    if (config.sensors.device.PeopleCountCurrent)
      status.PeopleCount = roomAnalytics.PeopleCount

  if (roomAnalytics.hasOwnProperty('PeoplePresence'))
    if (config.sensors.device.PeoplePresence)
      status.PeoplePresence = roomAnalytics.PeoplePresence

  if (roomAnalytics.hasOwnProperty('AmbientNoise'))
    if (config.sensors.device.AmbientNoiseLevelA)
      status.AmbientNoiseLevelA = roomAnalytics.AmbientNoise.Level.A

  if (roomAnalytics.hasOwnProperty('ReverberationTime'))
    if (config.sensors.device.ReverberationTime)
      status.ReverberationTime = roomAnalytics.ReverberationTime

  if (roomAnalytics.hasOwnProperty('T3Alarm'))
    if (config.sensors.device.T3Alarm)
      status.T3Alarm = roomAnalytics.T3Alarm


  if (peripherals.hasOwnProperty('ConnectedDevice')) {
    const navs = peripherals.ConnectedDevice.filter(cd => {
      if (cd.hasOwnProperty('Location'))
        return false;

      return (cd.Name == 'Cisco Webex Room Navigator' && cd.Location == 'InsideRoom')
    })

    if (navs.length < 0) {
      if (config.sensors.peripherals.AirQualityIndex)
        status.AirQuality = navs[0].RoomAnalytics.AirQuality.Index

      if (config.sensors.peripherals.RelativeHumidity)
        status.RelativeHumidity = navs[0].RoomAnalytics.RelativeHumidity

      if (config.sensors.peripherals.AmbientTemperature)
        status.AmbientTemperature = navs[0].RoomAnalytics.AmbientTemperature
    }
  }

  if (state.hasOwnProperty('NumberOfActiveCalls'))
    if (config.status.NumberOfActiveCalls)
      status.NumberOfActiveCalls = state.NumberOfActiveCalls

  return status
}

async function processEvent(event, type) {
  let payload = {}
  payload[type] = event;
  payload.id = id;
  payload.status = await getStatus();
  sendPaylod(payload);
}



function subscribeToChanges() {
  console.log('Subscribing to Status and Events');

  // Subscribe to Status changes
  if (config.status.NumberOfActiveCalls) {
    try {
      xapi.Status.SystemUnit.State.NumberOfActiveCalls.on(e => processEvent(e, 'NumberOfActiveCalls'))
    } catch (e) { console.error('Unable to get subscribe to Number of Active Calls:', e.message) }
  }
  if (config.status.PeoplePresence) {
    try {
      xapi.Status.RoomAnalytics.PeoplePresence.on(e => processEvent(e, 'PeoplePresence'))
    } catch (e) { console.error('Unable to get subscribe to PeoplePresence Status:', e.message) }
  }
  if (config.status.PeopleCountCurrent) {
    try {
      xapi.Status.RoomAnalytics.PeopleCount.Current.on(e => processEvent(e, 'PeopleCountCurrent'))
    } catch (e) { console.error('Unable to get subscribe to PeoplePresence Current Status:', e.message) }
  }

  // Subscribe to Events changes
  if (config.event.BootEvent) {
    try {
      xapi.Event.BootEvent.on(e => processEvent(e, 'BootEvent'))
    } catch (e) { console.error('Unable to get subscribe to Boot Events:', e.message) }
  }
  if (config.event.PresentationStarted) {
    try {
      xapi.Event.PresentationStarted.on(e => processEvent(e, 'PresentationStarted'))
    } catch (e) { console.error('Unable to get subscribe to Presentation Started Event:', e.message) }
  }
  if (config.event.PresentationStopped) {
    try {
      xapi.Event.PresentationStopped.on(e => processEvent(e, 'PresentationStopped'))
    } catch (e) { console.error('Unable to get subscribe to Presentation Stopped Event:', e.message) }
  }
}



async function getIdentifications() {

  console.log('Getting Device Identifications')

  if (config.id.IPAddress) {
    try {
      id.IPAddress = await xapi.Status.Network[1].IPv4.Address.get();
    } catch (e) {
      console.error('Unable to get IPv4 Address:', e.message);
    }
  }

  if (config.id.IPAddressV6) {
    try {
      id.IPAddressV6 = await xapi.Status.Network[1].IPv6.Address.get()
    } catch (e) {
      console.error('Unable to get IPv6 Address:', e.message);
    }
  }

  if (config.id.IPAddressV6 || config.id.IPAddressV6)
    try {
      xapi.Status.Network.on(getIdentifications);
    } catch (e) {
      console.error('Unable to subscribe to Network Status changes', e.message);
    }

  if (config.id.MACAddress) {
    try {
      id.MACAddress = await xapi.Status.Network[1].Ethernet.MacAddress.get()
    } catch (e) {
      console.error('Unable to Ethernet Mac Address', e.message);
    }
  }

  if (config.id.ProductID) {
    try {
      id.ProductID = await xapi.Status.SystemUnit.ProductId.get()
    } catch (e) {
      console.error('Unable to get System Unit Product Id', e.message)
    }
  }

  if (config.id.ProductType) {
    try {
      id.ProductType = await xapi.Status.SystemUnit.ProductType.get()
    } catch (e) {
      console.error('Unable to get System Unit Product Type:', e.message)
    }
  }

  if (config.id.SWVersion) {
    try {
      id.SWVersion = await xapi.Status.SystemUnit.Software.Version.get()
    } catch (e) {
      console.error('Unable to get System Unit Software Version:', e.message)
    }
  }

  if (config.id.SerialNumber) {
    try {
      id.SerialNumber = await xapi.Status.SystemUnit.Hardware.Module.SerialNumber.get()
    } catch (e) {
      console.error('Unable to get System Unit Hardware Module Serial Number:', e.message)
    }
  }

  if (config.id.SystemName) {
    try {
      id.SystemName = await xapi.Status.SystemUnit.Software.Name.get()
    } catch (e) {
      console.error('Unable to get System Unit Software Name:', e.message)
    }
  }

  if (config.id.DeviceId) {
    try {
      id.DeviceId = await xapi.Status.Webex.DeveloperId.get()
    } catch (e) {
      console.error('Unable to get Webex Developer ID:', e.message)
    }
  }

}

function applyConfiguration() {

  console.log('Applying Configurations')

  xapi.Config.HttpClient.Mode.set('On')
    .catch(e => console.error('Unable to set HTTP Client', e.message))

  xapi.Config.HttpClient.AllowInsecureHTTPS.set('True')
    .catch(e => console.error('Unable to set Allow Insecure HTTPS', e.message))

  if (xapi.Config.RoomAnalytics.PeopleCountOutOfCall === 'function') {
    xapi.Config.RoomAnalytics.PeopleCountOutOfCall.set(config.sensors.device.PeopleCountCurrent ? 'On' : 'Off')
      .catch(e => console.error('Unable to set People Count Out of Call', e.message))
  }

  if (xapi.Config.RoomAnalytics.PeoplePresenceDetector === 'function') {
    xapi.Config.RoomAnalytics.PeoplePresenceDetector.set(config.sensors.device.PeoplePresence ? 'On' : 'Off')
      .catch(e => console.error('Unable to set People Presence Detector', e.message))
  }

  if (xapi.Config.RoomAnalytics.AmbientNoiseEstimation.Mode === 'function') {
    xapi.Config.RoomAnalytics.AmbientNoiseEstimation.Mode.set(config.sensors.device.AmbientNoiseLevelA ? 'On' : 'Off')
      .catch(e => console.error('Unable to set Ambient Noise Estimation mode', e.message))
  }

  if (xapi.Config.RoomAnalytics.ReverberationTime.Mode === 'function') {
    xapi.Config.RoomAnalytics.ReverberationTime.Mode.set(config.sensors.device.ReverberationTime ? 'On' : 'Off')
      .catch(e => console.error('Unable to set ReverberationTime mode', e.message))
  }

  if (xapi.Config.RoomAnalytics.T3AlarmDetection.Mode === 'function') {
    xapi.Config.RoomAnalytics.T3AlarmDetection.Mode.set(config.sensors.device.T3Alarm ? 'On' : 'Off')
      .catch(e => console.error('Unable to set T3AlarmDetection mode', e.message))
  }
}

function sendPaylod(payload) {
  console.log(payload);
  const headers = ['Content-type: application/json', 'Authorization: Bearer ' + config.accessToken];

  xapi.Command.HttpClient.Post({
    AllowInsecureHTTPS: 'True',
    Header: headers,
    ResultBody: 'PlainText',
    Url: config.telemetryServer
  },
    JSON.stringify(payload))
    .then(r => console.log('Status: ' + r.StatusCode))
    .catch(e => console.log('Error: ' + JSON.stringify(e)))

}
