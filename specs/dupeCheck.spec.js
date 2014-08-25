var DFG = require('../');

describe("Should not allow duplicate override keys", function() {
  var dfg;
  beforeEach(function(done) {
    if(!dfg) {
      dfg = DFG({useFs:true,rootPath:'./specs/dupeJsons/'});
      dfg.on('ready',done);
    }
    else if(dfg.ready) return done();
  });

  it("Should have data", function() {
    expect(dfg._data).toBeTruthy();
  });

  it("Should not let me create a type because of duplicate override keys", function() {
    var gotError = false;
    try {
      dfg.createType('electricity',['country','state','city']);
    }
    catch(e) {
      gotError = e;
    }
    expect(gotError).toBeTruthy();
  });
});
