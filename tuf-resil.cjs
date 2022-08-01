const slep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const to = (p) => p.then(data => [null, data]).catch(err => [err, null]);

module.exports = (props) => {
    props = {retries: 3, backoff: 1000, rate: 0, failThreshold: 10, successThreshold: 3, breakerTimeout: 10000, backoffFunction : (delay,initial,attempt) => delay+initial, retryBreaker: false, circuitBreaker: true, ...props}
    let [breakerState, successes, failures, nextAttempt, lastCall] = [2,0,0,Date.now(),0];
    return (asyncErrorHandler, asyncFallback, asyncFunction) => async (...params) => {
        let [tries, delay] = [props.retries, 0];
        while(tries-->-1){
            if(props.circuitBreaker && breakerState===0 && Date.now() > nextAttempt) breakerState=1;
            if(props.circuitBreaker && breakerState===0) {
                if(asyncErrorHandler) await asyncErrorHandler({error: new Error('Breaker Closed'), circuitBreaker: props.circuitBreaker, breakerState, failures, successes, tries: props.retries-tries, props});
                if(props.retryBreaker) await slep(delay = props.backoffFunction(delay,props.backoff,(props.retries-tries)));
                else return asyncFallback ? await asyncFallback(...params) : null;
            }else{
                if(props.rate>0){
                    const rate = lastCall ? Date.now() - lastCall : props.rate;
                    lastCall = Date.now() + (rate < props.rate ? props.rate - rate : 0);
                    if(rate < props.rate ) await slep(props.rate - rate);
                }
                let [err, res] = await to(asyncFunction(...params));
                if(res || err===null) {
                    if(props.circuitBreaker && breakerState===1 && ++successes >= props.successThreshold){
                        successes=failures=0;
                        breakerState=2;
                    }
                    return res;
                }
                if(props.circuitBreaker && ++failures >= props.failThreshold) {
                    successes=breakerState=0;
                    nextAttempt = Date.now() + props.breakerTimeout;
                }
                if(asyncErrorHandler) await asyncErrorHandler({error: err, circuitBreaker: props.circuitBreaker, breakerState, failures, successes, tries: props.retries-tries, props});
                if(props.backoffFunction) await slep(delay = props.backoffFunction(delay,props.backoff,(props.retries-tries)));
            }
        }
        if(asyncErrorHandler) await asyncErrorHandler({error: new Error('Out of retries'), circuitBreaker: props.circuitBreaker, breakerState, failures, successes, tries: props.retries-tries, props});
        return asyncFallback ? await asyncFallback(...params) : null;
    }
};