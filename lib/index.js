var util = require('util');
var events = require('events');
var loadJsons = require('./loadJsons');

var factories = {};
module.exports = function(options) {
  var optionsHash = 'defaults';
  if(options && Object.keys(options).length > 0) {
    optionsHash = JSON.stringify(options);
  }

  var factory = factories[optionsHash];
  if(!factory) {
    factory = new DFGFactory(options);
    factories[optionsHash] = factory;
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
    for(var i in overrideScheme) {
      var inc = Math.pow(2,i);
      var k = overrideScheme[i];
      if(fragHasOverride(a,k)) aSum |= inc;
      if(fragHasOverride(b,k)) bSum |= inc;
    }
    return aSum - bSum;
  });

  this._checkCollision();

  if(this._fragments[0]['@override']) {
    throw "No defaults for type";
  }
};

DFGType.prototype._checkCollision = function() {
  var a,b;
  for(var i in this._fragments) {
    if(i==0) continue;
    a = this._fragments[i-1];
    b = this._fragments[i];
    if(!a['@override']) {
      if(!b['@override']) throw "Ambiguous defaults";
      else continue;
    }

    if(Object.keys(a['@override']).length == Object.keys(b['@override']).length) {
      var different = false;
      for(var k in a['@override']) {
        var v = a['@override'][k];
        if(b['@override'][k] != v) {
          different = true;
          break;
        }
      }
      if(!different) {
        throw "Collision on key " + JSON.stringify(a['@override']);
      }
    }
  }
};

var fragHasOverride = function(f,k) {
  return f && f['@override'] && f['@override'][k];
};

DFGType.prototype.get = function(context) {
  var hash,cfg;
  if(!context) {
    return this._fragments[0];
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
  if(cfg) {
    cfg['@primaryCache'] = true;
    delete cfg['@cacheMiss'];
    delete cfg['@secondaryCache'];
    return cfg;
  }

  var reducedHash = this._makeReducedHash(context,hash);

  cfg = this._secondaryCache[reducedHash.hash];
  if(cfg) {
    cfg['@secondaryCache'] = true;
    delete cfg['@cacheMiss'];
    cfg['@rh'] = reducedHash.hash;
    this._primaryCache[hash] = cfg;
    return cfg;
  }

  cfg = this._mergeCfgs(reducedHash.objs);
  cfg['@cacheMiss'] = true;
  cfg['@rh'] = reducedHash.hash;
  this._secondaryCache[reducedHash.hash] = cfg;
  this._primaryCache[hash] = cfg;

  return cfg;
}

var copy = function(o) {
  var r = {};
  for(var k in o) {
    r[k] = o[k];
  }
  return r;
};

DFGType.prototype._mergeCfgs = function(objs) {
  if(objs.length <= 0) throw "Nothing to merge";

  var base;
  for(var i in objs) {
    var o = objs[i];
    if(!base) {
      base = copy(o);
      continue;
    }

    for(var k in o) {
      if(k[0] == '@') continue;

      if(base[k]) {
        base[k] = o[k];
      }
      else throw "Cannot override field (" + k + ") not in defaults"
    }
  }
  return base;
};

DFGType.prototype._makeReducedHash = function(context) {
  var rh = {hash:'defaults|',objs:[]};
  for(var i in this._fragments) {
    var f  = this._fragments[i];
    if(this._fragMatch(f,context)) {
      rh.objs.push(f);
      if(f['@override']) {
        rh.hash += this._makeHash(f['@override']);
      }
    }
  }
  return rh;
}

DFGType.prototype._fragMatch = function(f,c) {
  f = f['@override'];
  if(!f) return true; //defaults

  for(var i in this._scheme) {
    var k = this._scheme[i];
    if(f[k] && f[k] != c[k]) return false;
  }
  return true;
}

DFGType.prototype._makeHash = function(context) {
  var hash = '';
  for(var i in this._scheme) {
    var k = this._scheme[i];
    var v = context[k];
    if(!v) continue;
    hash += k + '=' + v + '|';
  }
  return hash;
}
