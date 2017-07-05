"use strict";

const request = require('request')

let localip = 'YOUR LOCAL IP'
let bearertoken = 'YOUR BEARER TOKEN'

let req = request.defaults({
  headers: {
    'Authorization': 'Bearer ' + bearertoken,
    'Content-Type': 'application/json'
  }
})

function apiRequest(url, callback) {
  req('http://' + localip + '/api' + url, (err, res, body) => {
    callback(JSON.parse(body).result, err)
  })
}




function init() {



  Homey.manager('flow').on('condition.checkZone.check.autocomplete', (callback, args) => {
    apiRequest('/manager/zones/zone', (res, err) => {
      var allZones = []
      for (var key in res) {
        if (res.hasOwnProperty(key)) {
          console.log(key)
          allZones.push({
            name: res[key].name,
            icon: '/manager/zones/assets/icons/' + res[key].icon + '.svg',
            id: res[key].id
          })
        }
      }
      allZones = allZones.filter(function(item) {
        return (item.name.toLowerCase().indexOf(args.query.toLowerCase()) > -1)
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

}

module.exports.init = init;
