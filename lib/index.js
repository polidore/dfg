var util = require('util');

module.exports = function() {
  return {};
}

function DFGFactory(options) {
  if(!options) {
    options.useFs = true;
    options.rootPath = './cfg/';
  }
  this.options = options;
  this.types = {};
};

DFGFactory.prototype.createType = function(typeName, overrideScheme) {
  if(this.types[typeName]) throw "Already have that type";

  this.types[typeName] = new DFGType(overrideScheme);
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
