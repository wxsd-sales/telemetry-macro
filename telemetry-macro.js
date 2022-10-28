/********************************************************
Copyright (c) 2022 Cisco and/or its affiliates.
This software is licensed to you under the terms of the Cisco Sample
Code License, Version 1.1 (the "License"). You may obtain a copy of the
License at
               https://developer.cisco.com/docs/licenses
All use of the material herein must be in accordance with the terms of
the License. All rights not expressly granted by the License are
reserved. Unless required by applicable law or agreed to separately in
writing, software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
or implied.
*********************************************************
 * 
 * Macro Author:      	William Mills
 *                    	Technical Solutions Specialist 
 *                    	wimills@cisco.com
 *                    	Cisco Systems
 * 
 * Version: 1-0-0
 * Released: 10/27/22
 * 
 * This maco sends perodic telemetry data of all your Webex Devices sensors
 * and can send imediate updates when specific status changes or events occur.
 * 
 * Full Readme and source code availabel on Github:
 * https://github.com/wxsd-sales/telemetry-macro
 * 
 ********************************************************/
import xapi from 'xapi';

/*********************************************************
 * Configure the settings below
**********************************************************/


const config = {
  telemetryServer: 'https://<your telemetry server address>',
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
    NumberOfActiveCalls: true
  },
  event: {
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
  setInterval(sendTelemetry, config.intervalTime);
}
main();

async function sendTelemetry() {
  let payload = {}
  payload.id = id;
  payload.status = await getStatus();
  sendPaylod(payload);
}

async function getStatus() {
  let status = {}

  const roomAnalytics = await xapi.Status.RoomAnalytics.get();
  const peripherals = await xapi.Status.Peripherals.get();
  const state = await xapi.Status.SystemUnit.State.get();

  if(roomAnalytics.hasOwnProperty('PeopleCount'))
    if(config.sensors.device.PeopleCountCurrent)
      status.PeopleCount = roomAnalytics.PeopleCount

  if(roomAnalytics.hasOwnProperty('PeoplePresence'))
    if(config.sensors.device.PeoplePresence)
      status.PeoplePresence = roomAnalytics.PeoplePresence

  if(roomAnalytics.hasOwnProperty('AmbientNoise'))
    if(config.sensors.device.AmbientNoiseLevelA)
      status.AmbientNoiseLevelA = roomAnalytics.AmbientNoise.Level.A
  
  if(roomAnalytics.hasOwnProperty('ReverberationTime'))
    if(config.sensors.device.ReverberationTime)
      status.ReverberationTime = roomAnalytics.ReverberationTime

  if(roomAnalytics.hasOwnProperty('T3Alarm'))
    if(config.sensors.device.T3Alarm)
      status.T3Alarm = roomAnalytics.T3Alarm


  if(peripherals.hasOwnProperty('ConnectedDevice')) {
    const navs = peripherals.ConnectedDevice.filter(cd => {
      if(cd.hasOwnProperty('Location'))
        return false;

      return (cd.Name == 'Cisco Webex Room Navigator' && cd.Location == 'InsideRoom')
    })

    if(navs.length < 0) {
      if(config.sensors.peripherals.AirQualityIndex)
        status.AirQuality = navs[0].RoomAnalytics.AirQuality.Index

      if(config.sensors.peripherals.RelativeHumidity)
        status.RelativeHumidity = navs[0].RoomAnalytics.RelativeHumidity

      if(config.sensors.peripherals.AmbientTemperature)
        status.AmbientTemperature = navs[0].RoomAnalytics.AmbientTemperature
    }
  }

  if(state.hasOwnProperty('NumberOfActiveCalls'))
    if(config.status.NumberOfActiveCalls)
      status.NumberOfActiveCalls = state.NumberOfActiveCalls

  return status
}

async function processEvent(event, type){
  let payload = {}
  payload[type] = event;
  payload.id = id;
  payload.status = await getStatus();
  sendPaylod(payload);
}

