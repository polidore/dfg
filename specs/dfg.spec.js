var DFG = require('../');

describe("DFG lets you Do it with conFiGs!", function() {
  var dfg;
  beforeEach(function(done) {
    if(!dfg) {
      dfg = DFG({useFs:true,rootPath:'./specs/jsons/'});
      dfg.on('ready',done);
    }
    else if(dfg.ready) return done();
  });

  it("Should have data", function() {
    expect(dfg._data).toBeTruthy();
  });
  it("Should let me create a type", function() {
    dfg.createType("electricity"[function city() { return 'NY'}]);
    expect(
  });
});
