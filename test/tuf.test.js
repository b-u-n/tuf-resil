import chai, { expect } from 'chai';
import Tuf from '../tuf-resil.js';
import axios from 'axios';

import { fork } from 'child_process';

const tuf = Tuf({
    retries: 5,
    backoff: 1000,
    backoffFunction: (delay, initial, attempt) => delay+initial,
    rate: 0,
    failThreshold: 20,
    successThreshold: 2,
    breakerTimeout: 100
});
//this config is designed to pass unit test with 50% failure rate from server

const lwg = async (...v) => console.log(...v);

let tufErr=0;

const err = async (e) => {
    console.log(e?.error?.message, e?.breakerState, e?.failures);
    tufErr++;
}
const post = tuf(err, console.log, axios.post);

const get = tuf(err,
    async (url) => {
        return {data: 'Not actually a success tho'};
    },
    axios.get);

const slep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const child = fork('./test-server/testServer.js');


describe('tuf axios vs pure axios performance comparison', () => {
    const numToTest=10000;
    const url = 'http://localhost:30001';//'https://www.google.com';
    const threshold=BigInt(10*1000000);
    it(`should successfully query ${url} ${numToTest} times with a performance difference for attempts without retry of < ${threshold} ns`, async () => {
        await slep(2000);

        let timings=[];
        let tufSum=BigInt(0),axSum=BigInt(0),tufFail=BigInt(0),axFail=BigInt(0);

        for(let i=0;i<numToTest;i++){

            const cache = await axios.get(url);//if we don't cache the call, the first result will have a different timing

            if(Math.floor(10000*i/numToTest)%1000==0) console.log(Math.floor((i/numToTest)*100),'%');

            const start = process.hrtime.bigint();
            tufErr=0;
            const res = await get(url);
            if(res?.status!==200) tufFail++;
            const next = process.hrtime.bigint();
            let res2;
            try{
                res2 = await axios.get(url);
                if(res2?.status!==200) axFail++;
            }catch(e){
                axFail++;
            };
            const end = process.hrtime.bigint();
            const t = {tuf: {timing: next-start, success: res?.status}, axios: {timing: end-next, success: res2?.status}};
            timings.push(t);
            if(res2?.status===200 && tufErr===0 && res?.status===200){
                tufSum+=t.tuf.timing;
                axSum+=t.axios.timing;
            }
        }
        console.log('count',timings.length);
        console.log('avg ns difference',(tufSum-axSum)/BigInt(numToTest));
        console.log('tuf fails',Number(tufFail), 'axios fails', Number(axFail));
        expect(Math.abs(Number(tufSum-axSum))/numToTest).to.be.lessThan(Number(threshold));
        expect(Number(tufFail-axFail)).to.be.lessThan(1);
        

    }).timeout(6000000);

    after( () => {
        child.kill();
    });
});
