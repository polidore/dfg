var DFG = require('../');

/*
[ { '@type': 'electricity', kwhRate: 0.2, ac: true },
  { '@type': 'electricity',
    '@override': { country: 'US', state: 'NY' },
    kwhRate: 0.19 },
  { '@type': 'electricity',
    '@override': { country: 'US' },
    kwhRate: 0.12 } ]
*/

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
    expect(dfg._data.length).toBe(3);
  });
  it("Should let me create a type", function() {
    dfg.createType('electricity',['country','state','city']);
    expect(dfg._types['electricity']).toBeTruthy();
  });
  it("Should return the defaults when lacking a context", function() {
    var cfg = dfg.getCfg('electricity');
    expect(cfg.kwhRate).toBe(0.2);
    expect(cfg.ac).toBeTruthy();
  });
});
