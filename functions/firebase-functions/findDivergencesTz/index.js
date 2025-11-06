/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const moment = require('moment-timezone');

const serviceAccount = require('./service-account.json');
const isEmulator = true;
const EMULATOR_DB_HOST = 'localhost';
const EMULATOR_DB_PORT = 9001;

// Initialize Admin SDK
if (!admin.apps.length) {
// Initialize Admin SDK
admin.initializeApp({
    projectId: 'tradingproject25',
    //credential: admin.credential.cert(serviceAccount),
    storageBucket: "tradingproject25.appspot.com",
    databaseURL: isEmulator
        ? `http://${EMULATOR_DB_HOST}:${EMULATOR_DB_PORT}?ns=tradingproject25-f513b`
        : `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`
});
}

//var bucket = admin.storage().bucket();


let app = admin.app();
let polyData = functions.database.instance('tradingproject25-f513b-e8221tickerstz-e8221');
let polyDbRef = app.database(
    isEmulator
        ? `http://${EMULATOR_DB_HOST}:${EMULATOR_DB_PORT}?ns=tradingproject25-f513b-e8221tracking-e8221`
        : 'https://tradingproject25-f513b-e8221tracking-e8221.firebaseio.com'
);

exports.findDivergencesTz = polyData.ref('1m/{stockId}/{stockDay}').onWrite(checkSpikeV2)

// function checkSpikeV2x(event, context) {
//     console.log('cool !')
// }

function checkSpikeV2(event, context) {
    if (event.after._data != null) {
        findSpikesV2(event.after._data, context.params.stockId, "one/")
        return false
    }
    return false
}

