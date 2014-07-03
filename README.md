# Do it with Configs!

I work with configurations a lot in applications I've built, and I find that the way most people do configurations don't fit what I'm trying to accomplish.  I have built this config system in a less formal way in a few applications, but I decided to make it a public project to benefit from a community if there is one for this type of work. 

I want a config system that works like a programming language.  In fact, even as inheritance has lost some of its lustor in the programming community, I think it is a great way to think about configurations.  Usually, your application has a set of default configurations that you might tune to be well balanced for most uses, but people request different values to suit their workflows.  You don't want to copy the entire configset for that user if they just want to change a single configurable variable because you would then lose the ability to change other values in a simple and productive way.  Also, you need to know the exact context for which a configuration should change.  Should it be for all uses of the application for a given user or should it be only when they access it via a particular connection?  This seems overly nuanced to many who build large scalable systems, but when you are offering your customers a high level of customer service (usually for a concentrated customer set), this precision becomes valuable.  

## Goals

1. Allow for granular overriding of configurable values
1. Allow for precise context on when a configuration "fragment" should be used
1. Allow configuration overrides to be minimally declared

## Example

** Base config **

```
{ 
  $type: 'coffeeMachine',
  startTime: '09:45:00',
  numCups: 4,
  maxTemp: 65
}
```

** Override Fragment **

Notice, I'm not going to override the "isWeekend" field, but I could.
```
{ 
  $type: 'coffeeMachine',
  $override: {
    clientId: 'ben'
  }
  maxTemp: 75
}
```

** Override Scheme **

The order matters.  The overriding algorithm will give clientId a value of 1 (2^0) and isWeekend a value of 2 (2^1).  It will then start at the defaults and override fragments with increasing values. So, if you had a fragment with just clientId and another with just isWeekend, it would override isWeekend first then clientId giving clientId the last say unless you had a config fragment with both clientId AND isWeekend, which would get a value of 2^0 + 2^1 = 3.  The value of this gets more obvious when you have many different contexts for overriding a value.

```
var dfg = require('dfg');
dfg.addOverrideScheme('coffeeMachine',[
  {isWeekend: function() { 
    return this.isWeekend();
  }},
  {clientId: function() {
    return this.getUserName();
  }}
]);
```

** Usage **

```
var defaults = dfg('coffeeMachine');
console.dir(defaults);
// { $type: 'coffeeMachine', startTime: '09:45:00', numCups: 4, maxTemp: 65 }
var userLevel = dfg('coffeeMachine',context); 
// { $type: 'coffeeMachine', $override: {clientId: 'ben',isWeekend:false}, startTime: '09:45:00', numCups: 4, maxTemp: 75 }
```
