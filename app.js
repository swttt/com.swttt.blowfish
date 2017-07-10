"use strict";

const request = require('request')


let bearertoken = 'YOUR TOKEN HERE'

let req = request.defaults({
  headers: {
    'Authorization': 'Bearer ' + bearertoken,
    'Content-Type': 'application/json'
  }
})

function apiRequest(url, callback) {
  req('http://127.0.0.1/api' + url, (err, res, body) => {
    if (err) return console.error(err);

    callback(JSON.parse(body).result)
  })
}


function init() {

  // loadSocket()

  Homey.manager('flow').on('condition.checkZone.check.autocomplete', (callback, args) => {
    apiRequest('/manager/zones/zone', (res, err) => {
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
    apiRequest('/manager/devices/device/?zone=' + args.check.id, (res, err) => {
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
    apiRequest('/manager/devices/device/', (res, err) => {
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
    var timeagoupdated = new Date - new Date(state.lastUpdated[args.capability])

    if (args.capability in state.capabilities && timeagoupdated >= args.per * 60 * 1000) {

      callback(null, true)
    }
    else {
      callback(null, false)
    }



  })

  Homey.manager('flow').on('trigger.battery_check', function(callback, args, state) {
    if (state.state.measure_battery < args.lvl && state.state.measure_battery) {

      callback(null, true)
    }
    else {
      callback(null, false)
    }



  })

  setInterval(function() {

    apiRequest('/manager/devices/device/', (res, err) => {
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

  }, 60000);
}

module.exports.init = init;
