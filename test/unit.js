"use strict";

process.on('unhandledRejection', (up) => { throw up; });
process.env.TEST_MODE = '1';

async function seq(array) {
    for (let el of array) {
        console.log(`Running tests for ${el}`);
        await require(el)();
    }
}

seq([
]);
