# Do it with conFiGs!

A very flexible configuration system built on object oriented programming principles.

## Goals

1. Allow for granular overriding of configurable values
1. Allow configuration overrides to be minimally declared in "fragments"
1. Allow for precise context on when a configuration "fragment" should be used
1. Allow for natural file-based or mongodb based persistence
  * I like files because they go in version control for tracking and they don't require a server to work!

## Example

**Base config**

```json
{
  "@type": "electricity",
  "kwhRate": 0.2,
  "voltage": 220
  "ac": true
}
```

**Override Fragment**

```json
{
  "@type": "electricity",
  "@override": {
    "country": "US"
  },
  "kwhRate": 0.12,
  "voltage": 110
}
```

**Override Scheme**

The order matters.  More on this in a bit, but suffice to say: city will be the "ranking" override context in this override scheme as declared.

```javascript
var DFG = require('dfg');
var dfg = DFG(); //loads fragments recursively starting at ./cfg/*.json
dfg.createType('electricity', ['country', 'state', 'county', 'city']); //0,1,2,3  
```

**Usage**

```javascript
var DFG = require('dfg')
var dfg = DFG(); //loads fragments recursively starting at ./cfg/*.json
var cfg = dfg.getCfg('electricity');  //defaults
console.dir(cfg);
// {  "@type": "electricity", "kwhRate": 0.2, "voltage": 220, "ac": true }
var usCfg = dfg.getCfg('electricity',{country:"US"});
// {  "@type": "electricity", "kwhRate": 0.12, "voltage": 110, "ac": true }
```

## Design

* The configs are arranged into _types_ (`@type`), which are sets of key value pairs where the value can take the type of any JSON type
* The defaults are in a single JSON object lacking the `@override` field
* Overrides are contained in _n_ JSON objects, each with a _unique_ (for a given `@type`) `@override` field
* Overrides are not 'deep', so avoid nesting if you think you might want to override a single, nested field
* There is a single `@override` context schema per `@type`
* Override contexts have a schema represented as a list of keys with exponential, ascending order rankings (bitmask-- more later)
* At runtime, a user will request a configuration by providing the type (string) and an instance of the "context" which will be compared to overrides written to disk or a DB

### Overriding

Above, I mention "exponential, ascending order".  That's a mouthful!  It's pretty simple, though.  We're basically talking about a bitmask.  Imagine the following override context schema for electricity pricing:

```javascript
 ['country', 'state', 'county', 'city'] //0,1,2,3
```

Now, you might have a default price globally of $0.20 / kWh.  

```json
{
  "@type": "electricity",
  "kwhRate": 0.2,
  "ac": true,
  "voltage": 220
}
```
With respect to the ac value: I will not override this, but it will still be present in all contexts in the example below.
This global average rate isn't very useful, though.  You might want to set the US rate to its lower average value of $0.12 / kwh.

```json
{
  "@type": "electricity",
  "@override": {
    "country": "US"
  },
  "kwhRate": 0.12
}
```

OK, that's nice, but what about the rate for New York State?  Easy enough, right?

```json
{
  "@type": "electricity",
  "@override": {
    "country": "US",
    "state": "NY"
  },
  "kwhRate": 0.19
}
```

Now, the overrider is going to have two matches here (after the defaults): the country-wide value of $0.12 / kWh and the state-level value of $0.19.  How does it know the order in which to match them?  It's only natural that $0.19 would win, but how does it do it?  Like this:

* Country is in element 0 of the context schema
* State is in element 1 of the context schema
* The defaults always get an override sum of 0
* The country-only override has a sum of 1
* The country+state override has a sum of 3
* The overrider will create a new object by laying out in ascending order the values defined in the objects selected: defaults and both of our overrides
* Overrides only need define the field they want to change, implicitly accepting the less specific value from an override or the defaults in the final object

This gets more interesting as follows: an override with, e.g., country+state+county will always "lose" to a city override since `2^0+2^1+2^2 < 2^3`!

### Caching

Given the complexity of this system of overrides, it's very important to have good caching.  The system will have two levels of caching, but before we define them, let me remind you how config composition works.  First, a context is created using application data-- DFG cannot help you make this fast, so please make it fast.  Then, DFG uses that context to search the potentially thousands of available overrides for a match.  This is slow, but there are very good caching opportunities here.  Then, slowest of all, DFG creates the final config object by overlaying the defaults with a series of sorted overrides.

1. Primary Cache
  * This is basically a map of context object -> final, override complete object.  This cache gets hit most of the time.
  * You can make this faster by providing an optional `@hash` field in your context object, but DFG will create one for you if you don't provide it.
1. Secondary Cache
  * This is a bit tricker, but imagine our electricity example above-- we have only defined a few unique overrides, but the application will create a huge number of unique context objects as it goes about its business.  For example, if your application has need of the kwhRate for Albany, NY, you know that it's just going to get the state-level override.  DFG will still have to confirm that by searching for matches on its context object, but once it is done and the matches it has found are the same as the ones it previously used for New York, NY the secondary cache comes into play.  Now, these two context objects, each with a distinct `@hash` will share the same config object.
  * This is an OK save in terms of CPU (don't have to override when this cache is hit), but it's a huge memory savings since it prevents the creation of many, many redundant config objects.

#### Best Practices

You should cache your context search key on some unique business object and provide a `@hash` to DFG, but you should not save copies of the config value because this will prevent on the fly config changes.  For example, if you change the value for NY to $0.20 / kWh, and then DFG is told to clear its caches, the next time you ask for NY's rate, you'll get the new value.  If you cache the configset in your application, you won't know about the change.
