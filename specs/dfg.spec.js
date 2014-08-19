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
  it("Should return $0.12 when country is US", function() {
    var cfg = dfg.getCfg('electricity', {country:'US'});
    expect(cfg['@cacheMiss']).toBeTruthy();
    expect(cfg.kwhRate).toBe(0.12);
    expect(cfg.ac).toBeTruthy();
  });
  it("Should return $0.12 when country is US and state is NJ", function() {
    var cfg = dfg.getCfg('electricity', {country:'US',state:'NJ'});
    expect(cfg['@secondaryCache']).toBeTruthy();
    expect(cfg.kwhRate).toBe(0.12);
    expect(cfg.ac).toBeTruthy();
  });
  it("Should return $0.19 when country is US and state is NY", function() {
    var cfg = dfg.getCfg('electricity', {country:'US',state:'NY'});
    expect(cfg['@cacheMiss']).toBeTruthy();
    expect(cfg.kwhRate).toBe(0.19);
    expect(cfg.ac).toBeTruthy();
  });
  it("Should return $0.19 when state is NY", function() {
    var cfg = dfg.getCfg('electricity', {state:'NY'});
    console.dir(cfg);
    expect(cfg['@secondaryCache']).toBeTruthy();
    expect(cfg.kwhRate).toBe(0.19);
    expect(cfg.ac).toBeTruthy();
  });
  it("Should return hydro 0.2 when counry is CA", function() {
    var cfg = dfg.getCfg('electricity', {country:'CA'});
    expect(cfg['@secondaryCache']).toBeTruthy();
    console.dir(cfg);
    expect(cfg.hydro).toBe(0.2);
    expect(cfg.ac).toBeTruthy();
  });

});
