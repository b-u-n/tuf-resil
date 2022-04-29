# TUF-resil
Functional ES6 Resiliency: Circuit Breaker, Fallback, Retry, Backoff, Rate Limiting

## Introduction

The node library I found to handle resilience at the functional level is some 3,000 lines of code with an arcane interface: [Cockatiel](https://npm.io/package/cockatiel). There are cleaner libraries, but they only wrap HTTP requests, not functions.

I think it's time for a better library, so here is my whopping 37 lines of code. :)

## Overview

**Circuit Breaker**

The circuit breaker will trip for *breakerTimeout* ms after *failThreshold* consecutive failures. During the timeout period, all calls will be redirected to the fallback function. After the timeout period, *successThreshold* consecutive successful calls are required to reset the failure count to zero and prevent a single failure from retriggering the circuit breaker.

**Fallback**

A fallback function should be provided, to be used in the event that the circuit breaker trips or a successful execution does not occur before retries for a function execution run out. The fallback function should take the same arguments as the primary function.

**Retry with Backoff**

Automatic retry with a backoff function.

**Rate Limiting**

Optional rate limiting within a TUF instance.

*Request bulkhead if required*

## Installation

coming soon!

## Usage


`import TUF from 'tuf-resil';`

First, define a TUF instance that we'll use to wrap a resource (for example, an axios connection to localhost).

```
const axiosLocalhostTUFInstance = TUF({
    retries: 3,
    backoff: 1000,
    backoffFunction: (delay, initial, attempt) => delay+initial,
    rate: 0,
    failThreshold: 10,
    successThreshold: 3,
    breakerTimeout: 10000
});
```

### Options (most required):

  - **retries** Number of retry attempts.
  - **backoff** A backoff value in ms, to be passed to the backoff function.
  - **backoffFunction?** Takes the current execution's delay (initially 0),
    the backoff value, and an attempt number as input.
    Returns a new delay. Optional. Default function is provided here.
  - **rate** Rate limiting for this resource in minumum ms delay between requests. 0 for none.
  - **failThreshold** Circuit breaker failure count threshold.
  - **successThreshold** Circuit breaker success count threshold.
  - **breakerTimeout** Duration to leave circuit breaker off after it's triggered (in ms).
  
After you create your TUF instance, you will need to pass it an error handler, fallback, and initial function.

It will return a TUF version of your initial function, bound to that TUF instance. :)

Circuit breaking and rate limiting are applied at the TUF instance level.

The format is:

`const myFunctionTUF = axiosLocalhostTUF(errorHandlerAsync, fallbackFunctionAsync, initialFunctionAsync);`

Arguments are ordered to promote currying.

Your fallback should expect the same input as your primary function.

The error handler will receive the following object to assist in analyzing failure states:

`{error, breakerState, failures, successes, tries, props}`

Example

```
const getAxiosLocalhostTUF = axiosLocalhostTUFInstance(async (err) => console.error(err?.error),
    async (url) => {data: 'data from another source or cache'},
    axios.get);
    
const postAxiosLocalhostTUF = axiosLocalhostTUFInstance(async (err) => console.error(err?.error),
    async (url, data) => {data: 'we probably shouldn't pretend post worked!'},
    axios.post);
```

Finally, call your function as if it were the one you wrapped. It will be retried, rate limited, switch to fallback, and activate the circuit breaker as necessary. Any errors along the way will be passed to the error handling function. :)

```
const res = await getAxiosLocalhostTUF('http://localhost:3000/');
if(res) console.log(res);
```

If a fallback is not provided, the returned value will be "null". One might consider wrapping the fallback in a separate TUF. ^-^

And there you are, you're resilient!

```
const axiosLocalhostTUFInstance = TUF({
    retries: 3,
    backoff: 1000,
    backoffFunction: (delay, initial, attempt) => delay+initial,
    rate: 1000,
    failThreshold: 10,
    successThreshold: 3,
    breakerTimeout: 10000
});

//separate TUF instance for the fallback, to handle retries, backoff, rate limiting.
const axiosLocalhostFallbackTUF = TUF({
    retries: 3,
    backoff: 1000,
    backoffFunction: (delay, initial, attempt) => delay+initial,
    rate: 1000,
    failThreshold: 10,
    successThreshold: 3,
    breakerTimeout: 10000
});

const getFakeDataTUF = axiosLocalhostFallbackTUF(async (err) => console.log(err),
    null,
    async (url) => {data: 'data from another source or cache'});

const getAxiosLocalhostTUF = axiosLocalhostTUFInstance(async (err) => console.error(err?.error)
    getFakeDataTUF,
    axios.get);
    
const res = await getAxiosLocalhostTUF('http://localhost:3000/');
if(res) console.log(res);
```
