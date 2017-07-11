"use strict";

const request = require('request')

let bearertoken = Homey.env.BEARER_TOKEN

let req = request.defaults({
  headers: {
    'Authorization': 'Bearer ' + bearertoken,
    'Content-Type': 'application/json'
  }
})

function apiRequest(url, callback) {
  req('http://127.0.0.1/api' + url, (err, res, body) => {
    if (err) return console.error(err);
    var json = JSON.parse(body).result
    var statusCode = JSON.parse(body).status
    callback(json, err, statusCode)
  })
}

function sendNotification(message) {
    Homey.manager('notifications').createNotification({
        excerpt: message
    }, function( err, notification ){
        if( err ) return console.error( err );
        console.log( 'Notification send: ' + message );
    });
}

function registerFlows() {
  Homey.manager('flow').on('condition.checkZone.check.autocomplete', (callback, args) => {
    console.log('On flow: Check zone autocomplete')
    apiRequest('/manager/zones/zone', (res, err, statusCode) => {
      var allZones = []
      for (var key in res) {
        if (res.hasOwnProperty(key)) {
          allZones.push({
            name: res[key].name,
            icon: '/manager/zones/assets/icons/' + res[key].icon + '.svg',
            id: res[key].id
          })
        }
      }
      allZones = allZones.filter(function(item) {
        if (item.name) return (item.name.toLowerCase().indexOf(args.query.toLowerCase()) > -1)
        else callback('Error while reading zones, did you enter the bearer token?', null)
      })
      // console.log(allZones)
      callback(null, allZones)
    })
  })

  Homey.manager('flow').on('condition.checkZone', function(callback, args) {
    console.log('On flow: Check zone')
    apiRequest('/manager/devices/device/?zone=' + args.check.id, (res, err, statusCode) => {
      var result = false
      for (var key in res) {
        if (res.hasOwnProperty(key)) {
          if (res[key].class == 'light') {
            if (res[key].state.onoff == true) {
              // console.log('Found a device that is on!')
              result = true
              break
            }
          }
        }
      }
      callback(null, result);
    })

  });

  Homey.manager('flow').on('condition.checkBattery', function(callback, args) {
    console.log('On flow: Check battery')
    apiRequest('/manager/devices/device/', (res, err, statusCode) => {
      var result = false
      for (var key in res) {
        if (res.hasOwnProperty(key)) {
          if (res[key].capabilities.measure_battery) {
            if (res[key].state.measure_battery < args.batterycheck && res[key].state.measure_battery) {
              console.log(res[key].name + ' has a battery level below ' + args.batterycheck + '. Current level is ' + res[key].state.measure_battery)
              result = true
              break
            }
          }
        }
      }
      callback(null, result);
    })

  })

  Homey.manager('flow').on('trigger.update_check', function(callback, args, state) {
    console.log('On flow: Update check')
    var timeagoupdated = new Date - new Date(state.lastUpdated[args.capability])

    if (args.capability in state.capabilities && timeagoupdated >= args.per * 60 * 1000) {
      callback(null, true)
    }
    else {
      callback(null, false)
    }
  })

  Homey.manager('flow').on('trigger.battery_check', function(callback, args, state) {
    console.log('On flow: Battery check')
    if (state.state.measure_battery < args.lvl && state.state.measure_battery) {
      callback(null, true)
    }
    else {
      callback(null, false)
    }
  })
}

function getHomeyDevices() {
    console.log('Get Homey devices')
    apiRequest('/manager/devices/device/', (res, err, statusCode) => {
      if (res != 'unauthorized') {
            for (var key in res) {
              if (res.hasOwnProperty(key)) {
                Homey.manager('flow').trigger('update_check', {
                  name: res[key].name
                }, res[key])
                if (res[key].capabilities && res[key].capabilities.measure_battery) {
                  Homey.manager('flow').trigger('battery_check', {
                    name: res[key].name,
                    batterylvl: res[key].state.measure_battery
                  }, res[key])
                }
              }
            }
      } else {
      console.log('Unauthorized, please input bearer token in app.js file');
      }
    })
}

function scheduleChecks() {
  setInterval(function() {

    console.log('scheduled checks')
    getHomeyDevices();

  }, 60000);
}

function checkBearerToken(callback) {
  console.log('checkBearerToken')

  var bearerTokenIsString = typeof bearertoken === 'string' || bearertoken instanceof String
  apiRequest('/manager/users/user/me', (res, err, statusCode) => {
    var result = bearerTokenIsString && statusCode == 200
    callback(result)
  })
}

function init() {

  // loadSocket()

  checkBearerToken((resultOk) => {
    if (resultOk) {
     console.log('Check bearer token is ok')
     console.log('Bearer token = ' + bearertoken)
     registerFlows()
     scheduleChecks()
     getHomeyDevices()
    } else {
      console.log('Bearer code not ok', bearertoken)
      sendNotification('Bearer token unknown')
      console.log('Bearer token = ', bearertoken)
    }
  })
}
module.exports.init = init;