async function findSpikesV2(event, xcontext, xsize) {
    let context = {}
    let xdata = null;
    xsize = "one/"
    var d = new Date()

    var n = moment(d).format('YYYY-MM-DD')
    var n2 = moment(d).format('MM-DD')
    
    let multiplier = 1;

    if (xsize == "one/") {
        context.params = {
            stockId: xcontext
        }
        xdata = event;
    } else {
        multiplier = 15
        context.params = {
            stockId: event.ref.key
        }

        xdata = event.val();

    }

    if (xdata != null) {
        let previousTotalRange = 0;

        let totalrange = 0;
        let highestHigh = 0;
        let lowestLow = 100000000000
        let holdLow = [];
        let holdHigh = [];

        let avgVol = [];

        let xcount = 45;
        let xA = 0;

        let trendAlgo = 0;
        let trendPrice = 0;
        let priceDir = [];
        let algoDir = [];
        let algoValue = [];

        let trendAlgo5 = 0;
        let trendPrice5 = 0;
        let priceDir5 = [];
        let algoDir5 = [];

        let trendAlgo30 = 0;
        let trendPrice30 = 0;

        let priceDir30 = [];
        let algoDir30 = [];


        let priceDir60 = [];
        let algoDir60 = [];


        let staggered = [];

        let lastfound10 = -60;
        let lastfound30 = -60;


        let posted = false
        let topminute = 0

        for (let bb in xdata) {
            topminute = bb;
        }

        let MO = 0;
        let firstC = 0;

        for (let bb in xdata) {
            posted = false;
            if (xdata[bb].H < 40) {
                continue;
            }

            if (xdata[bb].O != 0 && MO == 0) {
                MO = parseFloat(xdata[bb].O)
                if (bb == topminute) {
                    polyDbRef.ref("MO/" + context.params.stockId).set(MO);
                }
            }


            if (MO != 0) {
                if (parseInt(topminute) == parseInt(bb)) {
                    if (parseFloat(xdata[bb].O) > parseFloat(MO) * 1.05) {
                        // console.log('GOT Gainers')
                        polyDbRef.ref(n + "/" + xsize + 'gainers/' + context.params.stockId).set({
                            MO: MO,
                            T: bb,
                            C: xdata[bb].C
                        });

                    }
                    if (parseFloat(xdata[bb].O) < parseFloat(MO) * .95) {
                        // console.log('GOT Losers')
                        polyDbRef.ref(n + "/" + xsize + 'losers/' + context.params.stockId).set({
                            MO: MO,
                            T: bb,
                            C: xdata[bb].C
                        });
                    }

                }
            }
            xcount = xcount + 1



            //=================================================================================================
            //This Section Processes the 10 minute Divergence
            if (xcount > 15) {
                trendAlgo = 0;
                for (let xx in algoDir) {
                    trendAlgo = trendAlgo + algoDir[xx];
                }
                trendPrice = 0;
                for (let xx in priceDir) {
                    trendPrice = trendPrice + priceDir[xx];
                }
                if (lastfound10 + 5 < xcount) {
                    if (xA > 10000 * multiplier) {
                        if (trendAlgo > 7 && trendPrice < -6) {
                            lastfound10 = xcount;
                            // console.log('Got Divergence 10 minutes DOWN')
                            if (isTruely15Down(xdata, bb)) {
                                if (parseInt(topminute) == parseInt(bb)) {
                                    polyDbRef.ref(n + "/" + xsize + 'divergencePriceDown/15/' + context.params.stockId + "/" + bb).set(true);
                                    polyDbRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + '/PriceDown/15/' + bb).set(true);

                                    let kelts = calcKeltData(xdata)
                                    kelts.c = xdata[bb].L;
                                    kelts.s = context.params.stockId;
                                    kelts.t = bb

                                    kelts.tA5 = trendAlgo5
                                    kelts.tP5 = trendPrice5

                                    kelts.tA15 = trendAlgo
                                    kelts.tP15 = trendPrice

                                    kelts.tA30 = trendAlgo30
                                    kelts.tP30 = trendPrice30
                                    polyDbRef.ref(n + "/" + xsize + 'latest/priceDown/15').push(kelts);
                                }
                            }
                        }

                        if (trendAlgo < -7 && trendPrice > 6) {
                            lastfound10 = xcount;
                            if (parseInt(topminute) == parseInt(bb)) {
                                // console.log('Got Divergence 10 minutes UP')
                                if (isTruely15Up(xdata, bb)) {
                                    polyDbRef.ref(n + "/" + xsize + 'divergencePriceUp/15/' + context.params.stockId + "/" + bb).set(true);
                                    polyDbRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + '/PriceUp/15/' + bb).set(true);

                                    let kelts = calcKeltData(xdata)
                                    kelts.c = xdata[bb].L;
                                    kelts.s = context.params.stockId;
                                    kelts.t = bb

                                    kelts.tA5 = trendAlgo5
                                    kelts.tP5 = trendPrice5

                                    kelts.tA15 = trendAlgo
                                    kelts.tP15 = trendPrice

                                    kelts.tA30 = trendAlgo30
                                    kelts.tP30 = trendPrice30
                                    polyDbRef.ref(n + "/" + xsize + 'latest/priceUp/15').push(kelts);
                                }
                            }
                        }
                    }
                }
            }

            if (xcount > 30) {
                trendAlgo30 = 0;
                for (let xx in algoDir30) {
                    trendAlgo30 = trendAlgo30 + algoDir30[xx];
                }
                trendPrice30 = 0;
                for (let xx in priceDir30) {
                    trendPrice30 = trendPrice30 + priceDir30[xx];
                }
                if (xA > 10000 * multiplier) {
                    if (lastfound30 + 10 < xcount) {
                        if (trendAlgo30 > 10 && trendPrice30 < -8) {
                            // console.log('Got Divergence 30 minutes DOWN')
                            if (isTruely30Down(xdata, bb)) {
                                lastfound30 = xcount;
                                if (parseInt(topminute) == parseInt(bb)) {
                                    polyDbRef.ref(n + "/" + xsize + 'divergencePriceDown/30/' + context.params.stockId + "/" + bb).set(true);
                                    polyDbRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + '/PriceDown/30/' + bb).set(true);
                                    let kelts = calcKeltData(xdata)
                                    kelts.c = xdata[bb].L;
                                    kelts.s = context.params.stockId;
                                    kelts.t = bb

                                    kelts.tA5 = trendAlgo5
                                    kelts.tP5 = trendPrice5

                                    kelts.tA15 = trendAlgo
                                    kelts.tP15 = trendPrice

                                    kelts.tA30 = trendAlgo30
                                    kelts.tP30 = trendPrice30
                                    polyDbRef.ref(n + "/" + xsize + 'latest/priceDown/30').push(kelts);
                                }
                            }
                        }

                        if (trendAlgo30 < -10 && trendPrice30 > 8) {
                            // console.log('Got Divergence 30 minutes UP')
                            if (isTruely30Up(xdata, bb)) {
                                lastfound30 = xcount;
                                if (parseInt(topminute) == parseInt(bb)) {
                                    polyDbRef.ref(n + "/" + xsize + 'divergencePriceUp/30/' + context.params.stockId + "/" + bb).set(true);
                                    polyDbRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + '/PriceUp/30/' + bb).set(true);
                                    let kelts = calcKeltData(xdata)
                                    kelts.c = xdata[bb].L;
                                    kelts.s = context.params.stockId;
                                    kelts.t = bb

                                    kelts.tA5 = trendAlgo5
                                    kelts.tP5 = trendPrice5

                                    kelts.tA15 = trendAlgo
                                    kelts.tP15 = trendPrice

                                    kelts.tA30 = trendAlgo30
                                    kelts.tP30 = trendPrice30

                                    polyDbRef.ref(n + "/" + xsize + 'latest/priceUp/30').push(kelts);
                                }
                            }
                        }
                    }
                }
            }

            if (posted == false) {
                if (xdata[bb].C > xdata[bb].O) {
                    priceDir.push(1)
                    priceDir5.push(1)
                    priceDir30.push(1)
                    priceDir60.push(1)

                } else {
                    priceDir.push(-1)
                    priceDir5.push(-1)
                    priceDir30.push(-1)
                    priceDir60.push(-1)
                }

                if (holdLow.length > 30) {
                    let newHigh = [];
                    let newLow = []
                    let newAlgo = [];

                    let bcount = 0;
                    for (let bx in holdLow) {
                        bcount = bcount + 1

                        if (bcount > 1) {
                            newHigh.push(holdHigh[bx]);
                            newLow.push(holdLow[bx]);
                        }
                    }

                    holdLow = newLow;
                    holdHigh = newHigh;
                }

                if (priceDir.length > 15) {
                    let newPriceDir = [];
                    let bcount = 0;
                    for (let bx in priceDir) {
                        bcount = bcount + 1
                        if (bcount > 1) {
                            newPriceDir.push(priceDir[bx])
                        }
                    }
                    priceDir = newPriceDir;
                }


                if (avgVol.length > 15) {
                    let newPriceDir = [];
                    let bcount = 0;
                    for (let bx in avgVol) {
                        bcount = bcount + 1
                        if (bcount > 1) {
                            newPriceDir.push(avgVol[bx])
                        }
                    }
                    avgVol = newPriceDir;
                }

                if (priceDir5.length > 5) {
                    let newPriceDir = [];
                    let bcount = 0;
                    for (let bx in priceDir5) {
                        bcount = bcount + 1
                        if (bcount > 1) {
                            newPriceDir.push(priceDir5[bx])
                        }
                    }
                    priceDir5 = newPriceDir;
                }

                if (priceDir30.length > 30) {
                    let newPriceDir = [];
                    let bcount = 0;
                    for (let bx in priceDir30) {
                        bcount = bcount + 1
                        if (bcount > 1) {
                            newPriceDir.push(priceDir30[bx])
                        }
                    }

                    priceDir30 = newPriceDir;
                }

                if (priceDir60.length > 60) {
                    let newPriceDir = [];
                    let bcount = 0;
                    for (let bx in priceDir60) {
                        bcount = bcount + 1
                        if (bcount > 1) {
                            newPriceDir.push(priceDir60[bx])
                        }
                    }
                    priceDir60 = newPriceDir;
                }

                highestHigh = 0;
                lowestLow = 100000000000

                for (let bm in holdHigh) {
                    if (holdHigh[bm] > highestHigh) {
                        highestHigh = holdHigh[bm]
                    }
                    if (holdLow[bm] < lowestLow) {
                        lowestLow = holdLow[bm]
                    }
                }

                previousTotalRange = totalrange;
                totalrange = highestHigh - lowestLow;

                holdHigh.push(xdata[bb].H)
                holdLow.push(xdata[bb].L)

                if (xA > 5000 * multiplier) {
                    if (parseFloat(xdata[bb].H) > (highestHigh + (totalrange / 2))) {
                        //This is a spike UPWARD of more than 50% of the range of the last 20 bars
                        // console.log('Found Price Spike UP' + moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))
                        if (parseInt(topminute) == parseInt(bb)) {
                            //  if (xdata[bb].V > 25000) {
                            //if(topminute==bb) {
                            // trackingRef.ref(n + "/" + xsize + 'spikeUp/' + context.params.stockId + "/" + bb).set({
                            //     a: trendAlgo,
                            //     h: highestHigh,
                            //     t: totalrange,

                            //     p: trendPrice,
                            //     v: xdata[bb].V
                            // });
                            // trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/SpikeUp/" + bb).set({
                            //     a: trendAlgo,
                            //     p: trendPrice,
                            //     t: totalrange,
                            //     h: highestHigh,
                            //     v: xdata[bb].V
                            // });
                        }
                        //}
                        posted = true;
                        // }
                    }
                    if (parseFloat(xdata[bb].L) < (lowestLow - (totalrange / 2))) {
                        //     console.log('Found Price Spike DOWN' + moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))
                        if (parseInt(topminute) == parseInt(bb)) {

                            //This is a spike DOWNWARD of more than 200% of the range of the last 20 bars
                            // console.log('Found Spike')
                            //  if (xdata[bb].V > 25000) {
                            //if(topminute==bb) {
                            // trackingRef.ref(n + "/" + xsize + 'spikeDown/' + context.params.stockId + "/" + bb).set({
                            //     a: trendAlgo,
                            //     t: totalrange,
                            //     l: lowestLow,
                            //     p: trendPrice,
                            //     v: xdata[bb].V
                            // });
                            // trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/SpikeDown/" + bb).set({
                            //     a: trendAlgo,
                            //     p: trendPrice,
                            //     l: lowestLow,
                            //     t: totalrange,
                            //     v: xdata[bb].V
                            // });

                            //}
                            posted = true
                        }
                        // }

                    }

                }




                let xvalue = xdata[bb].U - xdata[bb].D


                let xamount = 0
                for (let bx = 0; bx < staggered.length; bx++) {
                    xamount = staggered[bx] + xamount
                }

                xamount = xamount / staggered.length;

                let existingPattern = staggered;

                if (staggered.length == 10) {
                    // //////////console.log('found length past 10.');
                    let newStaggered = []

                    for (let bx = 1; bx < 10; bx++) {
                        newStaggered.push(staggered[bx])
                    }
                    newStaggered.push(xvalue)

                    staggered = newStaggered
                } else {
                    staggered.push(xvalue)
                }


                xamount = 0
                for (let bx = 0; bx < staggered.length; bx++) {
                    xamount = staggered[bx] + xamount
                }

                xamount = xamount / staggered.length;


                algoValue.push(xamount);
                if (xA > 5000 * multiplier) {


                    if ((isAlgoSpike('U', existingPattern, xvalue)) && xcount > 15) {


                        // console.log('FOnd Algo Up'+ moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))
                        if (parseInt(topminute) == parseInt(bb)) {

                            // let kelts = calcKeltData(xdata)
                            // kelts.c = xdata[bb].L;
                            // kelts.a = trendAlgo;
                            // kelts.p = trendPrice;
                            // kelts.v = xdata[bb].V;
                            // kelts.xamount = xamount
                            // kelts.t = bb

                            // trackingRef.ref(n + "/" + xsize + 'algoSpikeUp/' + context.params.stockId + "/" + bb).set(kelts);
                            // trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/algoSpikeUp/" + bb).set(kelts);

                            // kelts.s = context.params.stockId

                            // trackingRef.ref(n + "/" + xsize + 'latest/algoSpikeUp').push(kelts);
                            //}
                            posted = true;
                            // }
                        }

                    }
                    if ((isAlgoSpike('D', existingPattern, xvalue)) && xcount > 15) {
                        //    console.log('FOnd Algo DOWn'+ moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))

                        if (parseInt(topminute) == parseInt(bb)) {
                            // let kelts = calcKeltData(xdata)
                            // kelts.c = xdata[bb].L;
                            // kelts.a = trendAlgo;
                            // kelts.p = trendPrice;
                            // kelts.v = xdata[bb].V;
                            // kelts.xamount = xamount
                            // kelts.t = bb
                            // trackingRef.ref(n + "/" + xsize + 'algoSpikeDown/' + context.params.stockId + "/" + bb).set(kelts);
                            // trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/algoSpikeDown/" + bb).set(kelts);
                            // kelts.s = context.params.stockId

                            // trackingRef.ref(n + "/" + xsize + 'latest/algoSpikeDown').push(kelts);

                            posted = true
                            // }
                        }
                    }
                }



                avgVol.push(xdata[bb].V)
                //console.log(xA)
                xA = 0;
                for (let bx = 0; bx < avgVol.length; bx++) {
                    xA = avgVol[bx] + xA
                }
                xA = xA / avgVol.length;

                if (xamount > 0) {
                    algoDir.push(1)
                    algoDir5.push(1)
                    algoDir30.push(1)
                    algoDir60.push(1)

                } else {
                    algoDir.push(-1)
                    algoDir5.push(-1)
                    algoDir30.push(-1)
                    algoDir60.push(-1)

                }


                //  //console.log(priceDir)

                if (algoDir.length > 15) {

                    let newAlgoDir = [];
                    let bcount = 0;
                    for (let bx in algoDir) {

                        bcount = bcount + 1

                        if (bcount > 1) {

                            newAlgoDir.push(algoDir[bx])

                        }
                    }


                    algoDir = newAlgoDir;
                }


                //                //console.log(algoDir)


                if (algoDir5.length > 5) {

                    let newAlgoDir = [];
                    let bcount = 0;
                    for (let bx in algoDir5) {

                        bcount = bcount + 1

                        if (bcount > 1) {

                            newAlgoDir.push(algoDir5[bx])

                        }
                    }


                    algoDir5 = newAlgoDir;
                }


                if (algoDir30.length > 30) {

                    let newAlgoDir = [];
                    let bcount = 0;
                    for (let bx in algoDir30) {

                        bcount = bcount + 1

                        if (bcount > 1) {

                            newAlgoDir.push(algoDir30[bx])

                        }
                    }


                    algoDir30 = newAlgoDir;
                }


                let xAvg = 0;

                if (algoValue.length > 30) {
                    let newAlgoDir = [];
                    let bcount = 0;
                    for (let bx in algoValue) {

                        if (bx < 30) {
                            xAvg = xAvg + algoValue[bx];
                        }

                        bcount = bcount + 1

                        if (bcount > 1) {

                            newAlgoDir.push(algoValue[bx])

                        }
                    }


                    algoValue = newAlgoDir;
                }




                if (algoDir60.length > 60) {

                    let newAlgoDir = [];
                    let bcount = 0;
                    for (let bx in algoDir60) {

                        bcount = bcount + 1

                        if (bcount > 1) {

                            newAlgoDir.push(algoDir60[bx])

                        }
                    }


                    algoDir60 = newAlgoDir;
                }


                ////console.log(algoValue)

                //You now have the highesthigh and the lowest low.


            }

        }
        //  }
        //console.log("Done Checking -" + context.params.stockId)

    }
    // }
    return false;
}

