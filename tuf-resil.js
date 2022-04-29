const slep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const to = (p) => p.then(data => [null, data]).catch(err => [err, null]);

export default (props) => {
    let [breakerState, successes, failures, nextAttempt, lastCall] = [2,0,0,Date.now(),0];
    const backoffFunction = props.backoffFunction ? props.backoffFunction : (delay,initial,attempt) => delay+initial;
    return (asyncFunction, asyncFallback, asyncErrorHandler) => async (...params) => {
        let [tries, delay] = [props.retries, 0];
        while(tries-->=0){
            if(breakerState===0) {
                if(Date.now() > nextAttempt) breakerState=1;
                else break;
            }
            const rate = lastCall ? Date.now() - lastCall : props.rate;
            lastCall = Date.now() + (rate < props.rate ? props.rate - rate : 0);
            if(rate < props.rate ) await slep(props.rate - rate);
            let [err, res] = await to(asyncFunction(...params));
            if(res || err===null) {
                if(breakerState===1 && successes++ >= props.successThreshold){
                    successes=0;
                    breakerState=2;
                }
                failures=0;
                return res;
            }
            failures++;
            if(failures >= props.failThreshold) {
                successes=breakerState=0;
                nextAttempt = Date.now() + props.breakerTimeout;
            }
            if(asyncErrorHandler) await asyncErrorHandler({error: err, breakerState, failures, successes, tries, props});
            await slep(delay = backoffFunction(delay,props.backoff,(props.retries-tries)));
        }
        return asyncFallback? await asyncFallback(...params) : null;
    }
}
