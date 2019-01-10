var fs = require('fs');
var Q = require('q');

module.exports = function(path) {
  return function(callback) { //thunk. prepare for node 0.11
    readDir(path).then(callback).catch(console.log);
  };
};

//stat that returns the filename
var stat = function(file) {
  var deferred = Q.defer();
  fs.stat(file,function(err,stats) {
    if(err) deferred.reject(err);
    else deferred.resolve({file:file,stats:stats});
  });
  return deferred.promise;
};

var readDir = function(path) {
  var deferred = Q.defer();

  if(!path || !path.slice) throw "No path";
  if(path.slice(-1) == '/') {
    path = path.slice(0,-1);
  }

  var statPromises = [];
  var readPromises = [];

  Q.nfcall(fs.readdir,path).then(function(files) {
    files.forEach(function(file) {
      statPromises.push(stat(path + '/' + file));
    });
  })
    .then(function() { return Q.allSettled(statPromises); })
    .then(function(results) {
      results.forEach(function(result)  {
        if(result.state == 'fulfilled') {
          var file = result.value.file;
          var stats = result.value.stats;
          if(stats.isDirectory()) {
            readPromises.push(readDir(file));
          }
          else if(stats.isFile()) {
            if(!file.match(/\.json$/)) return;
            readPromises.push(Q.nfcall(fs.readFile,file,{encoding:'utf8'}));
          }
          else {
            throw "Unknown filesystem object";
          }
        }
        else {
          throw results.reason;
        }
      });
    })
    .then(function() { return Q.allSettled(readPromises); })
    .then(function(results) {
      var data = [];
      var jsons = [];

      results.forEach(function(result) {
        if(result.state == 'fulfilled') {
          if(typeof result.value == 'string') {
            data.push(result.value);
          }
          else {
            jsons = jsons.concat(result.value);
          }
        }
        else {
          throw result.reason;
        }
      });

      data.forEach(function(d) {
        let parsedFile;
        try {
          parsedFile = JSON.parse(d);
          jsons.push(parsedFile);
        }
        catch(e) {
          console.log('Skipping file: Can\'t parse this' + JSON.stringify(d) + ': ', e.stack || e);
        }

      });
      deferred.resolve(jsons);
    })
    .fail(deferred.reject);

  return deferred.promise;
};