function isTruely30Up(xdata, bb) {

    //Find the BB

    let adjustedM = parseInt(bb) - (60000 * 31)
    let adjustedB = parseInt(bb) - (60000 * 6)
    let xcount2 = 0;

    let xcount = 0;
    let lowX = 10000000000;

    let topX = -1000
    //Get the atr of -30 through -25 ago

    for (let bx in xdata) {

        if (parseInt(bx) > adjustedM) {

            if (xcount < 5) {
                xcount = xcount + 1

                if (topX < xdata[bx].H) {
                    topX = xdata[bx].H
                }

            }
        }


        if (parseInt(bx) > adjustedB) {
            if (xcount2 < 5) {
                xcount2 = xcount2 + 1
                if (lowX > xdata[bx].L) {
                    lowX = xdata[bx].L
                }
            }
        }


    }

    if (lowX > topX) {
        //The lowest price in the last 5 bars is higher than the top price in the first 5 bars
        console.log('IS TRUELY 30 up' + lowX + " >  " + topX)

        return true

    } else {
        return false

    }


}


function isTruely15Down(xdata, bb) {
    //Find the BB

    let adjustedM = parseInt(bb) - (60000 * 16)
    let adjustedB = parseInt(bb) - (60000 * 3)
    let xcount2 = 0;

    let xcount = 0;
    let lowX = 10000000000

    let topX = -10000000000

    //Get the atr of -30 through -25 ago
    for (let bx in xdata) {

        if (parseInt(bx) > adjustedM) {

            if (xcount < 5) {
                xcount = xcount + 1

                if (topX < xdata[bx].L) {
                    topX = xdata[bx].L
                }

            }
        }


        if (parseInt(bx) > adjustedB) {
            if (xcount2 < 5) {
                xcount2 = xcount2 + 1
                if (lowX > xdata[bx].H) {
                    lowX = xdata[bx].H
                }
            }
        }


    }


    if (lowX < topX) {
        console.log('IS TRUELY 30  DOWN ' + lowX + " >  " + topX)

        //INVERSE:The lowest price in the last 5 bars is higher than the top price in the first 5 bars
        return true

    } else {
        return false

    }

}


