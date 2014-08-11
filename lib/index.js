var util = require('util');
var events = require('events');

var factory;
Module.exports = function(options) {
  if(!factory) {
    factory = new DFGFactory(options);
  }
  return factory;
}

function DFGFactory(options) {
  events.EventEmitter.call(this);
  if(!options) {
    options.useFs = true;
    options.rootPath = './cfg/';
  }
  this._options = options;
  this._types = {};
  this._loadData();
};

util.inherits(DFGFactory,events.EventEmitter);

DFGFactory.prototype._loadData = function() {
  var self = this;
  if(this._options.useFs) {
    loadFsData(this._options.rootPath)(function(data) {
      self._data = data;
      self.emit('ready',self);
    });
  }
  else throw "Not implemented";
}

var loadFsData = function(rootPath) {
//hmm. this is async, but api is currently not async...........
//promises? callback? event? have to think.
};

DFGFactory.prototype.createType = function(typeName, overrideScheme) {
  if(this._types[typeName]) throw "Duplicate declaration of type " + typeName;
  if(!this._data[typeName]) throw "No source material for type " + typeName;

  this._types[typeName] = new DFGType(overrideScheme,this._data[typeName]);
};

DFGFactory.prototype.getType = function(typeName, context) {
  if(!this._types[typeName]) throw "Unknown type " + typeName;
  return this._types[typeName](context);
};

DFGFactory.prototype.typeGetter = function(typeName) { //partial!
  var self = this;
  return function(context) {
    return self.getType(typeName,context);
  };
};

function DFGType(overrideScheme) {
  
};
