var util = require('util');

var factory;
module.exports = function(options) {
  if(!factory) {
    factory = new DFGFactory(options);
  }
  return factory;
}

function DFGFactory(options) {
  if(!options) {
    options.useFs = true;
    options.rootPath = './cfg/';
  }
  this.options = options;
  this.types = {};
  this.loadData();
};

DFGFactory.prototype.loadData = function() {
  if(this.options.useFs) {
    this._data = loadFsData(this.options.rootPath);
  }
  else throw "Not implemented";
}

var loadFsData = function(rootPath) {
//hmm. this is async, but api is currently not async...........
//promises? callback? event? have to think.
};

DFGFactory.prototype.createType = function(typeName, overrideScheme) {
  if(this.types[typeName]) throw "Duplicate declaration of type " + typeName;
  if(!this._data[typeName]) throw "No source material for type " + typeName;

  this.types[typeName] = new DFGType(overrideScheme,this._data[typeName]);
};

DFGFactory.prototype.getType = function(typeName, context) {
  if(!this.types[typeName]) throw "Unknown type " + typeName;
  return this.types[typeName](context);
};

DFGFactory.prototype.typeGetter = function(typeName) { //partial!
  var self = this;
  return function(context) {
    return self.getType(typeName,context);
  };
};

function DFGType(overrideScheme) {
  
};
