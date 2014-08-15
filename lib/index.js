var util = require('util');
var events = require('events');
var loadJsons = require('./loadJsons');

var factory;
module.exports = function(options) {
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
  this.ready = false;
  this._loadData();
};

util.inherits(DFGFactory,events.EventEmitter);

DFGFactory.prototype._loadData = function() {
  var self = this;
  if(this._options.useFs) {
    loadFsData(this._options.rootPath)(function(data) {
      self._data = data;
      self.ready = true;
      self.emit('ready',self);
    });
  }
  else throw "Not implemented";
}

var loadFsData = function(rootPath) {
  return function(cb) {
    loadJsons(rootPath)(cb);
  }
};

DFGFactory.prototype.createType = function(typeName, overrideScheme) {
  if(this._types[typeName]) throw "Duplicate declaration of type " + typeName;

  var fragments = [];
  for(var i in this._data) {
    var fragment = this._data[i];
    if(fragment['@type'] == typeName) {
      fragments.push(fragment);
    }
  }
  if(fragments.length == 0) throw "No source material for type " + typeName;

  this._types[typeName] = new DFGType(overrideScheme,fragments);
};

DFGFactory.prototype.getCfg = function(typeName, context) {
  if(!this._types[typeName]) throw "Unknown type " + typeName;
  return this._types[typeName].get(context);
};

DFGFactory.prototype.typeGetter = function(typeName) { //partial!
  var self = this;
  return function(context) {
    return self.getType(typeName,context);
  };
};

function DFGType(overrideScheme,fragments) {
  this._scheme = overrideScheme;
  this._primaryCache = {};
  this._secondaryCache = {};

  this._fragments = fragments.sort(function(a,b) {
    var aSum = 0, bSum = 0;

  });;
};

DFGType.prototype.get = function(context) {
  var hash,cfg;
  if(!context) {
    hash = '@defaults';
  }
  else if(context['@hash']) {
    hash = context['@hash'];
  }
  else {
    hash = this._makeHash(context);

    //not sure about this. means you can use DFG hasher implicitly if reuse context
    context['@hash'] = hash; 
  }

  cfg = this._primaryCache[hash];
  if(cfg) return cfg;

  var reducedHash = this._makeReducedHash(context,hash);
}

DFGType.prototype._makeReducedHash = function(context) {
  var rh = {hash:'',objs:[]};

}

DFGType.prototype._makeHash = function(context) {
  var hash = '';
  for(var i in this._scheme) {
    var prop = this._scheme[i];
    hash += prop + '=' + (context[prop] || 'null') + '|';
  }
  return hash;
}
