var loadJsons = require('../lib/loadJsons');

describe("Get a recursive directory load of JSONs", function() {
  it("Should return a non-null object", function(done) {
    loadJsons("./specs")(function(json) {
      expect(json.length).toBe(3);
      done();
    });
  });
});
