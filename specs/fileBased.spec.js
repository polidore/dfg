var loadJsons = require('../lib/loadJsons');

describe("Get a recursive directory load of JSONs", function() {
  var data;
  beforeEach(function(done) {
    if(data) done();
    else {
      loadJsons("./specs")(function(d) {
        data = d;
        done();
      });
    }
  });

  it("Should return right number of jsons", function() {
    expect(data.length).toBe(6);
  });

  it("Should have a @type field on all objects", function() {
    data.forEach(function(d) {
      expect(d['@type']).toBeDefined();
    });
  });
});