function isTruely15Up(xdata, bb) {

    //Find the BB

    let adjustedM = parseInt(bb) - (60000 * 16)
    let adjustedB = parseInt(bb) - (60000 * 3)

    let xcount2 = 0;

    let xcount = 0;
    let lowX = 10000000000

    let topX = -1000

    //Get the atr of -30 through -25 ago
    for (let bx in xdata) {

        if (parseInt(bx) > adjustedM) {

            if (xcount < 5) {
                xcount = xcount + 1

                if (topX < xdata[bx].H) {
                    topX = xdata[bx].H
                }

            }
        }


        if (parseInt(bx) > adjustedB) {
            if (xcount2 < 5) {
                xcount2 = xcount2 + 1
                if (lowX > xdata[bx].L) {
                    lowX = xdata[bx].L
                }
            }
        }


    }




    if (lowX > topX) {
        //The lowest price in the last 5 bars is higher than the top price in the first 5 bars
        console.log('IS TRUELY 30 up' + lowX + " >  " + topX)

        return true

    } else {
        return false

    }


}


function isTruely30Down(xdata, bb) {
    //Find the BB

    let adjustedM = parseInt(bb) - (60000 * 31)
    let adjustedB = parseInt(bb) - (60000 * 6)
    let xcount2 = 0;

    let xcount = 0;
    let lowX = 10000000000

    let topX = -10000000000

    //Get the atr of -30 through -25 ago
    for (let bx in xdata) {

        if (parseInt(bx) > adjustedM) {

            if (xcount < 5) {
                xcount = xcount + 1

                if (topX < xdata[bx].L) {
                    topX = xdata[bx].L
                }

            }
        }


        if (parseInt(bx) > adjustedB) {
            if (xcount2 < 5) {
                xcount2 = xcount2 + 1
                if (lowX > xdata[bx].H) {
                    lowX = xdata[bx].H
                }
            }
        }


    }


    if (lowX < topX) {
        console.log('IS TRUELY 30  DOWN ' + lowX + " >  " + topX)

        //INVERSE:The lowest price in the last 5 bars is higher than the top price in the first 5 bars
        return true

    } else {
        return false

    }

}

