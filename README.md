# Do it with conFiGs!

I work with configurations a lot in applications I've built, and I find that the way most people do configurations don't fit what I'm trying to accomplish.  I have built this config system in a less formal way in a few applications, but I decided to make it a public project to benefit from a community if there is one for this type of work. 

I want a config system that works like a programming language, but just for data structures.  In fact, even as inheritance has lost some of its lustor in the programming community, I think it is a great way to think about configurations since we're only talking about data, not functionality.  Usually, your application has a set of default configurations that you might tune to be well balanced for most uses, but people request different values to suit their workflows.  You don't want to copy the entire configset for that user if they just want to change a single configurable variable because you would then lose the ability to change other values in a simple and productive way.  Also, you need to know the exact context for which a configuration should change.  Should it be for all uses of the application for a given user or should it be only when they access it via a particular connection?  This seems overly nuanced to many who build large scalable systems, but when you are offering your customers a high level of customer service (usually for a concentrated customer set), this precision becomes valuable.  

## Goals

1. Allow for granular overriding of configurable values
1. Allow for precise context on when a configuration "fragment" should be used
1. Allow configuration overrides to be minimally declared
1. Allow for natural file-based or mongodb based persistence
  * Sure, other databases that support json are fine. I like MongoDB, so that is what I focused on

## Example

**Base config**

```javascript
{ 
  $type: 'coffeeMachine',
  startTime: '09:45:00',
  numCups: 4,
  maxTemp: 65
}
```

**Override Fragment**

Notice, I'm not going to override the "isWeekend" field, but I could.
```javascript
{ 
  $type: 'coffeeMachine',
  $override: {
    clientId: 'ben'
  }
  maxTemp: 75
}
```

**Override Scheme**

The order matters.  More on this in a bit, but suffice to say: clientId will be the "ranking" override context in this override scheme as declared.

```javascript
var dfg = require('dfg');
dfg.addOverrideScheme('coffeeMachine',[ //$type = coffeeMachine
  {isWeekend: function() { 
    return this.isWeekend();
  }},
  {clientId: function() {
    return this.getUserName();
  }}
]); //the list above is the schema for the "context" that will be provided at runtime
```

**Usage**

```javascript
var defaults = dfg('coffeeMachine');
console.dir(defaults);
// { $type: 'coffeeMachine', startTime: '09:45:00', numCups: 4, maxTemp: 65 }
var userLevel = dfg('coffeeMachine',context); 
// { $type: 'coffeeMachine', $override: {clientId: 'ben',isWeekend:false}, startTime: '09:45:00', numCups: 4, maxTemp: 75 }
```

## Design

* The configs are arranged into _types_ (`$type`), which are sets of key value pairs where the value can take the type of any JSON type
* The defaults are in a single JSON object lacking the `$override` field
* Overrides are contained in _n_ JSON objects, each with a _unique_ (for a given `$type`) `$override` field
* Overrides are not 'deep', so avoid nesting if you think you might want to override a single, nested field
* There is a single `$override` context schema per `$type`
* Override contexts have a schema represented as a list of keys with exponential, ascending order rankings (bitmask-- more later)
* At runtime, a user will request a configuration by providing the type (string) and an instance of the "context" which will be compared to overrides written to disk or a DB

### Overriding

Above, I mention "exponential, ascending order".  That's a mouthful!  It's pretty simple, though.  We're basically talking about a bitmask.  Imagine the following override context schema for electricity pricing: 

```
 [Country, State, County, City] //0,1,2,3
```

Now, you might have a default price globally of $0.20 / kWh.  

```javascript
{
  $type: 'electricity',
  $kwhRate: 0.2,
  $ac: true //I will not override this, but it will still be present in all contexts in the example below
}
```

This isn't very useful, though.  You might want to set the US rate to its lower average value of $0.12 / kwh. 

```javascript
{
  $type: 'electricity',
  $override: {
    country: 'US' 
  } //This override has one key and it's at the 0th position, so it has a "sum" of 1
  kwhRate: 0.12
}
```

OK, that's nice, but what about the rate for New York State?  Easy enough, right? 


```javascript
{
  $type: 'electricity',
  $override: {
    country: 'US',
    state: 'NY'
  } //This override has two keys and at the 0th and 1st element, so it has a "sum" of 3
  kwhRate: 0.19
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
  * You can make this faster by providing an optional `$hash` field in your context object, but DFG will create one for you if you don't provide it.
1. Secondary Cache
  * This is a bit tricker, but imagine our electricity example above-- we have only defined a few unique overrides, but the application will create a huge number of unique context objects as it goes about its business.  For example, if your application has need of the kwhRate for Albany, NY, you know that it's just going to get the state-level override.  DFG will still have to confirm that by searching for matches on its context object, but once it is done and the matches it has found are the same as the ones it previously used for New York, NY the secondary cache comes into play.  Now, these two context objects, each with a distinct `$hash` will share the same config object.
  * This is an OK save in terms of CPU (don't have to override when this cache is hit), but it's a huge memory savings since it prevents the creation of many, many redundant config objects.

#### Best Practices

You should cache your context search key on some unique business object and provide a `$hash` to DFG, but you should not save copies of the config value because this will prevent on the fly config changes.  For example, if you change the value for NY to $0.20 / kWh, and then DFG is told to clear its caches, the next time you ask for NY's rate, you'll get the new value.  If you cache the configset in your application, you won't know about the change.
