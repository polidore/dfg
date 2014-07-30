var fs = require('fs');
var Q = require('q');

module.exports = function(path) {
  return function(callback) { //thunk. prepare for node 0.11
    readDir(path).then(callback);
  }
}

var readDir = function(path) {
  var deferred = Q.defer();
  fs.readdir(path,function(err,files) {
    if(!path || !path.slice) throw "No path"
    if(path.slice(-1) == '/') {
      path = path.slice(0,-1);
    }
    if(err) throw err;

    var promises = [];
    files.forEach(function(file) {
      if(!file.match(/\.json$/)) return;
      fs.stat(path + '/' + file,function(err,stats) {
        if(err) throw err;
        if(stats.isDirectory()) {
          promises.push(readDir(path + '/' + file));
        }
        else if(stats.isFile()) {
          promises.push(Q.nfcall(fs.readFile,file,{encoding:'utf8'}));
        }
      });
    });

    if(promises.length <= 0) {
      deferred.reject('No jsons');
      return;
    }

    Q.allSettled(promises,function(results) {
      var data = [];
      results.forEach(function(result) {
        if(result.state == 'fulfilled') {
          data = data.concat(result.value);
        }
        else {
          throw result.reason;
        }
      });

      var jsons = [];
      data.forEach(function(d) {
        jsons.push(JSON.parse(d));
      });
      deferred.resolve(jsons);
    });
  });
  return deferred.promise;
}
