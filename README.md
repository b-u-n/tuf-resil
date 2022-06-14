# TUF-resil
Functional ES6 Resiliency: Circuit Breaker, Fallback, Retry, Backoff, Rate Limiting

## Introduction

Simple, full-featured functional resiliency in 37 lines of code. :)

## tl;dr

```
import TUF from 'tuf-resil';

const axiosGetLocalhost = TUF()(async (err) => console.log(err),
					null || (async(url) => {data: 'data from fallback source'}),
					axios.get);

const res = await axiosGetLocalhost('http://localhost:3000/');
if(res) console.log(res);
```

## Overview


**Fallback**

A fallback function should be provided, to be used in the event that the circuit breaker trips or a successful execution does not occur before retries for a function execution run out. The fallback function should take the same arguments as the primary function.

**Retry with Backoff**

Automatic retry with a backoff function.

**Rate Limiting**

Optional rate limiting within a TUF instance.

**Circuit Breaker**

The circuit breaker will trip for **breakerTimeout** ms after **failThreshold** consecutive failures. During the timeout period, all calls will be redirected to the fallback function. After the timeout period, **successThreshold** consecutive successful calls are required to reset the failure count to zero and prevent a single failure from retriggering the circuit breaker.

**Timeout**

To do.

*Request bulkhead if required*


## Usage


`import TUF from './tuf-resil.js';`

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

### Options

  - **retries** Number of retry attempts.
  - **backoff** A backoff value in ms, to be passed to the backoff function.
  - **backoffFunction** Takes the current execution's delay (initially 0),
    the backoff value, and an attempt number as input.
    Returns a new delay. If not provided, will use default function. Set to **null** to disable backoff.
  - **rate** Rate limiting for this resource in minumum ms delay between requests. 0 for none.
  - **failThreshold** Circuit breaker failure count threshold.
  - **successThreshold** Circuit breaker success count threshold.
  - **breakerTimeout** Duration to leave circuit breaker off after it's triggered (in ms).
  
After you create your TUF instance, you will need to pass it an error handler, fallback, and initial function. It will return a TUF instance wrapping your initial function.

`const myFunctionTUF = axiosLocalhostTUF(errorHandlerAsync, fallbackFunctionAsync, initialFunctionAsync);`

The error handler will receive the following object to assist in analyzing failure states:

`{error, breakerState, failures, successes, tries, props}`


### Example

```
import TUF from 'tuf-resil';

const axiosLocalhostTUFInstance = TUF({
    retries: 3,
    backoff: 1000,
    backoffFunction: (delay, initial, attempt) => delay+initial,
    rate: 0,
    failThreshold: 10,
    successThreshold: 3,
    breakerTimeout: 10000
});

const getAxiosLocalhostTUF = axiosLocalhostTUFInstance(async (err) => console.error(err?.error),
    async (url) => {data: 'data from another source or cache'},
    axios.get);
	
const res = await getAxiosLocalhostTUF('http://localhost:3000/');
if(res) console.log(res);
```

Call your function as if it were the one you wrapped. It will be retried, rate limited, switch to fallback, and activate the circuit breaker as necessary. Any errors along the way will be passed to the error handling function, which is absolutely required. :)

If a fallback is not provided, the returned value will be **null** on main function failure. One might consider wrapping the fallback in a separate TUF. ^-^

And there you are, you're resilient!