function calcKeltData(barData) {

    let keltMidLine = 0
    let keltTop2_1 = 0
    let keltTop2_0 = 0
    let keltTop1_5 = 0
    let keltTop1_2 = 0
    let keltBot2_1 = 0
    let keltBot2_0 = 0
    let keltBot1_5 = 0
    let keltBot1_2 = 0
    let atr20 = 0
    let keltLength = 20
    let closeArray = []

    let trueRange = 0



    let bBars = [];

    for (let bb in barData) {

        bBars.push(barData[bb])


        if (bBars.length > 21) {


            let newPriceDir = [];
            let bcount = 0;
            for (let bx in bBars) {

                bcount = bcount + 1

                if (bcount > 1) {

                    newPriceDir.push(bBars[bx])

                }
            }

            bBars = newPriceDir;


        }


    }




    let found = false
    let newBars = {}

    //fill closeArray
    for (let bb in barData) {
        if (barData[bb].C != 0 && barData[bb].H != 0) {
            closeArray.push(barData[bb].C) //adds to the end of the array

            if (found == false) {
                found = true
            } else {
                newBars[bb] = barData[bb]
            }
        }
    }

    barData = newBars

    let count = 0
    //ATR20 and midline
    for (let bb in barData) { //console.log(bb, would be the time stamp number)
        count = count + 1

        //TR=Max[(H − L),Abs(H − C1),Abs(L − CP1)]
        trueRange = Math.max(
            barData[bb].H - barData[bb].L,
            Math.abs(barData[bb].H - closeArray[count]),
            Math.abs(barData[bb].L - closeArray[count]))

        atr20 = atr20 + trueRange
        keltMidLine = keltMidLine + barData[bb].C

        /*
                    if (count <= keltLength) {
                    }
        */



    }
    //can't be zero but should NOT be zero
    if (keltLength == 0 || count == 0) {
        console.log("it was zero")
        return false
    }
    atr20 = atr20 / Math.min(count, keltLength)
    keltMidLine = keltMidLine / Math.min(count, keltLength)

    keltTop2_1 = keltMidLine + atr20 * 2.1
    keltTop2_0 = keltMidLine + atr20 * 2
    keltTop1_5 = keltMidLine + atr20 * 1.5
    keltTop1_2 = keltMidLine + atr20 * 1.2
    keltBot2_1 = keltMidLine - atr20 * 2.1
    keltBot2_0 = keltMidLine - atr20 * 2.0
    keltBot1_5 = keltMidLine - atr20 * 1.5
    keltBot1_2 = keltMidLine - atr20 * 1.2

    let updatedNode = {}
    updatedNode.atr20 = atr20
    updatedNode.keltMidLine20 = keltMidLine
    updatedNode.keltTop2_1 = keltTop2_1
    updatedNode.keltTop2_0 = keltTop2_0
    updatedNode.keltTop1_5 = keltTop1_5
    updatedNode.keltTop1_2 = keltTop1_2
    updatedNode.keltBot2_1 = keltBot2_1
    updatedNode.keltBot2_0 = keltBot2_0
    updatedNode.keltBot1_5 = keltBot1_5
    updatedNode.keltBot1_2 = keltBot1_2

    // console.log(updatedNode)
    return updatedNode


}

function isAlgoSpike(dir,xavg,xvalue){

    // console.log('Is Algo SPike?')
    // console.log(dir)
    // console.log(xavg)
    // console.log(xvalue)

    //Whast the highest high?

    let xbit=0
    for(let bb in xavg){

        //     console.log(xbit)
        xbit=xbit+Math.abs(xavg[bb])

    }

    xbit=xbit/xavg.length;


    //  console.log('AVG MOVe'+xbit.toString() +"    val:"+xvalue)

    if(dir=='U'&&xvalue>0) {

        if (xvalue >xbit*10) {

            return true

        }

    }
    if(dir=='D'&&xvalue<0) {

        //    console.log('D' + xvalue+"  "+xbit*5)

        if (Math.abs(xvalue) >xbit*10) {

            return true

        }


    }



    return false;




}