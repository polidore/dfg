var fs = require('fs');
var Q = require('q');

module.exports = function(path) {
  return function(callback) { //thunk. prepare for node 0.11
    readDir(path).then(callback).catch(console.dir);
  }
}

var readDir = function(path) {
  var deferred = Q.defer();
  console.log("Reading %s",path);
  fs.readdir(path,function(err,files) {
    if(!path || !path.slice) throw "No path"
    if(path.slice(-1) == '/') {
      path = path.slice(0,-1);
    }
    if(err) throw err;

    var promises = [];
    files.forEach(function(file) {
      var stats = fs.statSync(path + '/' + file); //too annoying of an async api since doesn't return the file name
      if(stats.isDirectory()) {
        console.log("Recursive call to %s",path + '/' + file);
        promises.push(readDir(path + '/' + file));
      }
      else if(stats.isFile()) {
        if(!file.match(/\.json$/)) return;
        console.log("Reading file %s",file);
        promises.push(Q.nfcall(fs.readFile,path + '/' + file,{encoding:'utf8'}));
      }
      else {
        throw "Unknown filesystem object"
      }
    });

    if(promises.length <= 0) {
      deferred.reject('No files');
      return;
    }

    console.log("%d promises",promises.length);

    Q.allSettled(promises).then(function(results) {
      var data = [];
      var jsons = [];

      console.log("Done");
      results.forEach(function(result) {
        if(result.state == 'fulfilled') {
          if(typeof result.value == 'string') {
            data.push(result.value);
          }
          else {
            console.log("Recursive dir!");
            jsons = jsons.concat(result.value);
          }
        }
        else {
          deferred.resolve(result.reason);
        }
      });

      console.log("Have %d files",data.length);

      data.forEach(function(d) {
        jsons.push(JSON.parse(d));
      });
      deferred.resolve(jsons);
    });
  });
  return deferred.promise;
}