function subscribeToChanges() {
  if(config.status.NumberOfActiveCalls) {
    xapi.Status.SystemUnit.State.NumberOfActiveCalls
      .on(sendTelemetry);
  }
  if(config.event.BootEvent) {
    xapi.Event.BootEvent
      .on(e => processEvent(e, 'BootEvent'));
  }
  if(config.event.PresentationStarted) {
    xapi.Event.PresentationStarted
    .on(e => processEvent(e, 'PresentationStarted'));
  }
  if(config.event.PresentationStopped) {
    xapi.Event.PresentationStopped
    .on(e => processEvent(e, 'PresentationStopped'));
  }
}

async function getIdentifications() {
    if(config.id.IPAddress)
      id.IPAddress = await await xapi.Status.Network[1].IPv4.Address.get();

    if(config.id.IPAddressV6)
      id.IPAddressV6 = await xapi.Status.Network[1].IPv6.Address.get()

    if(config.id.IPAddressV6 || config.id.IPAddressV6)
      xapi.Status.Network.on(getIdentifications);

    if(config.id.MACAddress) 
      id.MACAddress = await xapi.Status.Network[1].Ethernet.MacAddress.get()
  
    if(config.id.ProductID)
      id.ProductID = await xapi.Status.SystemUnit.ProductId.get()

    if(config.id.ProductType)
      id.ProductType = await xapi.Status.SystemUnit.ProductType.get()

    if(config.id.SWVersion)
      id.SWVersion = await xapi.Status.SystemUnit.Software.Version.get()

    if(config.id.SerialNumber)
      id.SerialNumber = await xapi.Status.SystemUnit.Hardware.Module.SerialNumber.get()

    if(config.id.SystemName)
      id.SystemName = await xapi.Status.SystemUnit.Software.Name.get()
  
    if(config.id.DeviceId)
      id.DeviceId = await xapi.Status.Webex.DeveloperId.get()
    
}

function applyConfiguration() {

  xapi.Config.HttpClient.Mode
    .set('On');

  xapi.Config.HttpClient.AllowInsecureHTTPS
    .set('True');

  if(xapi.Config.RoomAnalytics.PeopleCountOutOfCall === 'function')
    xapi.Config.RoomAnalytics.PeopleCountOutOfCall
      .set(config.sensors.device.PeopleCountCurrent ? 'On' : 'Off');
  
  if(xapi.Config.RoomAnalytics.PeoplePresenceDetector === 'function')
    xapi.Config.RoomAnalytics.PeoplePresenceDetector
      .set(config.sensors.device.PeoplePresence ? 'On' : 'Off');
  
  if(xapi.Config.RoomAnalytics.AmbientNoiseEstimation.Mode === 'function')
    xapi.Config.RoomAnalytics.AmbientNoiseEstimation.Mode
      .set(config.sensors.device.AmbientNoiseLevelA ? 'On' : 'Off');
  
  if(xapi.Config.RoomAnalytics.ReverberationTime.Mode === 'function')
    xapi.Config.RoomAnalytics.ReverberationTime.Mode
      .set(config.sensors.device.ReverberationTime ? 'On' : 'Off');
  
  if(xapi.Config.RoomAnalytics.T3AlarmDetection.Mode === 'function')
    xapi.Config.RoomAnalytics.T3AlarmDetection.Mode
      .set(config.sensors.device.T3Alarm ? 'On' : 'Off');
}

function sendPaylod(payload) {
  console.log(payload);
  const headers = ['Content-type: application/json', 'Authorization: Bearer ' + config.accessToken];
  xapi.Command.HttpClient.Post({
    Header: headers,
    ResultBody: 'PlainText',
    Url: config.telemetryServer
  },
    JSON.stringify(payload))
    .then(r => console.log('Status: ' + r.StatusCode))
    .catch(e => console.log('Error: ' + JSON.stringify(e)));
}
