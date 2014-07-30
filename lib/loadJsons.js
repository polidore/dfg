var fs = require('fs');
var q = require('q');

module.exports = function(path) {
  return function(callback) { //thunk. prepare for node 11
    Q.nfcall(fs.readdir,path)
    .then(function(files) {
      files.forEach(function(file) {

      })
    })
  }
}
