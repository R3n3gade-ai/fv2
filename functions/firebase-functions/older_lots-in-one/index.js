/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';


/*
Rick's notes 10-30-20
onWrites
users/{userID}/discordCode - exports.discordCodeReceived
    updates discord name, id, etc.
users/{userID}/rollToken - exports.rollDiscordToken

users/{pushId}/cancelling - exports.cleanupTestUser
    cleans up selenium testing
users/{uid}/cancelling - exports.CancelMyAccount
    need Discord/Stripe/Zoho handled
    finishes up cancelling, then removes.
note: futureCancels are users who cancelled but still have time left
cancelled/uid is the zoho/discord listener in app.js

users/{uid}/dateFirstExtended - exports.adjustStripeTrialEndDate
    does discord, stripe, and firebase
users/{uid}/validating - something with email verification
users/{uid} - exports.updateShortUser
    needs work, used on User page
*/

var zip = new require('node-zip')();


const DiscordOauth2 = require("discord-oauth2");
const oauth = new DiscordOauth2();

const bs = require("black-scholes");
const iv = require("implied-volatility");

const {Parser} = require('json2csv');//need to add with
const os = require('os');
const fs = require('fs');


const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const twilioAccountSid = 'ACb4c5e0a02f33af0fa663924daf49d635';
const twilioApiKey = 'SKb38f17cfd55ff38f3d06ad3057e8392f';
const twilioApiSecret = 'nOhDIAoa1u5NWlbZWgy2jHzATG20IAuM';
const outgoingApplicationSid = 'AP0c6af28001bc79ed73d1fc4e66ca18c3';
const cors = require('cors')({origin: true});
const moment = require('moment-timezone');
const logging = require('@google-cloud/logging');
const path = require('path');
const request = require('request')
let ws = null;
const https = require('https');
const functions = require('firebase-functions');
//let  Midi = require("@tonejs/midi")

const stripetest = require('stripe')('sk_test_HUSxSmGPYk1rv4EwuUyGUWPe00uwQkUzht');
const stripe = require('stripe')('sk_live_ArP4FhURSvp1lJKCBrRYnE3r008GyOqP3U');
//const stripe = require('stripe')(functions.config().stripe.token);

//const currency = functions.config().stripe.currency || 'USD';

const rp = require('request-promise')



// Firebase Setup
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');
admin.initializeApp(
    {
        storageBucket:"tradingproject25.appspot.com",
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.GCLOUD_PROJECT}.firebaseio.com`,
    }
);

//var bucket = admin.storage().bucket();


let app = admin.app();


let aRef = app.database('https://tradingproject25-a.firebaseio.com');
let bcRef = app.database('https://tradingproject25-bc.firebaseio.com');
let deRef = app.database('https://tradingproject25-de.firebaseio.com');


let aeRef = app.database('https://tradingproject-ae.firebaseio.com');
let flRef = app.database('https://tradingproject25-fl.firebaseio.com');
let msRef = app.database('https://tradingproject25-ms.firebaseio.com');
let tzRef = app.database('https://tradingproject25-tz.firebaseio.com');
let livetickae = app.database('https://tradingproject25-livetickae.firebaseio.com');
let livetickfl = app.database('https://tradingproject25-livetickfl.firebaseio.com');
let livetickms = app.database('https://tradingproject25-livetickms.firebaseio.com');
let liveticktz = app.database('https://tradingproject25-liveticktz.firebaseio.com');
let blocks = app.database('https://tradingproject25-blocks.firebaseio.com');
let options = app.database('https://tradingproject25-optionx.firebaseio.com');
let newsRef = app.database('https://tradingproject25-news.firebaseio.com');
let trackingRef = app.database('https://tradingproject25-tracking.firebaseio.com');

let aeSpike = functions.database.instance('tradingproject-ae');
let flSpike = functions.database.instance('tradingproject25-fl');
let msSpike = functions.database.instance('tradingproject25-ms');
let tzSpike = functions.database.instance('tradingproject25-tz');
let trackRef = functions.database.instance('tradingproject25-tracking');


const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';

const sgMail = require('@sendgrid/mail');
const SENDGRID_API_KEY = functions.config().sendgrid.key
sgMail.setApiKey(SENDGRID_API_KEY)

function clearTrack(input) {

    if (input != null) {

        admin.database().ref('currentTrack/' + input.key).remove();
        admin.database().ref('tracks/' + input.val() + "/users").remove();

    }


}

function clearInvite(input) {

    if (input != null) {
        //admin.database().ref('reverseInvites/'+input.key+"/track").remove();
        admin.database().ref('invites/' + input.val() + "/track").remove();
    }


}


exports.findSpikesAE15 = aeSpike.ref('bar15/{stockId}').onWrite(checkSpike15)
exports.findSpikesFL15 = flSpike.ref('bar15/{stockId}').onWrite(checkSpike15)
exports.findSpikesMS15 = msSpike.ref('bar15/{stockId}').onWrite(checkSpike15)
exports.findSpikesTZ15 = tzSpike.ref('bar15/{stockId}').onWrite(checkSpike15)

exports.findSpikesAE = aeSpike.ref('nanex/{stockId}/{stockDay}').onWrite(checkSpike)
exports.findSpikesFL = flSpike.ref('nanex/{stockId}/{stockDay}').onWrite(checkSpike)
exports.findSpikesMS = msSpike.ref('nanex/{stockId}/{stockDay}').onWrite(checkSpike)
exports.findSpikesTZ = tzSpike.ref('nanex/{stockId}/{stockDay}').onWrite(checkSpike)


function got100Records(event,context){


    findSpikes15(event,context,"fifteen/")

}

function checkSpike15(event, context){
    if (event.after._data != null) {
        //for (let bb in testSymbols) {
        //  if (context.params.stockId =="e"+ testSymbols[bb]) {

        aeRef
            .ref(`bar15/` + context.params.stockId   )
            .limitToLast(300)
            .once('value',got100Records)
        return false

        // }
        //   }
    }
    return false
}



function checkSpike(event, context){
    if (event.after._data != null) {
        // console.log('Did Have data...'+context.params.stockId)

//        for (let bb in testSymbols) {
        // if (context.params.stockId == "e" + testSymbols[bb]) {
//console.log('Symbol Matched Test'+testSymbols[bb])
        findSpikes(event.after._data, context.params.stockId, "one/")
        return false

        //  }
        // }
        // }
    }
    return false
}



// exports.findSpikesFL = flSpike.ref('nanex/{stockId}/{stockDay}').onWrite(findSpikes)
// exports.findSpikesMS = msSpike.ref('nanex/{stockId}/{stockDay}').onWrite(findSpikes)
// exports.findSpikesTZ = tzSpike.ref('nanex/{stockId}/{stockDay}').onWrite(findSpikes)






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

        if (parseInt(bx )> adjustedM) {

            if (xcount < 5) {
                xcount = xcount + 1

                if (topX < xdata[bx].H) {
                    topX = xdata[bx].H
                }

            }
        }


        if (parseInt(bx ) > adjustedB) {
            if (xcount2 < 5) {
                xcount2 = xcount2 + 1
                if (lowX > xdata[bx].L) {
                    lowX = xdata[bx].L
                }
            }
        }


    }

    if(lowX>topX){
        //The lowest price in the last 5 bars is higher than the top price in the first 5 bars
        console.log('IS TRUELY 30 up'+ lowX+" >  " +topX)

        return true

    }else{
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


    if(lowX<topX){
        console.log('IS TRUELY 30  DOWN '+ lowX+" >  " +topX)

        //INVERSE:The lowest price in the last 5 bars is higher than the top price in the first 5 bars
        return true

    }else{
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

        if (parseInt(bx )> adjustedM) {

            if (xcount < 5) {
                xcount = xcount + 1

                if (topX < xdata[bx].H) {
                    topX = xdata[bx].H
                }

            }
        }


        if (parseInt(bx ) > adjustedB) {
            if (xcount2 < 5) {
                xcount2 = xcount2 + 1
                if (lowX > xdata[bx].L) {
                    lowX = xdata[bx].L
                }
            }
        }


    }




    if(lowX>topX){
        //The lowest price in the last 5 bars is higher than the top price in the first 5 bars
        console.log('IS TRUELY 30 up'+ lowX+" >  " +topX)

        return true

    }else{
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


    if(lowX<topX){
        console.log('IS TRUELY 30  DOWN '+ lowX+" >  " +topX)

        //INVERSE:The lowest price in the last 5 bars is higher than the top price in the first 5 bars
        return true

    }else{
        return false

    }

}

function calcKeltData(barData){

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



    let bBars=[];

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
        if(barData[bb].C!=0&&barData[bb].H!=0) {
            closeArray.push(barData[bb].C)//adds to the end of the array

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
    for (let bb in barData) {//console.log(bb, would be the time stamp number)
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




function isMoreThan1Dollar(xbars) {


    //  aeRef.ref('nanex/'+xsymbol+'/2020_11_25').limitToLast(21).once("value", (xitems)=>{

    //The bars needs to be the LAST bars, not the whole set.


    let bBars = [];

    for (let bb in xbars) {

        bBars.push(xbars[bb])


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


    let kelts = calcKeltData(bBars)




    if(parseFloat(kelts.atr20)>1){
//console.log('More than 10 cents')
        return true;

    }else{

        // console.log('Less than 10 cents')
        return false
    }

}


function isMoreThan10Cents(xbars) {


    //  aeRef.ref('nanex/'+xsymbol+'/2020_11_25').limitToLast(21).once("value", (xitems)=>{

    //The bars needs to be the LAST bars, not the whole set.


    let bBars = [];

    for (let bb in xbars) {

        bBars.push(xbars[bb])


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


    let kelts = calcKeltData(bBars)




    if(parseFloat(kelts.atr20)>.10){
//console.log('More than 10 cents')
        return true;

    }else{

        // console.log('Less than 10 cents')
        return false
    }

}





let NQ =
    {


        AAPL: 122.04,
        MSFT: 9.502,
        AMZN: 8.36,
        TSLA: 4.102,
        FB: 3.764,
        GOOG: 3.658,
        GOOGL: 3.344,
        NVDA: 2.639,
        PYPL: 2.291,
        INTC: 2.142,
        CMCSA: 2.078,
        NFLX: 1.88,
        ADBE: 1.842,
        CSCO: 1.807,
        PEP: 1.626,
        AVGO: 1.54,
        TXN: 1.415,
        COST: 1.281,
        TMUS: 1.281,
        QCOM: 1.222,
        AMGN: 1.193,
        SBUX: 1.073,
        CHTR: 1.014,
        AMAT: 0.962,
        INTU: 0.846,
        MU: 0.8,
        BKNG: 0.791,
        AMD: 0.761,
        ISRG: 0.707,
        MDLZ: 0.686,
        GILD: 0.681,
        LRCX: 0.677,
        FISV: 0.668,
        ADP: 0.665,
        CSX: 0.608,
        ATVI: 0.594,
        MELI: 0.589,
        JD: 0.57,
        ZM: 0.528,
        BIDU: 0.49,
        ADSK: 0.488,
        ADI: 0.465,
        VRTX: 0.458,
        NXPI: 0.453,
        ILMN: 0.445,
        REGN: 0.41,
        KHC: 0.407,
        KDP: 0.406,
        KLAC: 0.404,
        MAR: 0.398,
        MNST: 0.396,
        MRNA: 0.392,
        PDD: 0.387,
        ASML: 0.386,
        WBA: 0.379,
        WDAY: 0.362,
        ROST: 0.355,
        EXC: 0.351,
        AEP: 0.348,
        BIIB: 0.348,
        CTSH: 0.345,
        ALGN: 0.343,
        EBAY: 0.339,
        IDXX: 0.336,
        MCHP: 0.334,
        LULU: 0.328,
        EA: 0.32,
        DOCU: 0.304,
        SNPS: 0.302,
        CDNS: 0.302,
        PAYX: 0.296,
        ORLY: 0.296,
        XEL: 0.293,
        CTAS: 0.293,
        MTCH: 0.292,
        ALXN: 0.279,
        DXCM: 0.276,
        PCAR: 0.268,
        MRVL: 0.263,
        NTES: 0.255,
        XLNX: 0.244,
        SWKS: 0.243,
        FAST: 0.24,
        ANSS: 0.238,
        VRSK: 0.237,
        PTON: 0.234,
        DLTR: 0.226,
        TEAM: 0.225,
        OKTA: 0.214,
        SIRI: 0.209,
        CPRT: 0.208,
        SGEN: 0.206,
        MXIM: 0.199,
        CDW: 0.192,
        VRSN: 0.182,
        CERN: 0.181,
        SPLK: 0.176,
        TCOM: 0.172,
        INCY: 0.146,
        CHKP: 0.133,
        FOXA: 0.103,
    }


let ES =
    {
        AAPL: 5.647768,
        MSFT: 5.219567,
        AMZN: 3.903462,
        FB: 2.067838,
        GOOGL: 1.837032,
        GOOG: 1.768536,
        BRK_B: 1.469432,
        TSLA: 1.456862,
        JPM: 1.407067,
        JNJ: 1.294723,
        V: 1.072776,
        UNH: 1.054213,
        DIS: 1.005416,
        PG: 0.995731,
        HD: 0.979533,
        NVDA: 0.952817,
        MA: 0.937583,
        BAC: 0.884301,
        PYPL: 0.827022,
        INTC: 0.773491,
        CMCSA: 0.750291,
        VZ: 0.723806,
        XOM: 0.716467,
        NFLX: 0.678799,
        ADBE: 0.666046,
        T: 0.654263,
        CSCO: 0.652479,
        ABT: 0.633311,
        KO: 0.615383,
        CVX: 0.609189,
        PFE: 0.601269,
        PEP: 0.587062,
        MRK: 0.581341,
        CRM: 0.575341,
        ABBV: 0.562967,
        WMT: 0.561787,
        AVGO: 0.555909,
        TMO: 0.530751,
        ACN: 0.527413,
        TXN: 0.510821,
        NKE: 0.504647,
        MCD: 0.500757,
        WFC: 0.486137,
        MDT: 0.478225,
        COST: 0.462186,
        C: 0.454647,
        HON: 0.452814,
        UNP: 0.442181,
        QCOM: 0.441247,
        LLY: 0.440526,
        LIN: 0.435884,
        NEE: 0.434256,
        AMGN: 0.430625,
        BMY: 0.423453,
        DHR: 0.421981,
        PM: 0.415397,
        LOW: 0.414676,
        BA: 0.412744,
        ORCL: 0.390638,
        SBUX: 0.387557,
        CAT: 0.379432,
        UPS: 0.362078,
        IBM: 0.359389,
        MS: 0.354316,
        RTX: 0.353002,
        DE: 0.34988,
        GE: 0.348131,
        AMAT: 0.347261,
        GS: 0.341031,
        MMM: 0.336495,
        BLK: 0.317531,
        AMT: 0.314612,
        INTU: 0.305463,
        TGT: 0.298532,
        CVS: 0.29784,
        SCHW: 0.289324,
        MU: 0.288968,
        NOW: 0.285543,
        BKNG: 0.285519,
        MO: 0.284431,
        AXP: 0.27952,
        AMD: 0.274397,
        LMT: 0.27266,
        CHTR: 0.267118,
        ANTM: 0.266192,
        FIS: 0.264254,
        CI: 0.258178,
        ISRG: 0.25529,
        SPGI: 0.253502,
        MDLZ: 0.247794,
        GILD: 0.245714,
        LRCX: 0.244264,
        ADP: 0.240036,
        TJX: 0.238426,
        SYK: 0.23753,
        TFC: 0.236403,
        PLD: 0.235687,
        USB: 0.227993,
        PNC: 0.224842,
        ZTS: 0.222768,
    }

    let FIN={
BAC:1,
        C:1,
        WFC:1,
        HBAN:1,
        JPM:1,
        RF:1,
        SYF:1,
        MS:1,
        KEy:1,
        IVZ:1,
        METSCHW:1,
        USB:1,
        CFF2AIG:1,
        TFC:1,
        BRK_B:1,
        GS:1,
        BK:1,
        COF:1,
        AFL:1,
        FITB:1,
        DFS:1,
        ICE:1,
        AXP:1,
        PRU:1,
        BEN:1,


    }

 let  TECH= {
     AAPL:1,
     MSFT:1,
     NVDA:1,
     PYPL:1,
     ADBE:1,
     INTC:1,
     CSCO:1,
     CRM:1,
     INTU:1,
     AMZN:1,
     NFLX:1,
     FB:1,
     GOOGL:1,
     SHOP:1,
     ZM:1,
     ETSY:1,
     BABA:1,
     PINS:1,
     SPOT:1,
     ROKU:1,
     SNOW:1,
     TWLO:1,
     W:1,
     ORCL:1,
     MU:1,
     ADSK:1,
     NOW:1,
     AVGO:1,


}


let ENERGY={
    OXY:1,
    SLB:1,
    XOM:1,
    MRO:1,
HAL:1,
DVN:1,
COG:1,
CVX:1,
COP:1,
KMI:1,
WMB:1,
APA:1,
MPC:1,
HFC:1,
EOG:1,
NOV:1,
VLO:1,
PSX:1,
FANG:1,
PXD:1,
DES:1,
OKE:1,

}

let INDUST = {
    LMTT:1,
    WM:1,
    CTAS:1,
    SNA:1,
    GWW:1,
    GE: 1,
    AAL:1,
   DAL:1,
    UAL:1,
    BA:1,
    LUV:1,
    CSX:1,
    CARR:1,
    RTX:1,
    UNP:1,
    ALK:1,
    UPS:1,
    GAT:1,
    HON:1,
    JCI:1,
    MMM:1,
    OTIS:1,
    HWM:1,
}

let REALESTATE={

WY:1,
    PEAK:1,
    O:1,
    HST:1,
    PLD:1,
    DRE:1,
    KIM:1,
    SPG:1,
    IRM:1,
    EQR:1,
    DLR:1,
    VNO:1,
    WELL:1,
    AMT:1,
    CCI:1,
    VTR:1,
    UDR:1,
    CBRE:1,
    BXP:1,
    REG:1,
    SBAC:1,
    PSA:1,
    EQIX:1,
    EXR:1,
    FRT:1,
    AVB:1,
    ARE:1,
    ESS:1,
    MAA:1,

}


let UTILITY={
    NEE:1,
    EXC:1,
    CNP:1,
    XEL:1,
    NI:1,
    NRG:1,
    AEP:1,
    D:1,
    AES:1,
    PPL:1,
    ED:1,
    SO:1,
    DUK:1,
    ES:1,
    FE:1,
    PEG:1,
    SRE:1,
    CMS:1,
    WEC:1,
    EIX:1,
    LNT:1,
    AEE:1,
    AWK:1,
    DTE:1,
    ETR:1,
    PNW:1,
    ATO:1,
    EVRG:1,


}


let COMMUNICATION={
T:1,
    TWTR:1,
    VIAC:1,
    VZ:1,
    FB:1,
    CMCSA:1,
    LUMN :1,
    DISCA:1,
    DIS:1,
    NFLX:1,
    ATVI :1,
    TMUS:1,
    IPG:1,
    FOXA:1,
    OMC:1,
    DISCK:1,
    NWSA:1,
    DISH:1,
    FOX:1,
    LYV:1,
    TTWO:1,
    EA:1,
    GOOGL:1,
    GOOG:1,
    CHTR:1,
    NWS:1,


}

let CONSUMER_STAPLE={
KO:1,
    PG:1,
    KR:1,
    WMT:1,
    MO:1,
    PEP:1,
    CL:1,
    KMB:1,
    MOLZ:1,
    WBA:1,
    KHC:1,
    GIS:1,
    TSN:1,
    PM:1,
    K:1,
    ADM:1,
    CPB:1,
    COST:1,
    CAG:1,
    SYY:1,
    KRL:1,
    CHD:1,
    SJM:1,
    MNST:1,
    CLX:1,
    TAP:1,
    EL:1,
    HSY:1,
    MKC:1,
    SYZ:1,


}

let CONSUMER_DISC={

    GM:1,
    CCL:1,
    TSL:1,
    NCLH:1,
    TJX:1,
    GPS:1,
    LVS:1,
    SBUX:1,
    EBAY:1,
    LB:1,
    UAA:1,
    NKE:1,
    MGM:1,
    MCD:1,
    UA:1,
    ETSY:1,
    DLTR:1,
    TPR:1,
    PENN:1,
    RCL:1,
    LOW:1,
    TGT:1,
    AMZN:1,
    WYNN:1,
    DHI:1,
    BBY:1,
    HD:1,
    BWA:1,
    ROST:1,
    LEN:1,








}

let HEALTH= {
    JNJ:1,
    UNH:1,
ABT:1,
ABBV:1,
PFE:1,
MRK:1,
TMO:1,
LLY:1,
MDT:1,
    DHR:1,
BMY:1,
AMGN:1,
CVS:1,
ISRG:1,
SYK:1,
GILD:1,
CI:1,
ANTM:1,

    ZTS:1,
BDX:1,
    ILMN:1,
BSX:1,
VRTX:1,
EW:1,
HUM:1,





}


let MATERIALS={
    FCX:1,
AMCR:1,
NEM:1,
MOS:1,
    LIN:1,
NUE:1,
IP:1,
DOW:1,
CTVA:1,
DD:1,
BLL:1,
WRK:1,
LYB:1,
SEE:1,
CF:1,
VMC:1,
ECL:1,
SHW:1,
PPG:1,
    AVY:1,
ALB:1,
IFF:1,
PKG:1,
APD:1,
CE:1,
FMC:1,
    MLM:1,
EMN:1,





}




let RTY =
    {
        PENN: 0.57,
        CZR: 0.56,
        PLUG: 0.5,
        DAR: 0.42,
        GME: 0.4,
        NVAX: 0.38,
        LAD: 0.37,
        RH: 0.34,
        BLDR: 0.33,
        RUN: 0.33,
        DECK: 0.32,
        CHDN: 0.31,
        XTSLA: 0.28,
        CLF: 0.28,
        SITE: 0.27,
        PFGC: 0.27,
        NTRA: 0.26,
        TTEK: 0.26,
        RARE: 0.25,
        VAC: 0.25,
        MRTX: 0.25,
        BLD: 0.25,
        IIVI: 0.24,
        X: 0.24,
        ARWR: 0.23,
        RDFN: 0.23,
        SF: 0.23,
        TXRH: 0.23,
        OVV: 0.23,
        APPS: 0.22,
        FRPT: 0.22,
        FFIN: 0.22,
        AA: 0.22,
        BJ: 0.22,
        EME: 0.22,
        SAIA: 0.22,
        LPX: 0.21,
        BEPC: 0.21,
        SLAB: 0.21,
        LSCC: 0.21,
        BRKS: 0.21,
        YETI: 0.2,
        LHCG: 0.2,
        RXN: 0.2,
        EGP: 0.2,
        FATE: 0.2,
        WMS: 0.2,
        VLY: 0.2,
        SSB: 0.2,
        BBIO: 0.2,
        THC: 0.2,
        GBCI: 0.2,
        TGTX: 0.2,
        OMCL: 0.2,
        HALO: 0.2,
        PACB: 0.2,
        MMS: 0.19,
        STAG: 0.19,
        HQY: 0.19,
        KBR: 0.19,
        BL: 0.19,
        FOXF: 0.19,
        CIT: 0.19,
        HELE: 0.19,
        CROX: 0.19,
        BPMC: 0.18,
        INSP: 0.18,
        TWST: 0.18,
        MTZ: 0.18,
        JCOM: 0.18,
        ESNT: 0.18,
        GTLS: 0.18,
        QTWO: 0.18,
        CCMP: 0.18,
        VRNS: 0.18,
        EXPO: 0.18,
        UBSI: 0.17,
        NEO: 0.17,
        ASGN: 0.17,
        ENSG: 0.17,
        BYD: 0.17,
        MSTR: 0.17,
        IRDM: 0.17,
        ROLL: 0.17,
        WSC: 0.17,
        POWI: 0.17,
        STAA: 0.16,
        NEOG: 0.16,
        SYNA: 0.16,
        NVRO: 0.16,
        APPN: 0.16,
        MEDP: 0.16,
        M: 0.16,
        MGNI: 0.16,
        SSD: 0.16,
        RLI: 0.16,
        RDN: 0.16,
        NOVT: 0.16,
        SONO: 0.16,
        AEO: 0.16,
    }


function isIn(xid,items){








    for (let bb in items){

        if("e"+bb==xid){
            return true
        }


    }

    return false
}


function isNQ(xid){








   for (let bb in NQ){

       if("e"+bb==xid){
        return true
       }


    }

    return false
}


function isEQ(xid){





    for (let bb in ES){

        if("e"+bb==xid){
            return true
        }


    }

    return false
}



function isRTY(xid){




    for (let bb in RTY){

        if("e"+bb==xid){
            return true
        }


    }

    return false
}



exports.multiDivergence= trackRef.ref('hold/{xsymbol}/{xday}/{xminute}')
    .onWrite(async (event, context) => {
        if (event.after._data != null) {

            let xitem = event.after._data;

            let xcount=0;
            let up=0;
            let down=0;
            let foundIt=false;
            let foundIt2=false;
            for(let xx in xitem){

              //  console.log(xitem[xx].U)

                if(xitem[xx].U!=0&&xitem[xx].D!=0) {
    if (context.params.xsymbol == "RTY") {
        up = up + (xitem[xx].U)
        down = down + (xitem[xx].D )

    }

    if (context.params.xsymbol == "NQ") {
        up = up + (xitem[xx].U )
        down = down + (xitem[xx].D )

    }

    if (context.params.xsymbol == "EQ") {
        up = up + (xitem[xx].U )
        down = down + (xitem[xx].D )

    }
}
                xcount=xcount+1
                if(xx=="eAAPL"){
                    foundIt=true;
                }
                if(xx=="ePLUG"){
                    foundIt2=true;
                }
            }








if(context.params.xsymbol=="NQ") {
    if (foundIt ==true) {
        console.log('Yes its times to transfer  U:' + up+"  D:"+down)


                    let uval = await aeRef.ref("nanex/eAAPL/" + context.params.xday + "/" + context.params.xminute).once("value")


                    let outx = uval.val()

                    outx.U = up;
                    outx.D = down;

                    trackingRef.ref('nanex/' + context.params.xsymbol + '/' + context.params.xday + "/" + context.params.xminute).set(outx);

                }

}else if(context.params.xsymbol=="RTY") {
    if (foundIt2==true) {

        console.log('Yes its times to transfer  U:' + up+"  D:"+down)


                    let uval = await aeRef.ref("nanex/eAAPL/" + context.params.xday + "/" + context.params.xminute).once("value")


                    let outx = uval.val()

                    outx.U = up;
                    outx.D = down;

                    trackingRef.ref('nanex/' + context.params.xsymbol + '/' + context.params.xday + "/" + context.params.xminute).set(outx);

                }

            }else {
    if (foundIt== true) {
        console.log('Yes its times to transfer  U:' + up+"  D:"+down)


                    let uval = await aeRef.ref("nanex/eAAPL/" + context.params.xday + "/" + context.params.xminute).once("value")


                    let outx = uval.val()

                    outx.U = up;
                    outx.D = down;

                    trackingRef.ref('nanex/' + context.params.xsymbol + '/' + context.params.xday + "/" + context.params.xminute).set(outx);

                }
            }

        }
    })



async  function findSpikes(event, xcontext,xsize) {
    //console.log(event.ref.parent.key)
    //return;
    let    context = {}
    let xdata=null;
    xsize="one/"
    var d = new Date()
    // d.setDate(d.getDate() - 1);

    var n = moment(d).format('YYYY-MM-DD')
    var n2 = moment(d).format('MM-DD')

    n = n.replace('-', '_').replace('-', '_')
    let multiplier=1;

    if(xsize=="one/"){
        context.params = {stockId: xcontext}
        xdata=event;
//        context.params = {stockId: xcontext}
        //  console.log('gG----'+event.ref.parent.key)
//THIS IS FOR LOCAL TESTING
        //   xdata = event.val()
        //  context.params = {stockId: event.ref.parent.key}
    }else{
        multiplier=15
        context.params = {stockId: event.ref.key}

        xdata = event.val();

    }

    //TODO in order to be able to integrate live tick, i want to create a DB node when the potential diverage is "on"  and let you know that it COULD pop
    //==== waiting for signal, price hit signal, relay faster so you dont have to wait 45 seconds to find out
    if (xdata != null) {

//    if (event.after._data != null) {
        //console.log("Checking - " + context.params.stockId)
        //  console.log('Did Have data...')
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

        let MO=0;




        if(isIn(context.params.stockId,CONSUMER_DISC)){

            if(context.params.stockId=="eRCL") {
                setTimeout(()=> {
                    trackingRef.ref('hold/CD/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/CD/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }



        if(isIn(context.params.stockId,CONSUMER_STAPLE)){

            if(context.params.stockId=="eKO") {
                setTimeout(()=> {
                    trackingRef.ref('hold/CS/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/CS/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }




        if(isIn(context.params.stockId,COMMUNICATION)){

            if(context.params.stockId=="eT") {
                setTimeout(()=> {
                    trackingRef.ref('hold/C/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/C/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }



        if(isIn(context.params.stockId,UTILITY)){

            if(context.params.stockId=="eNEE") {
                setTimeout(()=> {
                    trackingRef.ref('hold/U/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/U/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }

        if(isIn(context.params.stockId,HEALTH)){

            if(context.params.stockId=="eJNJ") {
                setTimeout(()=> {
                    trackingRef.ref('hold/H/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/H/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }


        if(isIn(context.params.stockId,MATERIALS)){

            if(context.params.stockId=="ePPG") {
                setTimeout(()=> {
                    trackingRef.ref('hold/M/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/M/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }


        if(isIn(context.params.stockId,REALESTATE)){

            if(context.params.stockId=="eWY") {
                setTimeout(()=> {
                    trackingRef.ref('hold/RE/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/RE/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }



        if(isIn(context.params.stockId,INDUST)){

            if(context.params.stockId=="eLMT") {
                setTimeout(()=> {
                    trackingRef.ref('hold/I/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/I/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }



        if(isIn(context.params.stockId,ENERGY)){

            if(context.params.stockId=="eOXY") {
                setTimeout(()=> {
                    trackingRef.ref('hold/E/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/E/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }


        if(isIn(context.params.stockId,FIN)){

            if(context.params.stockId=="eBAC") {
                setTimeout(()=> {
                    trackingRef.ref('hold/F/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/F/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }




        if(isIn(context.params.stockId,TECH)){

            if(context.params.stockId=="eAAPL") {
                setTimeout(()=> {
                    trackingRef.ref('hold/T/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/T/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }


        if(isNQ(context.params.stockId)){

            if(context.params.stockId=="eAAPL") {
                setTimeout(()=> {
                    trackingRef.ref('hold/NQ/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                },2000)
            }else{
                trackingRef.ref('hold/NQ/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }









        if(isNQ(context.params.stockId)){

            if(context.params.stockId=="eAAPL") {
              setTimeout(()=> {
                  trackingRef.ref('hold/NQ/' + n + "/" + topminute + "/" + context.params.stockId).update({
                      U: xdata[topminute].U,
                      D: xdata[topminute].D
                  });
              },2000)
            }else{
                trackingRef.ref('hold/NQ/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }

        }
        if(isEQ(context.params.stockId)){
            if(context.params.stockId=="eAAPL") {
                setTimeout(() => {
                    trackingRef.ref('hold/EQ/' + n + "/" + topminute + "/" + context.params.stockId).update({
                        U: xdata[topminute].U,
                        D: xdata[topminute].D
                    });
                }, 2000)
            }else{
                trackingRef.ref('hold/EQ/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }


        }
        if(isRTY(context.params.stockId)){
            if(context.params.stockId=="ePLUG") {
                setTimeout(() => {
                trackingRef.ref('hold/RTY/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
                }, 2000)
            }else{
                trackingRef.ref('hold/RTY/' + n + "/" + topminute + "/" + context.params.stockId).update({
                    U: xdata[topminute].U,
                    D: xdata[topminute].D
                });
            }
        }

let firstC=0;

        for (let bb in xdata) {


            //TODO Only process minutes, that are -30()(bars and remember that its still 60 bars if 15 minute chart) from the current minute
            posted = false;
            if (xdata[bb].H < 40) {
                continue;
            }


            if (xdata[bb].O != 0 && MO == 0) {
                MO = parseFloat(xdata[bb].O)
                if(bb==topminute){
                    trackingRef.ref("MO/" + context.params.stockId).set(MO);
                }


            }


            if(MO!=0){
                if(parseInt(topminute)==parseInt(bb)) {
                    if (parseFloat(xdata[bb].O) > parseFloat(MO) * 1.05) {
                        trackingRef.ref(n + "/" + xsize + 'gainers/' + context.params.stockId).set({
                            MO: MO,
                            T:bb,
                            C: xdata[bb].C
                        });

                    }


                    if (parseFloat(xdata[bb].O) < parseFloat(MO) * .95) {
                        trackingRef.ref(n + "/" + xsize + 'losers/' + context.params.stockId).set({
                            MO: MO,
                            T:bb,
                            C: xdata[bb].C
                        });
                    }

                }



            }







            xcount = xcount + 1



            //=================================================================================================
            //This Section Processes the 10 minute Divergence
            if (xcount > 15) {
                // if (xdata[bb].V > 25000) {


                trendAlgo = 0;
                for (let xx in algoDir) {
                    trendAlgo = trendAlgo + algoDir[xx];
                }


                trendPrice = 0;
                for (let xx in priceDir) {
                    trendPrice = trendPrice + priceDir[xx];
                }


                //TODO: grab yesterdays low?

                ///TODO needs ot be dynamica enough to detect what the actual curvature

                if (lastfound10 + 5 < xcount) {
                    //TODO potentialy makes this just 5

                    //  console.log('AAAAa' + xA)

                    if (xA> 10000*multiplier) {
                        // console.log('AAA---'+trendAlgo+" "+trendPrice)
                        if (trendAlgo > 7 && trendPrice < -6) {
                            lastfound10 = xcount;
                            //  console.log('FOUND 10 algo UP, Price Down' )
                            if (isTruely15Down(xdata, bb)) {
                                //   console.log("AA")
                                if (parseInt(topminute) == parseInt(bb)) {

                                    //  console.log('FOUND 1')
                                    trackingRef.ref(n+"/"+xsize + 'divergencePriceDown/15/' + context.params.stockId + "/" + bb).set(true);
                                    trackingRef.ref(n+"/"+xsize + 'divergence/' + context.params.stockId + '/PriceDown/15/' + bb).set(true);

                                    //  checkKelts(xdata, context.params.stockId, bb, 15, "DOWN", xdata[bb].L, xsize)
                                    //  checkKelts(xdata, context.params.stockId, bb, 15, "UP", xdata[bb].H, xsize)

                                    let kelts = calcKeltData(xdata)
                                    kelts.c= xdata[bb].L;
                                    kelts.s= context.params.stockId;
                                    kelts.t= bb

                                    kelts.tA5=trendAlgo5
                                    kelts.tP5=trendPrice5

                                    kelts.tA15=trendAlgo
                                    kelts.tP15=trendPrice

                                    kelts.tA30=trendAlgo30
                                    kelts.tP30=trendPrice30
                                    trackingRef.ref(n+"/"+xsize + 'latest/priceDown/15').push(kelts);
                                }
                            }
                        }

                        if (trendAlgo < -7 && trendPrice >6) {
                            lastfound10 = xcount;
                            //   console.log('FOUND 10 algo down, Price Up');
                            if (parseInt(topminute) == parseInt(bb)) {
                                //    console.log("A")
                                if (isTruely15Up(xdata, bb)) {
                                    // console.log('FOUND 1')

                                    trackingRef.ref(n+"/"+xsize + 'divergencePriceUp/15/' + context.params.stockId + "/" + bb).set(true);
                                    trackingRef.ref(n+"/"+xsize + 'divergence/' + context.params.stockId + '/PriceUp/15/' + bb).set(true);
                                    //  checkKelts(xdata, context.params.stockId, bb, 15, "UP", xdata[bb].H, xsize)

                                    //  checkKelts(xdata, context.params.stockId, bb, 15, "DOWn", xdata[bb].L, xsize)
                                    let kelts = calcKeltData(xdata)
                                    kelts.c= xdata[bb].L;
                                    kelts.s= context.params.stockId;
                                    kelts.t= bb

                                    kelts.tA5=trendAlgo5
                                    kelts.tP5=trendPrice5

                                    kelts.tA15=trendAlgo
                                    kelts.tP15=trendPrice

                                    kelts.tA30=trendAlgo30
                                    kelts.tP30=trendPrice30
                                    trackingRef.ref(n+"/"+xsize + 'latest/priceUp/15').push(kelts);
                                }
                            }
                        }
                    }

                }
                // }

            }

            //=================================================================================================
            //This Section Processes the 30 minute Divergence
            if (xcount > 30) {
                //  if (xdata[bb].V > 25000) {


                trendAlgo30 = 0;
                for (let xx in algoDir30) {
                    trendAlgo30 = trendAlgo30 + algoDir30[xx];
                }


                trendPrice30 = 0;
                for (let xx in priceDir30) {
                    trendPrice30 = trendPrice30 + priceDir30[xx];
                }


                // //console.log('30 ----------- Algo:'+trendAlgo30+" Price:"+trendPrice30)

                //TODO: grab yesterdays low?

                ///TODO needs ot be dynamica enough to detect what the actual curvature
                if (xA > 10000*multiplier) {
                    if (lastfound30 + 10 < xcount) {

                        if (trendAlgo30 > 10 && trendPrice30 < -8) {
                            // console.log("B")
                            if (isTruely30Down(xdata, bb)) {
                                lastfound30 = xcount;
                                //  console.log('FOUND 30 algo UP, Price Down')
                                if (parseInt(topminute) == parseInt(bb)) {
                                    //    console.log('FOUND 1')

                                    trackingRef.ref(n+"/"+xsize + 'divergencePriceDown/30/' + context.params.stockId + "/"  +bb).set(true);
                                    trackingRef.ref(n+"/"+xsize + 'divergence/' + context.params.stockId + '/PriceDown/30/' + bb).set(true);
                                    let kelts = calcKeltData(xdata)
                                    kelts.c= xdata[bb].L;
                                    kelts.s= context.params.stockId;
                                    kelts.t= bb

                                    kelts.tA5=trendAlgo5
                                    kelts.tP5=trendPrice5

                                    kelts.tA15=trendAlgo
                                    kelts.tP15=trendPrice

                                    kelts.tA30=trendAlgo30
                                    kelts.tP30=trendPrice30
                                    trackingRef.ref(n+"/"+xsize + 'latest/priceDown/30').push(kelts);
                                    //checkKelts(xdata, context.params.stockId, bb, 30, "DOWN", xdata[bb].L, xsize)
                                    // checkKelts(xdata, context.params.stockId, bb, 30, "UP", xdata[bb].H, xsize)

                                }
                            }
                        }

                        if (trendAlgo30 < -10 && trendPrice30 > 8) {
                            //   console.log("BB")
                            if (isTruely30Up(xdata, bb)) {
                                lastfound30 = xcount;
                                // console.log('FOUND 30 algo down, Price Up');
                                if (parseInt(topminute) == parseInt(bb)) {
                                    //    console.log('FOUND 1')

                                    trackingRef.ref(n+"/"+xsize + 'divergencePriceUp/30/' + context.params.stockId + "/"  +bb).set(true);
                                    trackingRef.ref(n+"/"+xsize + 'divergence/' + context.params.stockId + '/PriceUp/30/' + bb).set(true);
                                    let kelts = calcKeltData(xdata)
                                    kelts.c= xdata[bb].L;
                                    kelts.s= context.params.stockId;
                                    kelts.t= bb

                                    kelts.tA5=trendAlgo5
                                    kelts.tP5=trendPrice5

                                    kelts.tA15=trendAlgo
                                    kelts.tP15=trendPrice

                                    kelts.tA30=trendAlgo30
                                    kelts.tP30=trendPrice30

                                    trackingRef.ref(n+"/"+xsize + 'latest/priceUp/30').push(kelts);
                                    //  checkKelts(xdata, context.params.stockId, bb, 30, "UP", xdata[bb].H, xsize)
                                    ///  checkKelts(xdata, context.params.stockId, bb, 30, "DOWN", xdata[bb].L, xsize)
                                }
                            }
                        }


                    }
                }
                //   }

            }





            if (posted == false) {



                //holdAlgo.push(xdata[bb].U-xdata[bb].D)


                ///TODO: Make this C+H+L compare to bb-1
                if (xdata[bb].C > xdata[bb].O) {
                    //positive upward price movement
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
                            // newAlgo.push(holdAlgo[bx]);

                        }
                    }

                    holdLow = newLow;
                    holdHigh = newHigh;
                    // holdAlgo=newAlgo;

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



                //  console.log(xdata[bb].H +"    "+(highestHigh + (totalrange*.25 )))

                //   console.log('Should be here.' + 5000*multiplier +"  "+isMoreThan10Cents(xdata) )

                if (xA> 5000*multiplier) {

                    if (parseFloat(xdata[bb].H)>(highestHigh+(totalrange/2))) {




                        //This is a spike UPWARD of more than 50% of the range of the last 20 bars
                        // console.log('Found Price Spike UP' + moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))
                        if (parseInt(topminute) == parseInt(bb)) {
                            //  if (xdata[bb].V > 25000) {
                            //if(topminute==bb) {
                            trackingRef.ref(n + "/" + xsize + 'spikeUp/' + context.params.stockId + "/" + bb).set({
                                a: trendAlgo,
                                h:highestHigh,
                                t:totalrange,

                                p: trendPrice,
                                v: xdata[bb].V
                            });
                            trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/SpikeUp/" + bb).set({
                                a: trendAlgo,
                                p: trendPrice,
                                t:totalrange,
                                h:highestHigh,
                                v: xdata[bb].V
                            });
                        }
                        //}
                        posted = true;
                        // }

                    }
                    if (parseFloat(xdata[bb].L)<(lowestLow-(totalrange/2))) {
                        //     console.log('Found Price Spike DOWN' + moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))
                        if (parseInt(topminute) == parseInt(bb)) {

                            //This is a spike DOWNWARD of more than 200% of the range of the last 20 bars
                            // console.log('Found Spike')
                            //  if (xdata[bb].V > 25000) {
                            //if(topminute==bb) {
                            trackingRef.ref(n + "/" + xsize + 'spikeDown/' + context.params.stockId + "/" + bb).set({
                                a: trendAlgo,
                                t:totalrange,
                                l:lowestLow,
                                p: trendPrice,
                                v: xdata[bb].V
                            });
                            trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/SpikeDown/" + bb).set({
                                a: trendAlgo,
                                p: trendPrice,
                                l:lowestLow,
                                t:totalrange,
                                v: xdata[bb].V
                            });

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

                let existingPattern=staggered;

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
                if (xA> 5000*multiplier) {


                    if ((isAlgoSpike('U', existingPattern, xvalue)) && xcount > 15) {


                        // console.log('FOnd Algo Up'+ moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))
                        if (parseInt(topminute) == parseInt(bb)) {

                            let kelts = calcKeltData(xdata)
                            kelts.c = xdata[bb].L;
                            kelts.a = trendAlgo;
                            kelts.p = trendPrice;
                            kelts.v = xdata[bb].V;
                            kelts.xamount=xamount
                            kelts.t=bb

                            trackingRef.ref(n + "/" + xsize + 'algoSpikeUp/' + context.params.stockId + "/" + bb).set(kelts);
                            trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/algoSpikeUp/" + bb).set(kelts);

                            kelts.s=context.params.stockId

                            trackingRef.ref(n+"/"+xsize + 'latest/algoSpikeUp').push(kelts);
                            //}
                            posted = true;
                            // }
                        }

                    }
                    if ((isAlgoSpike('D', existingPattern, xvalue)) && xcount > 15) {
                        //    console.log('FOnd Algo DOWn'+ moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))

                        if (parseInt(topminute) == parseInt(bb)) {
                            let kelts = calcKeltData(xdata)
                            kelts.c = xdata[bb].L;
                            kelts.a = trendAlgo;
                            kelts.p = trendPrice;
                            kelts.v = xdata[bb].V;
                            kelts.xamount=xamount
                            kelts.t=bb
                            trackingRef.ref(n + "/" + xsize + 'algoSpikeDown/' + context.params.stockId + "/" + bb).set(kelts);
                            trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/algoSpikeDown/" + bb).set(kelts);
                            kelts.s=context.params.stockId

                            trackingRef.ref(n+"/"+xsize + 'latest/algoSpikeDown').push(kelts);

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


function is929(rVal) {



        let xtimeb =
            moment.tz(parseInt(rVal), "America/New_York").format('H');

        //console.log(xtimeb)
        xtimeb=parseInt(xtimeb)+4


        let xtime2 = moment(parseInt(rVal)).format('mm')

        //console.log(xtimeb+":"+xtime2)


            if (parseInt(xtimeb) > 8 && parseInt(xtimeb) < 10) {
                if (parseInt(xtime2) == 29) {

                    //     console.log('IS 929'+ rVal)
                    return true
                }
            }

        return false

}

function is400(rVal) {



    let xtimeb =
        moment.tz(parseInt(rVal), "America/New_York").format('H');

    //console.log(xtimeb)
    xtimeb=parseInt(xtimeb)


    let xtime2 = moment(parseInt(rVal)).format('mm')

    //console.log(xtimeb+":"+xtime2)


    if (parseInt(xtimeb) ==16) {
        if (parseInt(xtime2) == 0) {


            //     console.log('IS 929'+ rVal)
            return true
        }
    }

    return false

}


function findSpikes15(event, xcontext,xsize) {


    //return;
    let    context = {}
    let xdata=null;
    xsize="fifteen/"
    var d = new Date()
    // d.setDate(d.getDate() - 1);

    var n = moment(d).format('YYYY-MM-DD')
    var n2 = moment(d).format('MM-DD')

    n = n.replace('-', '_').replace('-', '_')
    let multiplier=1;

    if(xsize=="one/"){
        context.params = {stockId: xcontext}
        xdata=event;
//        context.params = {stockId: xcontext}

        //  console.log('gG----'+event.ref.parent.key)
//THIS IS FOR LOCAL TESTING
        //   xdata = event.val()
        //  context.params = {stockId: event.ref.parent.key}
    }else{
        multiplier=5
        context.params = {stockId: event.ref.key}

        xdata = event.val();




    }



    //TODO in order to be able to integrate live tick, i want to create a DB node when the potential diverage is "on"  and let you know that it COULD pop
    //==== waiting for signal, price hit signal, relay faster so you dont have to wait 45 seconds to find out
    let xAvg = 0;
    if (xdata != null) {

//    if (event.after._data != null) {
     //   console.log("Checking - " + context.params.stockId)
        //  console.log('Did Have data...')
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

        let trendAlgo30 = 0;
        let trendPrice30 = 0;



        let staggered = [];

        let lastfound10 = -60;


        let posted = false
        let topminute = 0

        for (let bb in xdata) {
            topminute = bb;
        }

        let MO=0;

        for (let bb in xdata) {

            if(xdata[bb].M!=true){
                continue
            }


            //TODO Only process minutes, that are -30()(bars and remember that its still 60 bars if 15 minute chart) from the current minute
            posted = false;
            if (xdata[bb].H < 40) {
                continue;
            }

            if(context.params.stockId=="eSPY"&&is400(parseInt(bb))){

                setTimeout(()=>{



                    trackingRef.ref('trigger30Agg' ).set(true);



                },30000)


            }


            if (is929(parseInt(bb))) {
                staggered = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100]


            }



            xcount = xcount + 1



            //=================================================================================================
            //This Section Processes the 10 minute Divergence
            if (xcount > 15) {
                // if (xdata[bb].V > 25000) {


                trendAlgo = 0;
                for (let xx in algoDir) {
                    trendAlgo = trendAlgo + algoDir[xx];
                }


                trendPrice = 0;
                for (let xx in priceDir) {
                    trendPrice = trendPrice + priceDir[xx];
                }


                //TODO: grab yesterdays low?

                ///TODO needs ot be dynamica enough to detect what the actual curvature

                if (lastfound10 + 20 < xcount) {
                    //TODO potentialy makes this just 5

                    //  console.log('AAAAa' + xA)

                 //   if (xA> 5000) {
                        console.log('AAA---'+trendAlgo+" "+trendPrice)


                        if (trendAlgo > 20 && trendPrice < -15) {
                            lastfound10 = xcount;
                            console.log('CCC---'+trendAlgo+" "+trendPrice)

                             //   console.log("AA")
                                if (parseInt(topminute) == parseInt(bb)) {

                            //  console.log('FOUND 1')
                            trackingRef.ref(n+"/"+xsize + 'divergencePriceDown/15/' + context.params.stockId + "/" + bb).set(true);
                            trackingRef.ref(n+"/"+xsize + 'divergence/' + context.params.stockId + '/PriceDown/15/' + bb).set(true);

                            //  checkKelts(xdata, context.params.stockId, bb, 15, "DOWN", xdata[bb].L, xsize)
                            //  checkKelts(xdata, context.params.stockId, bb, 15, "UP", xdata[bb].H, xsize)

                            let kelts = calcKeltData(xdata)
                            kelts.c= xdata[bb].L;
                            kelts.s= context.params.stockId;
                            kelts.t= bb

                            kelts.tA5=trendAlgo5
                            kelts.tP5=trendPrice5

                            kelts.tA15=trendAlgo
                            kelts.tP15=trendPrice

                                    kelts.tA30=trendAlgo30
                                    kelts.tP30=trendPrice30
                                    trackingRef.ref(n+"/"+xsize + 'latest/priceDown/15').push(kelts);
                                }

                        }

                        if (trendAlgo < -20 && trendPrice >15) {
                            lastfound10 = xcount;
                            console.log('BBB---'+trendAlgo+" "+trendPrice)
                            if (parseInt(topminute) == parseInt(bb)) {
                                //    console.log("A")

                                   // console.log('FOUND 1')

                            trackingRef.ref(n+"/"+xsize + 'divergencePriceUp/15/' + context.params.stockId + "/" + bb).set(true);
                            trackingRef.ref(n+"/"+xsize + 'divergence/' + context.params.stockId + '/PriceUp/15/' + bb).set(true);
                            //  checkKelts(xdata, context.params.stockId, bb, 15, "UP", xdata[bb].H, xsize)

                            //  checkKelts(xdata, context.params.stockId, bb, 15, "DOWn", xdata[bb].L, xsize)
                            let kelts = calcKeltData(xdata)
                            kelts.c= xdata[bb].L;
                            kelts.s= context.params.stockId;
                            kelts.t= bb

                            kelts.tA5=trendAlgo5
                            kelts.tP5=trendPrice5

                            kelts.tA15=trendAlgo
                            kelts.tP15=trendPrice

                                    kelts.tA30=trendAlgo30
                                    kelts.tP30=trendPrice30
                                    trackingRef.ref(n+"/"+xsize + 'latest/priceUp/15').push(kelts);

                            }
                        }
                 //   }

                }
                // }

            }

            //=================================================================================================
            //This Section Processes the 30 minute Divergence




            if (posted == false) {



                //holdAlgo.push(xdata[bb].U-xdata[bb].D)


                ///TODO: Make this C+H+L compare to bb-1
                if (xdata[bb].C > xdata[bb].O) {
                    //positive upward price movement
                    priceDir.push(1)

                } else {
                    priceDir.push(-1)

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
                            // newAlgo.push(holdAlgo[bx]);

                        }
                    }

                    holdLow = newLow;
                    holdHigh = newHigh;
                    // holdAlgo=newAlgo;

                }

                if (priceDir.length > 100) {

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


                if (avgVol.length > 100) {

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



                //  console.log(xdata[bb].H +"    "+(highestHigh + (totalrange*.25 )))

                //   console.log('Should be here.' + 5000*multiplier +"  "+isMoreThan10Cents(xdata) )

                if (xA> 5000*multiplier) {

                    if (parseFloat(xdata[bb].H)>(highestHigh+(totalrange/2))) {




                        //This is a spike UPWARD of more than 50% of the range of the last 20 bars
                        // console.log('Found Price Spike UP' + moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))
                        if (parseInt(topminute) == parseInt(bb)) {
                            //  if (xdata[bb].V > 25000) {
                            //if(topminute==bb) {
                            trackingRef.ref(n + "/" + xsize + 'spikeUp/' + context.params.stockId + "/" + bb).set({
                                a: trendAlgo,
                                h:highestHigh,
                                t:totalrange,

                                p: trendPrice,
                                v: xdata[bb].V
                            });
                            trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/SpikeUp/" + bb).set({
                                a: trendAlgo,
                                p: trendPrice,
                                t:totalrange,
                                h:highestHigh,
                                v: xdata[bb].V
                            });
                        }
                        //}
                        posted = true;
                        // }

                    }
                    if (parseFloat(xdata[bb].L)<(lowestLow-(totalrange/2))) {
                        //     console.log('Found Price Spike DOWN' + moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))
                        if (parseInt(topminute) == parseInt(bb)) {

                            //This is a spike DOWNWARD of more than 200% of the range of the last 20 bars
                            // console.log('Found Spike')
                            //  if (xdata[bb].V > 25000) {
                            //if(topminute==bb) {
                            trackingRef.ref(n + "/" + xsize + 'spikeDown/' + context.params.stockId + "/" + bb).set({
                                a: trendAlgo,
                                t:totalrange,
                                l:lowestLow,
                                p: trendPrice,
                                v: xdata[bb].V
                            });
                            trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/SpikeDown/" + bb).set({
                                a: trendAlgo,
                                p: trendPrice,
                                l:lowestLow,
                                t:totalrange,
                                v: xdata[bb].V
                            });

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

                let existingPattern=staggered;

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
                if (xA> 5000*multiplier) {


                    if ((isAlgoSpike('U', existingPattern, xvalue)) && xcount > 15) {


                        // console.log('FOnd Algo Up'+ moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))
                        if (parseInt(topminute) == parseInt(bb)) {

                            let kelts = calcKeltData(xdata)
                            kelts.c = xdata[bb].L;
                            kelts.a = trendAlgo;
                            kelts.p = trendPrice;
                            kelts.v = xdata[bb].V;
                            kelts.xamount=xamount
                            kelts.t=bb

                            trackingRef.ref(n + "/" + xsize + 'algoSpikeUp/' + context.params.stockId + "/" + bb).set(kelts);
                            trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/algoSpikeUp/" + bb).set(kelts);

                            kelts.s=context.params.stockId

                            trackingRef.ref(n+"/"+xsize + 'latest/algoSpikeUp').push(kelts);
                            //}
                            posted = true;
                            // }
                        }

                    }
                    if ((isAlgoSpike('D', existingPattern, xvalue)) && xcount > 15) {
                        //    console.log('FOnd Algo DOWn'+ moment(parseInt(bb)+(60000*60*8)).format("HH:mm"))

                        if (parseInt(topminute) == parseInt(bb)) {
                            let kelts = calcKeltData(xdata)
                            kelts.c = xdata[bb].L;
                            kelts.a = trendAlgo;
                            kelts.p = trendPrice;
                            kelts.v = xdata[bb].V;
                            kelts.xamount=xamount
                            kelts.t=bb
                            trackingRef.ref(n + "/" + xsize + 'algoSpikeDown/' + context.params.stockId + "/" + bb).set(kelts);
                            trackingRef.ref(n + "/" + xsize + 'divergence/' + context.params.stockId + "/algoSpikeDown/" + bb).set(kelts);
                            kelts.s=context.params.stockId

                            trackingRef.ref(n+"/"+xsize + 'latest/algoSpikeDown').push(kelts);

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

                } else {
                    algoDir.push(-1)


                }


                //  //console.log(priceDir)

                if (algoDir.length > 180) {

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



exports.discordCodeReceived = functions.database.ref('users/{userID}/discordCode')
    .onWrite((event, context) => {
        if (event.after._data != null) {

            let code = event.after._data
            let userId = context.auth.uid

            console.log("Discord code received")
            console.log(code)
            console.log(userId)


            oauth.tokenRequest({
                    clientId: "581025779857489920",
                    clientSecret: "TAzUSj22Yo938ssKgB9i22UkgucRN9Jq",
                    code: code,
                    scope: ["identify", "email"],
                    grantType: "authorization_code",

                    redirectUri: "https://flowtrade.com/confirmDiscord"
                }
            ).then(function (results) {


                console.log("Got Token B")
                console.log(results)

                if (results != null) {

                    let xdate = new Date().getTime();

                    xdate = parseInt(xdate) + (parseInt(results.expires_in) * 1000);
                    results.expires_at = xdate;
                    admin.database().ref('users/' + userId + "/discordToken").set(results);

                    oauth.getUser(results.access_token).then(function (userInfo) {


                        admin.database().ref('discordRef/' + userInfo.id).set(userId);
                        admin.database().ref('discordLinked/' + userInfo.id).set(userId);

                        admin.database().ref('users/' + userId + "/discordInfo").set(userInfo);
                        console.log("Got User Info")
                        console.log(userInfo)

                        admin.database().ref('users/' + userId).once("value", function (xval) {

                            if (xval.val()) {

                                admin.database().ref('makeTrialUser/' + userInfo.id).set(true);

                            } else {


                                admin.database().ref('makeTrialUser/' + userInfo.id).set(false);

                            }


                        })


//                     oauth.addMember({
//                         accessToken: results.access_token,
//                         botToken: "NTgxMDI1Nzc5ODU3NDg5OTIw.Xqsmcw.HPXIkwWt7qtiF2xnrOJdtiuTgvE",
//
//                         guildId: ,"471521558989504531",//"579903519298158603"
//                         userId: userInfo.id,
//                         //  nickname: "george michael",
//                         roles: ["697130918065733683", "693482723955966012"],
//                         //    mute: true,
//                         //   deaf: true,
// //                        scope:"identify email",
//                     }).then(console.log)


                    });


                }
            })

        }


        return false
    })

exports.rollDiscordToken = functions.database.ref('users/{userID}/rollToken').onWrite((event, context) => {
    if (event.after._data != null) {

        let refreshToken = event.after._data
        let userId = context.auth.uid

        console.log("Discord code received")
        console.log(userId)

        oauth.tokenRequest({
                clientId: "581025779857489920",
                clientSecret: "TAzUSj22Yo938ssKgB9i22UkgucRN9Jq",
                refreshToken: refreshToken,
                scope: ["identify", "email"],
                grantType: "refresh_token",

            }
        ).then(function (results) {
            console.log('GOT REFRESHED TOKEN')
            console.log(results)

            let xdate = new Date().getTime();

            xdate = parseInt(xdate) + (parseInt(results.expires_in) * 1000);
            results.expires_at = xdate;


            admin.database().ref('users/' + userId + "/discordToken").set(results);
            admin.database().ref('users/' + userId + "/rollToken").remove()
        })

    }


    return false
})


function generateToken(messageData) {

    if (!messageData.token) {
        console.log('Generating Token')

        const identity = messageData.userName;
        console.log(identity);

// Create a "grant" which enables a client to use Voice as a given user


        const videoGrant = new VideoGrant({
            room: messageData.sessionId,
        });


// Create an access token which we will sign and return to the client,
// containing the grant we just created
        const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret);
        token.addGrant(videoGrant);
        token.identity = identity;


// Serialize the token to a JWT string
        let xtoken = token.toJwt();


        console.log(xtoken)

        admin.database().ref('publicCoaching/' + messageData.sessionId + '/broadcasters/' + messageData.userId + "/token").set(xtoken)
    }

}


function generateTokenP(messageData) {

    if (!messageData.token) {
        console.log('Generating Token')
        const identity = messageData.userName;
        console.log(identity);

// Create a "grant" which enables a client to use Voice as a given user


        const videoGrant = new VideoGrant({
            room: messageData.sessionId,
        });


// Create an access token which we will sign and return to the client,
// containing the grant we just created
        const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret);
        token.addGrant(videoGrant);
        token.identity = identity;


// Serialize the token to a JWT string
        let xtoken = token.toJwt();


        console.log(xtoken)

        admin.database().ref('privateCoaching/' + messageData.sessionId + '/broadcasters/' + messageData.userId + "/token").set(xtoken)
    }

}


function generateTokenP2(messageData) {


    console.log('Generating Token')
    const identity = messageData.userName;
    console.log(identity);

// Create a "grant" which enables a client to use Voice as a given user


    const videoGrant = new VideoGrant({
        room: messageData.sessionId,
    });


// Create an access token which we will sign and return to the client,
// containing the grant we just created
    const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret);
    token.addGrant(videoGrant);
    token.identity = identity;


// Serialize the token to a JWT string
    let xtoken = token.toJwt();


    console.log(xtoken)

    admin.database().ref('screencodes/' + messageData.sessionId + '/broadcasters/' + messageData.userId + "/token").set(xtoken)


}

exports.exportUsersCSV = functions.https.onRequest((req, res) => {

    cors(req, res, () => {

        res.setHeader('Access-Control-Allow-Origin', '*');
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

        let  myUsers = req.body.myUsers;
        let   myTitles = req.body.myTitles;
        let  myAdminEmail = req.body.myAdminEmail;


        const fields = myTitles;

        let xout = myUsers

        const json2csvParser = new Parser({fields});
        const csv = json2csvParser.parse(xout);

        let fileName = 'temp.txt';
        let destination = "userExport/" + myAdminEmail + ".csv";
        const tempFilePath = path.join(os.tmpdir(), fileName);

// console.log( `Writing out to ${tempFilePath}` );
        fs.writeFileSync(tempFilePath, csv);
        let storage = admin.storage()
        storage
            .bucket()
            .upload(tempFilePath, {destination})
            .then(() => {
                fs.unlinkSync(tempFilePath)

                res.send(JSON.stringify({data: {csvLink: destination,}}))



            })
            .catch(err => console.error('ERROR inside upload: ', err));


    })
})



function sendWebNotifications(messageData) {


    admin.database().ref('users').once('value').then(
        function (xresult) {

            let xusers = xresult.val();

            for (let bee in xusers) {


                if (xusers[bee].webToken) {

                    sendWebNotify(xusers[bee].webToken, messageData.title, messageData.type)
                }


            }


            return false;
        }
    ).catch(function () {

        console.log('Failed to send push')

    })


}


function sendWebNotify(registrationToken, xMessage, xType) {

    var message = {
        data: {
            message: xMessage,
            xtype: xType
        },
        token: registrationToken
    };

// Send a message to the device corresponding to the provided
// registration token.
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });


}


function generateToken2(messageData) {

    console.log('Generating Token 2')
    const identity = messageData.userName;
    if (!messageData.token) {

        console.log(identity);

// Create a "grant" which enables a client to use Voice as a given user


        const videoGrant = new VideoGrant({
            room: messageData.sessionId,
        });


// Create an access token which we will sign and return to the client,
// containing the grant we just created
        const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret);
        token.addGrant(videoGrant);
        token.identity = identity;


// Serialize the token to a JWT string
        let xtoken = token.toJwt();
        console.log(xtoken)

        admin.database().ref('broadcasters/' + messageData.sessionId + '/' + messageData.userId + "/token").set(xtoken)
    }
    return null
}


function addFavorite(messageData) {

    console.log('Subscribe to favorite');
    console.log(messageData)
    ws.send(`{"action":"subscribe","params":"T.` + messageData + `"}`)

}


function sendBan(messageData, path) {

    if (messageData == true) {
        return admin.database().ref('stats/bannedCount').once('value').then(incrementBanned)

    }


}

function sendPush(messageData) {

    console.log('SEND PUSH');
    console.log(messageData)
    var topic = 'notifications_' + messageData.recieverKey;

    var payload = {
//        token:messageData.recieverKey,
        // token: messageData.webToken,
        //    to:messageData.webToken,
        notification: {
            //"click_action": "OPEN_ACTIVITY",
            // "sound":"default",
            // image: "https://flowtrade.com/images/FlowTrade Icon.png",
            title: messageData.title,
            body: messageData.content,
            //    "click_action": "https://flowtrade.com",
        },
        // "webpush": {
        //     "headers": {
        //         "Urgency": "high"
        //     },
        //     "notification": {
        //         'title': messageData.title,
        //         "body": messageData.content,
        //         "requireInteraction": "true",
        //         "icon": "https://flowtrade.com/images/FlowTrade Icon.png"
        //     }
        // }

    }


    admin.messaging().sendToDevice(messageData.webToken, payload)
        .then(messageSuccess)
        .catch(messageFail);


    return false


}


function sendPush2(messageData) {

    console.log('SEND PUSH 2');
    //console.log(messageData)


    // admin.messaging().send( payload)
    //     .then(messageSuccess)
    //     .catch(messageFail);
    // //

    admin
        .database()
        .ref('subscribedToChannel/' + messageData.room)
        .once('value', xval => {
            let subscriptions = xval.val()


            let xreg = []
            for (let bb in subscriptions) {
                if (subscriptions[bb] != "") {
                    var payload = {
//        token:messageData.recieverKey,
                        token: subscriptions[bb],
                        //   to:subscriptions[bb],
                        notification: {
                            //"click_action": "OPEN_ACTIVITY",
                            // "sound":"default",
                            // image: "https://flowtrade.com/images/FlowTrade Icon.png",
                            title: messageData.title,
                            body: messageData.content,
                            //    "click_action": "https://flowtrade.com",
                        },
                        "webpush": {
                            "headers": {
                                "Urgency": "high"
                            },
                            "notification": {
                                'title': messageData.title,
                                "body": messageData.content,
                                "requireInteraction": "true",
                                "icon": "https://flowtrade.com/images/FlowTrade Icon.png"
                            }
                        }

                    };
                    xreg.push(payload)
                }
            }
            //  console.log(messageData.users[bb])
            console.log(xreg)
            admin.messaging().sendAll(xreg, false)
                .then(messageSuccess)
                .catch(messageFail);


        })


//    admin.database().ref('pushGroup/' + messageData.userId).remove()

    return false


}

function incrementBanned(val) {

    console.log(val.val())
    let jamCount = parseInt(val.val()) + 1;

    console.log('Set Jam Increase' + jamCount)
    admin.database().ref('stats/bannedCount').set(jamCount)

}

function messageSuccess(response) {
    console.log("Successfully sent message:");
    console.log(response)
    return false
}

function messageFail(error) {
    console.log("Error sending message:", error);
}


exports.sendPushNotification = functions.database.ref('push/{userID}/{messageID}').onWrite(event => {
    console.log('Send Push Notification');
    console.log(event);

    if (event.after._data !== null) {
//        console.log(event.after._data.xtime)
        let push = sendPush(event.after._data)

        // if (event.after._data !== null) {
        //     let pushMe = admin.database().ref('users/' + event.after._data.userId + '/pushNotifications/' + event.after._data.xtime).once('value').then(payloadHandler).catch(messageFail);
        // }
    }

    return false

});



function hadMarketAccess(xuser){

    try {
        if (xuser.cancelTime != undefined) {


            let sU = xuser.signUpTime;

            if (new Date(sU).getDate() == 0 || new Date(sU).getDate() == 6) {

                if (new Date(xuser.cancelTime).getDate() == 0 || new Date(xuser.cancelTime).getDate() == 6) {


                    //Weekend User
                    return false;

                }


            }


            if (xuser.cancelTime - sU > (18 * 60000 * 60)) {
                return true


            } else {

                let xTime2 = new Date(sU).getHours()

                if (xTime2 > 8 && xTime2 < 16) {

                    return true

                }


                let xTime = new Date(xuser.cancelTime).getHours()

                if (xTime > 8 && xTime < 16) {

                    return true

                }


                return false;

            }


        } else {
            return true
        }

    }catch(ex){
        return true;

    }

}


async function generateCompliance(xid) {
    console.log('Got Compliance Records....')
//console.log(xid)

    let xdata = await admin.database().ref("users").once("value");
    console.log('Got User Values')

    xdata = xdata.val();
//    comps=xdata;
//    console.log(comps);

//    xdata=xusers;
    let xout = []
    for (let bb in xdata) {

        // let user = await admin.auth().getUser(bb)

        // console.log(user.metadata.creationTime)

        //xdata[bb].EffDate=
        if (bb != undefined && bb != null) {
            //    console.log('Process ' + xdata[bb].firstName)
            let cTime = ""
            if (xdata[bb].cancelTime) {

                cTime = moment(xdata[bb].cancelTime).format("LLL");
            }

            if (xdata[bb].lastSeen > xdata[bb].cancelTime) {
                xdata[bb].lastSeen = xdata[bb].cancelTime
            }

            let xCountry = "US";
            if (xdata[bb].country) {
                if (xdata[bb].country.value) {
                    xCountry = xdata[bb].country.value
                } else {
                    xCountry = xdata[bb].country
                }
            }


            let xPackage = "";

            if (xdata[bb].packageLevel == "Admin") {
                xPackage = "Admin"
            }
            let pStatus = xdata[bb].paymentStatus

            if ((xdata[bb].xpackage == "Trial" && !xdata[bb].trialComplete)) {
                pStatus = "Trial"
            }

            if (pStatus == "Free") {

                pStatus == "Legacy"

            }


            if (xdata[bb].packageLevel == "Admin") {
                xdata[bb].RPTID = "100561991"
                xdata[bb].PROCODE = "100172";
            } else {
                xdata[bb].RPTID = "100561993"
                xdata[bb].PROCODE = "100178";


            }


            let xstate = xdata[bb].state||"";

            if (xstate.length > 2) {
                xstate = xstate.substr(0, 2)
            }

            xdata[bb].VAN = bb;
            xdata[bb].PAccount = bb;
            xdata[bb].SUBNAME = xdata[bb].firstName + " " + xdata[bb].lastName;
            xdata[bb].Name1 = xdata[bb].firstName || ""
            xdata[bb].TestAccount = xdata[bb].tester || ""
            xdata[bb].Name2 = xdata[bb].lastName || ""
            xdata[bb].ADD1 = xdata[bb].address || ""
            xdata[bb].ADD2 = "";
            xdata[bb].ADD3 = "";

            if(hadMarketAccess(xdata[bb])==true){
                xdata[bb].QUANTITY = 1;

            }else {
                xdata[bb].QUANTITY = 0;
            }





            xdata[bb]["POSTAL CODE"] = xdata[bb].zip || "";
            xdata[bb].Email = xdata[bb].email || "";
            xdata[bb].State = xstate || "",
                xdata[bb].City = xdata[bb].city || "",
                xdata[bb].COUNTRY = xCountry;
            // xdata[bb].LocType = "";
            // xdata[bb].ContactLName = "";
            xdata[bb].TelNo = xdata[bb].phoneCode + " - " + xdata[bb].phoneNumber;
            xdata[bb].FaxNo = "";

            xdata[bb].SUBEFFDATE = moment(xdata[bb].signUpTime).format("YYYYMMDD");

            xdata[bb].Product = "FlowTrade Monthly";
            xdata[bb].CurrentTotal = "1";
            xdata[bb].NewTotal = "1";
            xdata[bb].ChangeQty = "0";
            xdata[bb].CancelTime = cTime;
            xdata[bb].Admin = xPackage;
            xdata[bb].PaymentStatus = xdata[bb].paymentStatus
            let xdate = new Date(parseInt(bb));


            if (xdata[bb].lastSeen) {
                xdata[bb].LastSeen = moment(xdata[bb].lastSeen).format("LLL");
            } else {
                xdata[bb].LastSeen = moment(xdata[bb].signUpTime).format("LLL");
                //if(pStatus==""||pStatus==undefined){

                xdata[bb].PaymentStatus = "Abandoned";

                //}

            }

            if (xdata[bb].cancelTime) {
                xdata[bb].PaymentStatus = "Cancelled";


            }
            xdata[bb].ExcludeFromReporting = xdata[bb].excludeFromReporting || false

            if (xdata[bb].Email != "") {
                xout.push(xdata[bb])

            }

        }


    }

//    console.log(xout)

    console.log('SHOULD Generate report now')

    const fields = ['SUBNAME', 'ADD1', 'ADD2', 'ADD3', 'City', 'State', 'POSTAL CODE', 'COUNTRY', 'VAN', 'PROCODE', 'SUBEFFDATE', 'QUANTITY', 'RPTID', 'Email', 'TelNo', 'FaxNo', 'Product', 'CurrentTotal', 'NewTotal', 'ChangeQty', 'CancelTime', "PaymentStatus", "Admin", "TestAccount", "LastSeen", "ExcludeFromReporting"];


    //converts to json csv; works only with arry of similiar items
    const json2csvParser = new Parser({fields});
    const csv = json2csvParser.parse(xout);
    //csv is the final output CSV
    console.log('Did Generate CVS')

    let fileName = 'temp.txt';
    let destination = "complianceGen/nyse" + xid + ".csv";

    const tempFilePath = path.join(os.tmpdir(), fileName);
    // console.log( `Writing out to ${tempFilePath}` );
    await fs.writeFileSync(tempFilePath, csv);
    let storage = admin.storage()

    console.log('UPLOADING...')
    storage
        .bucket()
        .upload(tempFilePath, {destination})
        .then(() => {
            fs.unlinkSync(tempFilePath)
            console.log('DID THEORETICALly uPLOAD To STORAGEE')

            admin.database().ref("generateCompliance/" + xid).set("complianceGen/nyse" + xid + ".csv")


        })
        .catch(err => console.error('ERROR inside upload: ', err));
    // });


//     var storageRef = admin.storage().ref();
// console.log('attempt to save a storage ref')
//     let ref = storageRef.child("complianceGen/nyse"+xid+".csv")
//     ref.putString(csv).then(function(snapshot) {
//         console.log('Uploaded a raw string!');
//
//         admin.database().ref("generateCompliance/"+xid).set("compliance/nyse"+xid+".csv")
//
//     });






}

//deploy this to test my changes:  firebase deploy --only functions:generateCompReport
exports.generateCompReport = functions.database.ref('generateCompliance/{messageID}').onWrite(async event => {
    console.log("on write event")

    if (event.after._data !== null) {
//        console.log(event.after._data.xtime)
        console.log('Generate Compliance Report line 790')
        // console.log(event.after)
        let xpath = event.after._path.split("/")
        xpath = xpath[xpath.length - 1]
        console.log("xpath sent to 'generateCompliance(xpath)': ", xpath)
        let push = await generateCompliance(xpath)

        // if (event.after._data !== null) {
        //     let pushMe = admin.database().ref('users/' + event.after._data.userId + '/pushNotifications/' + event.after._data.xtime).once('value').then(payloadHandler).catch(messageFail);
        // }
    }
    return false;
})


exports.sendPushNotification2 = functions.database.ref('pushGroup/{groupID}/{messageID}').onWrite(event => {
    console.log('Send Push Notification');
    console.log(event);

    if (event.after._data !== null) {
//        console.log(event.after._data.xtime)
        //  let push = sendPush2(event.after._data)

        // if (event.after._data !== null) {
        //     let pushMe = admin.database().ref('users/' + event.after._data.userId + '/pushNotifications/' + event.after._data.xtime).once('value').then(payloadHandler).catch(messageFail);
        // }
    }


    return false

});


function randomStringNumber(length) {
    let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}


exports.generateTwilioToken = functions.database.ref('publicCoaching/{userId}/broadcasters/{broadCastId}').onWrite(event => {


    console.log('Generate Twilio Token')
    console.log(event)
    if (event.after._data !== null) {
//        console.log(event.after._data.xtime)
        let push = generateToken(event.after._data)

    }
    return false
});


exports.generateTwilioTokenP = functions.database.ref('privateCoaching/{userId}/broadcasters/{broadCastId}').onWrite(event => {

    console.log('Generate Twilio Token')
    console.log(event)
    if (event.after._data !== null) {
//        console.log(event.after._data.xtime)
        let push = generateTokenP(event.after._data)

    }
    return false;
});


// exports.generateTwilioTokenP = functions.database.ref('screencodes/{sessionId}/broadcasters/{broadCastId}').onWrite(event => {
// //
// //     console.log('Generate Twilio Token')
// //     console.log(event)
// //     if (event.after._data !== null) {
// // //        console.log(event.after._data.xtime)
// //         let push = generateTokenP2(event.after._data)
// //
// //     }
// //     return false;
// // });


exports.cleanupTestUser = functions.database.ref('users/{pushId}/cancelling').onWrite((event, context) => {

    return false
    console.log("function cleanupTestUser for Selenium testing: ", context.params.pushId)


    admin.database().ref('users/' + context.params.pushId).once('value').then(function (snapshot) {
        if (snapshot != null) {

            console.log("snapshot.key: ", snapshot.key)
            if (snapshot.val().email == 'testing@flowtrade.com') {

                //if timestamp >60 minutes, then send email
                if (snapshot.cancelTime == undefined) {
                    console.log('Problem:  Selenium testing failed')

                    const msg = {
                        to: 'George@flowtrade.com',
                        from: 'noreply@flowtrade.com',
                        subject: 'last successful logon test was at ' + timestamp,
                        templateId: 'd-61de0029888941a4ab01c89d89a0431f'
                    };
                    sgMail
                        .send(msg)
                        .then(() => {
                        }, console.error);

                }
                admin.database().ref('users/' + snapshot.key).remove();
                admin.auth().deleteUser(snapshot.key)
            }
        }
    })

    return false;


})

exports.affiliateReport = functions.database.ref('triggerAffiliateReport/{pushId}').onWrite((event, context) => {

    console.log('Generate Affiliate Report')
    // console.log(event)
    if (event.after._data !== null) {
//        console.log(event.after._data.xtime)
        let push = generateAffiliateReport(context.params.pushId)

    }
    return false;
});





function sortBy(xrecords, row) {
    xrecords.sort((a, b) => (a[row] > b[row] ? 1 : -1))
    return xrecords;
}

function returnsMonthStr(val){
    switch (val){
        case 0: return "Jan"
        case 1: return "Feb"
        case 2: return "Mar"
        case 3: return "Apr"
        case 4: return "May"
        case 5: return "Jun"
        case 6: return "Jul"
        case 7: return "Aug"
        case 8: return "Sep"
        case 9: return "Oct"
        case 10: return "Nov"
        case 11: return "Dec"
    }
}

async function gotUsersAndInvoices(xusers, xInvoices) {

    console.log('Gen 1')
    let dateToday = new Date()
    let month1 = dateToday.getMonth()//0 is January
    let month2 = 0;
    let month3 = 0;
    let month4 = 0;
    let month5 = 0;
    let month6 = 0;
    let month7 = 0;

    if (month1 == 0) {
        month2 = 12
    } else {
        month2 = month1 - 1
    }
    if (month2 == 0) {
        month3 = 12
    } else {
        month3 = month2 - 1
    }
    if (month3 == 0) {
        month4 = 12
    } else {
        month4 = month3 - 1
    }
    if (month4 == 0) {
        month5 = 12
    } else {
        month5 = month4 - 1
    }
    if (month5 == 0) {
        month6 = 12
    } else {
        month6 = month5 - 1
    }
    if (month6 == 0) {
        month7 = 12
    } else {
        month7 = month6 - 1
    }

    let invoiceAmount = 0
    let invoiceDate = new Date()


    let exportedDetailedReport = []
    let detailedReportRow = {}
    let exportedSummaryReport = {}
    let summaryReportRow = {}

//    let xusers = val.val();
    let unique = {}
    let busers = []
    for (let bb in xusers) {
        busers.push(xusers[bb]);
    }

    let users = sortBy(busers, "refCode")

//GW needs: invoices from PayPal and Stripe, sync so it waits for invoices each time

    for (let bb in users) {

        let fulluser = users[bb]
        let currentAffiliateUID = ""


        //only process users with proper affiliate code - user reached ONE time
        if (fulluser.refCode != null && fulluser.refCode.length == 28&&xusers[currentAffiliateUID]) {
            //console.log(fulluser.refCode, "  <<<<")

            currentAffiliateUID = fulluser.refCode

            //Set up affiliate row for exportedSummaryReport
            //modify summaryReportRow then save it
            if (!exportedSummaryReport[currentAffiliateUID]) {
                //Console.log("1Not yet, create a row: ", xusers[currentAffiliateUID].firstName)

                summaryReportRow = {
                    affiliateFullName: xusers[currentAffiliateUID].firstName + " " + xusers[currentAffiliateUID].lastName,
                    affiliateEmail: xusers[currentAffiliateUID].email,
                    month1UsersPaidCount: 0,
                    month2UsersPaidCount: 0,
                    month3UsersPaidCount: 0,
                    month4UsersPaidCount: 0,
                    month5UsersPaidCount: 0,
                    month6UsersPaidCount: 0,
                    month7UsersPaidCount: 0,
                    month1UsersPaidAmount: 0,
                    month2UsersPaidAmount: 0,
                    month3UsersPaidAmount: 0,
                    month4UsersPaidAmount: 0,
                    month5UsersPaidAmount: 0,
                    month6UsersPaidAmount: 0,
                    month7UsersPaidAmount: 0,
                }
                exportedSummaryReport[currentAffiliateUID] = summaryReportRow
            } else {
                summaryReportRow = exportedSummaryReport[currentAffiliateUID]
            }


            invoiceAmount = 0
            //get invoice amount and date
//                if (fulluser.isPaypal != null && fulluser.isPaypal == true) {
//console.log("2",fulluser.amountPaid,"   amt paid")

            let invoiceCountDetailedReport = 0
            let affiliateName = xusers[currentAffiliateUID].firstName + " " + xusers[currentAffiliateUID].lastName
            let userName = fulluser.firstName + " " + fulluser.lastName
            let userEmail = fulluser.email
            let userSignup = (fulluser.signUpTime ? moment(fulluser.signUpTime).format("M/D/YY") : " ")
            let userCancelDate = (fulluser.cancelTime ? moment(fulluser.cancelTime).format("M/D/YY") : " ")
            let userLastSeen = (fulluser.lastSeen ? moment(fulluser.lastSeen).format("M/D/YY") : " ")


            //go through all subIDs
            for (let cc in xInvoices) {

                //main invoice object
                if (cc == fulluser.subID) {
                    //console.log('3found subid: ', cc)

                    //go through each invoice in the subID object
                    for (let dd in xInvoices[cc]) {
                        //console.log(xInvoices[cc][dd])
                        //console.log("Amount/Date:  ",xInvoices[cc][dd].amount_paid,"  ",xInvoices[cc][dd].created)
                        if (xInvoices[cc][dd].amount_paid != undefined && xInvoices[cc][dd].amount_paid != 0
                            && xInvoices[cc][dd].created != undefined && xInvoices[cc][dd].created != 0) {
                            invoiceDate = new Date(xInvoices[cc][dd].created * 1000)
                            invoiceAmount = xInvoices[cc][dd].amount_paid / 100

                            invoiceCountDetailedReport = invoiceCountDetailedReport + 1
                            detailedReportRow = {
                                affiliateName: affiliateName,
                                userName: userName,
                                userEmail: userEmail,
                                userSignup: userSignup,
                                userCancelDate: userCancelDate,
                                userLastSeen: userLastSeen,
                                userDatePaid: moment(invoiceDate).format("M/D/YY"),
                                userAmountPaid: invoiceAmount
                            }
                            exportedDetailedReport.push(detailedReportRow);

                            //console.log("4xxxx  ",moment(invoiceDate).format("LLL"))
//console.log("4xxxx  invoicedateMonth: ", invoiceDate.getMonth(),"  >> ",moment(invoiceDate).format("M/D/YY"),"   amount: ",invoiceAmount)

                            //Add to Summary Report - month1 = 0 via getMonth()
                            if (invoiceDate.getMonth() == month1) {
                                summaryReportRow.month1UsersPaidCount = summaryReportRow.month1UsersPaidCount + 1
                                summaryReportRow.month1UsersPaidAmount = summaryReportRow.month1UsersPaidAmount + invoiceAmount
                                //Console.log("     0 ", summaryReportRow.month1UsersPaidAmount)
                            } else if (invoiceDate.getMonth() == month2) {
                                summaryReportRow.month2UsersPaidCount = summaryReportRow.month2UsersPaidCount + 1
                                summaryReportRow.month2UsersPaidAmount = summaryReportRow.month2UsersPaidAmount + invoiceAmount
                                //Console.log("     1 ", summaryReportRow.month2UsersPaidAmount)
                            } else if (invoiceDate.getMonth() == month3) {
                                summaryReportRow.month3UsersPaidCount = summaryReportRow.month3UsersPaidCount + 1
                                summaryReportRow.month3UsersPaidAmount = summaryReportRow.month3UsersPaidAmount + invoiceAmount
                                //Console.log("     2 ", summaryReportRow.month3UsersPaidAmount)
                            } else if (invoiceDate.getMonth() == month4) {
                                summaryReportRow.month4UsersPaidCount = summaryReportRow.month4UsersPaidCount + 1
                                summaryReportRow.month4UsersPaidAmount = summaryReportRow.month4UsersPaidAmount + invoiceAmount
                                //Console.log("     3 ", summaryReportRow.month4UsersPaidAmount)
                            } else if (invoiceDate.getMonth() == month5) {
                                summaryReportRow.month5UsersPaidCount = summaryReportRow.month5UsersPaidCount + 1
                                summaryReportRow.month5UsersPaidAmount = summaryReportRow.month5UsersPaidAmount + invoiceAmount
                                //Console.log("     4 ", summaryReportRow.month5UsersPaidAmount)
                            } else if (invoiceDate.getMonth() == month6) {
                                summaryReportRow.month6UsersPaidCount = summaryReportRow.month6UsersPaidCount + 1
                                summaryReportRow.month6UsersPaidAmount = summaryReportRow.month6UsersPaidAmount + invoiceAmount
                                //Console.log("     5 ", summaryReportRow.month6UsersPaidAmount)
                            } else if (invoiceDate.getMonth() == month7) {
                                summaryReportRow.month7UsersPaidCount = summaryReportRow.month7UsersPaidCount + 1
                                summaryReportRow.month7UsersPaidAmount = summaryReportRow.month7UsersPaidAmount + invoiceAmount
                                //Console.log("     6 ", summaryReportRow.month7UsersPaidAmount)
                            }
                        }
                    }

                    //write a blank line
                    if (invoiceCountDetailedReport == 0) {
                        //use detailedReportRow:  Affiliate Name, User Name, User Email, signup date, cancelled date, last seen, date paid, amount paid
                        detailedReportRow = {
                            affiliateName: affiliateName,
                            userName: userName,
                            userEmail: userEmail,
                            userSignup: userSignup,
                            userCancelDate: userCancelDate,
                            userLastSeen: userLastSeen,
                            userDatePaid: " ",
                            userAmountPaid: " "
                        }
                        exportedDetailedReport.push(detailedReportRow);
                    }
                }
            }
            //done with summary report data - only save if there's an amount paid
            if (fulluser.amountPaid != null && fulluser.amountPaid != 0) {

                exportedSummaryReport[currentAffiliateUID] = summaryReportRow
            }

//            console.log( currentAffiliateUID, ",", fulluser.firstName, " ", fulluser.lastName, "  ", fulluser.paymentStatus), "  "
        }



    }//end of "Valid Ref Code for affiliate

    //
    // let writeDetailedReport = true
    // if (writeDetailedReport) {
    //     //use detailedReportRow:  Affiliate Name, User Name, User Email, signup date, cancelled date, last seen, date paid, amount paid
    //     //Write title row
    //     console.log("Affiliate Name , User Name, User Email, Signup Date, Cancelled Date, Last Seen, Paid Date, Paid Amount")
    //
    //     for (let bb in exportedDetailedReport) {
    //         console.log(exportedDetailedReport[bb].affiliateName, ",", exportedDetailedReport[bb].userName,
    //             ",", exportedDetailedReport[bb].userEmail, ",", exportedDetailedReport[bb].userSignup,
    //             ",", exportedDetailedReport[bb].userCancelDate, ",", exportedDetailedReport[bb].userLastSeen,
    //             ",", exportedDetailedReport[bb].userDatePaid, ",", exportedDetailedReport[bb].userAmountPaid)
    //     }
    // }
    //



    let output=""

    let writeSummaryReport = true
    if (writeSummaryReport) {
        //Write title row
        output=output+"Name , Email, Count in " + returnsMonthStr(month1), " , Paid "+returnsMonthStr(month1)
        +",Count in " + returnsMonthStr(month2), " , Paid "+returnsMonthStr(month2)
        +",Count in " + returnsMonthStr(month3), " , Paid "+returnsMonthStr(month3)
        +",Count in " + returnsMonthStr(month4), " , Paid "+returnsMonthStr(month4)
        +",Count in " + returnsMonthStr(month5), " , Paid "+returnsMonthStr(month5)
        +",Count in " + returnsMonthStr(month6), " , Paid "+returnsMonthStr(month6)
        +",Count in " + returnsMonthStr(month7), " , Paid "+returnsMonthStr(month7)



        for (let bb in exportedSummaryReport) {
            output=output+exportedSummaryReport[bb].affiliateFullName, ",", exportedSummaryReport[bb].affiliateEmail,
                ",", exportedSummaryReport[bb].month1UsersPaidCount, ",", exportedSummaryReport[bb].month1UsersPaidAmount,
                ",", exportedSummaryReport[bb].month2UsersPaidCount, ",", exportedSummaryReport[bb].month2UsersPaidAmount,
                ",", exportedSummaryReport[bb].month3UsersPaidCount, ",", exportedSummaryReport[bb].month3UsersPaidAmount,
                ",", exportedSummaryReport[bb].month4UsersPaidCount, ",", exportedSummaryReport[bb].month4UsersPaidAmount,
                ",", exportedSummaryReport[bb].month5UsersPaidCount, ",", exportedSummaryReport[bb].month5UsersPaidAmount,
                ",", exportedSummaryReport[bb].month6UsersPaidCount, ",", exportedSummaryReport[bb].month6UsersPaidAmount,
                ",", exportedSummaryReport[bb].month7UsersPaidCount, ",", exportedSummaryReport[bb].month7UsersPaidAmount
        }
    }



    console.log('Generating affiliate Report.....')

    let fileName = 'temp.txt';
    let destination = "affiliateReports/" + new Date().getTime() + ".csv";
    const tempFilePath = path.join(os.tmpdir(), fileName);

// console.log( `Writing out to ${tempFilePath}` );
    await fs.writeFileSync(tempFilePath, output);
    let storage = admin.storage()
    await  storage
        .bucket()
        .upload(tempFilePath, {destination})

    fs.unlinkSync(tempFilePath)
    let xtime =new Date().getTime();
    console.log('Did write affiliate Report')
    admin.database().ref('affiliateReports/'+xtime).set(destination)







}




exports.newCheckoutPage = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        console.log(req);
        console.log("Create Payment");
        //  console.log(req.body)
        res.setHeader("Access-Control-Allow-Origin", "*");
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

        // Request headers you wish to allow
        res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader("Access-Control-Allow-Credentials", true);

        let xresults = req.body;

        let isTrial = false;

        admin
            .database()
            .ref("users/" + xresults.uid)
            .set(xresults.user);

        admin
            .database()
            .ref("users/" + xresults.uid)
            .once("value")
            .then(async function (xxuser) {
                xresults.user = xxuser.val();

                console.log("DID GET NEW USER FROM BACKEND");

                let xstripe = stripe;

                let xplan = "Basic";

                if (xresults.plan == "Trial") {
                    xplan = "plan_GxxZabwYdb1JsN";
                    isTrial = true;
                }

                if (xresults.isTestCard == true) {
                    xstripe = stripetest;
                    console.log("USING TEST STRIPE CREDENTIALS");

                    //            Test Plans
                    xplan = "plan_GtE8FESGZnpwXH";
                    if (xresults.plan == "Trial") {
                        xplan = "plan_GtEWluhrqQ4YRG";
                        isTrial = true;
                    }
                }

                //refCode - affiliate FB ID
                let refCode = "";
                if (xresults.user) {
                    refCode = xresults.user.refCode || "";

                    if (xresults.user.subID) {
                        //there is an existing subscription.

                        let subscription = await xstripe.subscriptions.retrieve(xresults.user.subID);

                        console.log("YOu have an existing subscription, and its data is:" + subscription.items.data[0].status);
                        //     console.log(subscription)

                        if (subscription.items.data[0].status != "canceled") {
                            console.log("PREVENTING DUPLICATE Subscription");
                            res.send(JSON.stringify({ customerId: xresults.user.stripeID, subid: xresults.user.subID }));

                            return null;
                        }
                    }
                }

                console.log("Retrieving payment method");

                xstripe.paymentMethods.retrieve(xresults.payment_method_id, function (err, paymentMethod) {
                    // asynchronously called

                    console.log("Got Payment method");

                    xstripe.customers.create(
                        {
                            source: xresults.token.id,
                            description: xresults.uid,
                            metadata: {
                                refCode: refCode,
                                firstName: xresults.user.firstName,
                                lastName: xresults.user.lastName
                            },
                            payment_method: xresults.payment_method_id,
                            email: xresults.email,
                            name: xresults.user.firstName + " " + xresults.user.lastName,
                            invoice_settings: {
                                default_payment_method: xresults.payment_method_id,
                            },
                        },
                        async function (err, customer) {
                            if (err != null) {
                                console.log("Error Creating Customer");
                                console.log(err.message);

                                res.send(JSON.stringify({ err: err.message }));
                                return false;
                            } else {
                                console.log("Success Create Customer");
                                //  console.log(err)
                            }

                            try {
                                if (paymentMethod.card.fingerprint) {
                                    await admin
                                        .database()
                                        .ref("fingerprints/" + paymentMethod.card.fingerprint)
                                        .set(true);
                                }
                                if (xresults.user.email == "testing@flowtrade.com") {
                                    let xstring = new Date().getFullYear() + "_" + new Date().getDate() + "_" + new Date().getMonth() + "__" + new Date().getHours();

                                    await admin
                                        .database()
                                        .ref("automatedTesting/BasicFlow/" + xstring + "/paymentSuccess")
                                        .set(new Date().getTime());
                                }
                            } catch (ex) {}

                            let xobject = {
                                customer: customer.id,
                                items: [{ plan: xplan }],
                                expand: ["latest_invoice.payment_intent"],
                            };

                            if (xresults.plan == "Trial") {
                                console.log("Did Set trial period for user");

                                xobject.trial_period_days = 7;
                            }

                            if (xresults.coupon) {
                                xobject.coupon = xresults.coupon;
                            }

                            if (xresults.salesTax == true) {
                                if (xresults.isTestCard == true) {
                                    xobject.default_tax_rates = ["txr_1GQ4imD48AfiHVvUKtYi9Pqk"];
                                } else {
                                    xobject.default_tax_rates = ["txr_1GLrVjD48AfiHVvUXPBbGo7j"];
                                }
                            }

                            console.log("Time to create a payment intent::: " + customer.id);

                            let xcharge = await xstripe.charges.create({
                                amount: 100,
                                currency: "usd",
                                description: "Funnel FT PreAuth",
                                capture: false,
                                customer: customer.id,
                            });

                            console.log("XCHARGE--------------");
                            console.log(xcharge.status);

                            if (xcharge.status != "succeeded") {
                                res.send(JSON.stringify({ err: "CardInvalid" }));

                                return null;
                            }

                            console.log("Creating subscription...");

                            xstripe.subscriptions.create(xobject, function (err, subscription) {
                                if (err == null) {
                                    console.log("Created Subscription");
                                    console.log(subscription);

                                    admin
                                        .database()
                                        .ref("users/" + xresults.uid + "/paymentStatus")
                                        .set("Paid");

                                    if (xresults.plan == "yearly") {
                                        admin
                                            .database()
                                            .ref("users/" + xresults.uid + "/billingPeriod")
                                            .set("Yearly");
                                    } else {
                                        admin
                                            .database()
                                            .ref("users/" + xresults.uid + "/billingPeriod")
                                            .set("Monthly");
                                    }

                                    admin
                                        .database()
                                        .ref("users/" + xresults.uid + "/stripeID")
                                        .set(customer.id);
                                    admin
                                        .database()
                                        .ref("users/" + xresults.uid + "/subID")
                                        .set(subscription.id);
                                    admin
                                        .database()
                                        .ref("stripeSubs/" + subscription.id)
                                        .set(xresults.uid);
                                    admin
                                        .database()
                                        .ref("users/" + xresults.uid + "/trialExpires")
                                        .set(new Date().getTime() + 60000 * 60 * 24 * 7);

                                    admin
                                        .database()
                                        .ref("paymentStatus/" + xresults.uid)
                                        .set("Paid");
                                    res.send(JSON.stringify({ success: true, customerId: customer.id, subid: subscription.id }));
                                    console.log("Checking Ref:" + refCode);

                                    const msg3 = {
                                        to: xresults.user.email,
                                        from: "noreply@flowtrade.com",
                                        subject: "Welcome To FlowTrade - Subscription Initialized",
                                        templateId: "d-8119cab66d454a50898acb11d73b842c",
                                    };
                                    sgMail.send(msg3).then(() => {}, console.error);

                                    xresults.user.isTrial = true;

                                    if (xresults.plan != "Trial") {
                                        xresults.user.isTrial = false;
                                    }
                                    const msg2 = {
                                        to: "purchases@flowtrade.com",
                                        from: "noreply@flowtrade.com",
                                        subject: "New User Processed Credit Card",
                                        templateId: "d-064dc901efb04c89878f23585cc64d04",
                                        dynamic_template_data: xresults.user,
                                    };
                                    sgMail.send(msg2).then(() => {}, console.error);

                                    const msg = {
                                        to: xresults.user.email,
                                        from: "noreply@flowtrade.com",
                                        subject: "Welcome To FlowTrade - Subscription Initialized",
                                        templateId: "d-8119cab66d454a50898acb11d73b842c",
                                    };
                                    sgMail.send(msg).then(() => {}, console.error);
                                }
                            });
                        }
                    );
                });
            });
    });
    return false;
});





async function generateAffiliateReport(xId) {
    console.log('GENERATING AAA')

    let xusers = await admin.database().ref('users').once("value")

    xusers = xusers.val();

    console.log('Got Users X')

    let     xInvoices =await   admin.database().ref('invoices').once("value");
    xInvoices = xInvoices.val()
    console.log('GOt Invoices')
    await    gotUsersAndInvoices(xusers,xInvoices)


    console.log('Ok....should be done')





    // let xout = [];
    // console.log('GOT USERS X')
    // let users = val.val();
    // let unique = {}
    //
    // for (let bb in users) {
    //
    //     let fulluser = users[bb]
    //
    //     if (fulluser.refCode) {
    //         if (fulluser.refCode != "" && fulluser.refCode != "?Package=Trial" && fulluser.refCode != "?Package=Regular") {
    //
    //
    //             // console.log(fulluser.email+" "+ fulluser.refCode);
    //             let rCode = fulluser.refCode
    //             // if(fulluser.refCode.length<30){
    //
    //             if (users[fulluser.refCode]) {
    //
    //                 rCode = users[fulluser.refCode].email
    //             }
    //             if (!unique[rCode]) {
    //                 unique[rCode] = []
    //             }
    //             unique[rCode].push({
    //                 email: fulluser.email,
    //                 p: fulluser.paymentStatus || "Bailed",
    //                 signup: moment(fulluser.signUpTime).fromNow()
    //             })
    //
    //
    //             //   }
    //
    //
    //         }
    //     }
    //
    // }
    //
    //
    // for (let bb in unique) {
    //     xout.push('RefCode========================================================')
    //     xout.push(bb)
    //     xout.push('===============================================================')
    //     for (let xx in unique[bb]) {
    //         xout.push(unique[bb][xx].email + "   " + unique[bb][xx].signup + "   " + unique[bb][xx].p)
    //     }
    //
    //
    // }
    //
    //
    // admin.database().ref('triggerAffiliateReport/' + xId).remove();
    //
    //
    // let reportOutput2 = [];
    // for (let mm in xout) {
    //
    //     if (xout[mm] != undefined && xout[mm] != null) {
    //         reportOutput2.push(xout[mm])
    //     }
    //
    // }
    //
    // console.log('Should Write affiliate report.......')
    // admin.database().ref('affiliateReports/' + xId).set(reportOutput2)

    return false;


}

exports.sendWebPush = functions.database.ref('webPush/{pushId}').onWrite(event => {

    console.log('Generate Twilio Token')
    console.log(event)
    if (event.after._data !== null) {
//        console.log(event.after._data.xtime)
        let push = sendWebNotifications(event.after._data)

    }
});

//rrr
exports.banUser = functions.database.ref('webPush/{banId}/banned').onWrite(event => {

    console.log('Ban User')
    console.log(event)
    if (event.after._data !== null) {
//        console.log(event.after._data.xtime)
        sendBan(event.after._data, event.after._path)

    }
});


exports.generateTwilioToken2 = functions.database.ref('broadcasters/{userId}/{broadCastId}').onWrite(event => {

    console.log('Generate Twilio Token PRivate')
    console.log(event)
    if (event.after._data !== null) {
//        console.log(event.after._data.xtime)
        let push = generateToken2(event.after._data)

    }
});


exports.postData = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        console.log('Did recieve minute data and write to nanex');
        let xobject = JSON.parse(req.body);

        //   console.log(xobject)
        res.status(200).send("OK");

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        console.log(xtime)
        console.log(shortdate)
        for (let bb in xobject) {
            // if (bb == "eSPY") {
            let objectB = {};
//        xobject[bb].A = parseFloat(xobject[bb].A.toFixed(2));
            xobject[bb].O = parseFloat(xobject[bb].O.toFixed(2));
            xobject[bb].C = parseFloat(xobject[bb].C.toFixed(2));
            xobject[bb].L = parseFloat(xobject[bb].L.toFixed(2));
            xobject[bb].H = parseFloat(xobject[bb].H.toFixed(2));
            //  let rr ={};
            //  rr[xtime + "000"]=xobject[bb];
            //   let xb ={}
            //  xb[shortDate]=rr;
            //  output[bb.replace(".", "_").replace(".", "_").replace(".", "_")]=xb;


//console.log(xobject[bb])

            let rSymbol = bb.replace(".", "_").replace(".", "_").replace(".", "_")
            try {
                //    admin.database().ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                //       admin.database().ref('liveT/' + bb.replace(".", "_").replace(".", "_").replace(".", "_")).update(objectX);

                if (rSymbol.substr(1, 1) == "A" || rSymbol.substr(1, 1) == "B" || rSymbol.substr(1, 1) == "C" || rSymbol.substr(1, 1) == "D" || rSymbol.substr(1, 1) == "E" || rSymbol.substr(1, 1) == "F") {
                    aeRef.ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                }








                if (rSymbol.substr(1, 1) == "G" || rSymbol.substr(1, 1) == "H" || rSymbol.substr(1, 1) == "I" || rSymbol.substr(1, 1) == "J" || rSymbol.substr(1, 1) == "K" || rSymbol.substr(1, 1) == "L") {
                    flRef.ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "M" || rSymbol.substr(1, 1) == "N" || rSymbol.substr(1, 1) == "O" || rSymbol.substr(1, 1) == "P" || rSymbol.substr(1, 1) == "Q" || rSymbol.substr(1, 1) == "R" || rSymbol.substr(1, 1) == "S") {
                    msRef.ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "T" || rSymbol.substr(1, 1) == "U" || rSymbol.substr(1, 1) == "V" || rSymbol.substr(1, 1) == "W" || rSymbol.substr(1, 1) == "X" || rSymbol.substr(1, 1) == "Y" || rSymbol.substr(1, 1) == "Z") {
                    tzRef.ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                }


                if (rSymbol.substr(1, 1) == "A" ) {
                    aRef.ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "B" || rSymbol.substr(1, 1) == "C"){
                    bcRef.ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                }
                if ( rSymbol.substr(1, 1) == "D" || rSymbol.substr(1, 1) == "E" || rSymbol.substr(1, 1) == "F") {
                    deRef.ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                }

            } catch (ex) {
                console.log('ERROR ON POST')
                console.log(ex)
            }

        }


        //  admin.database().ref('nanex').update(output)

        console.log('wrote nanex...')
        return false;
    })
});
//
// exports.calc15AE = aeRef.ref('bar15/{xSymbol}/{latestID}').onWrite(async (event, context) => {
//     let results = await aeRef.ref('bar15/' + context.params.xSymbol).limitToLast(21).once("value")
//     let barData = results.val()
//
//     let updatedNode = calcKeltData(barData)
//
//     aeRef.ref('bar15/' + context.params.xSymbol + '/' + context.params.latestID).update(updatedNode)
//     return false
// })
//
//
//
// exports.calc240AE = aeRef.ref('bar240/{xSymbol}/{latestID}').onWrite(async (event, context) => {
//     let results = await aeRef.ref('bar240/' + context.params.xSymbol).limitToLast(21).once("value")
//     let barData = results.val()
//
//     let updatedNode = calcKeltData(barData)
//
//     aeRef.ref('bar240/' + context.params.xSymbol + '/' + context.params.latestID).update(updatedNode)
//     return false
// })




exports.post15 = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        console.log('Did recieve minute data and write to nanex');
        let xobject = JSON.parse(req.body);

        //   console.log(xobject)
        res.status(200).send("OK");

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        console.log(xtime)
        console.log(shortdate)
        for (let bb in xobject) {
            // if (bb == "eSPY") {
            let objectB = {};
//        xobject[bb].A = parseFloat(xobject[bb].A.toFixed(2));
            xobject[bb].O = parseFloat(xobject[bb].O.toFixed(2));
            xobject[bb].C = parseFloat(xobject[bb].C.toFixed(2));
            xobject[bb].L = parseFloat(xobject[bb].L.toFixed(2));
            xobject[bb].H = parseFloat(xobject[bb].H.toFixed(2));
            //  let rr ={};
            //  rr[xtime + "000"]=xobject[bb];
            //   let xb ={}
            //  xb[shortDate]=rr;
            //  output[bb.replace(".", "_").replace(".", "_").replace(".", "_")]=xb;


//console.log(xobject[bb])

            let rSymbol = bb.replace(".", "_").replace(".", "_").replace(".", "_")
            try {
                //    admin.database().ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                //       admin.database().ref('liveT/' + bb.replace(".", "_").replace(".", "_").replace(".", "_")).update(objectX);

                if (rSymbol.substr(1, 1) == "A" || rSymbol.substr(1, 1) == "B" || rSymbol.substr(1, 1) == "C" || rSymbol.substr(1, 1) == "D" || rSymbol.substr(1, 1) == "E" || rSymbol.substr(1, 1) == "F") {
                    aeRef.ref('bar15/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }





                if (rSymbol.substr(1, 1) == "G" || rSymbol.substr(1, 1) == "H" || rSymbol.substr(1, 1) == "I" || rSymbol.substr(1, 1) == "J" || rSymbol.substr(1, 1) == "K" || rSymbol.substr(1, 1) == "L") {
                    flRef.ref('bar15/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "M" || rSymbol.substr(1, 1) == "N" || rSymbol.substr(1, 1) == "O" || rSymbol.substr(1, 1) == "P" || rSymbol.substr(1, 1) == "Q" || rSymbol.substr(1, 1) == "R" || rSymbol.substr(1, 1) == "S") {
                    msRef.ref('bar15/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "T" || rSymbol.substr(1, 1) == "U" || rSymbol.substr(1, 1) == "V" || rSymbol.substr(1, 1) == "W" || rSymbol.substr(1, 1) == "X" || rSymbol.substr(1, 1) == "Y" || rSymbol.substr(1, 1) == "Z") {
                    tzRef.ref('bar15/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "A" ) {
                    aRef.ref('bar15/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "B" || rSymbol.substr(1, 1) == "C"){
                    bcRef.ref('bar15/' + rSymbol + '/'+ xtime + "000").set(xobject[bb]);
                }
                if ( rSymbol.substr(1, 1) == "D" || rSymbol.substr(1, 1) == "E" || rSymbol.substr(1, 1) == "F") {
                    deRef.ref('bar15/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }


            } catch (ex) {
                console.log('ERROR ON POST')
                console.log(ex)
            }

        }


        //  admin.database().ref('nanex').update(output)

        console.log('wrote nanex...')
        return false;
    })

});


exports.post240 = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        console.log('Did recieve minute data and write to nanex');
        let xobject = JSON.parse(req.body);

        //   console.log(xobject)
        res.status(200).send("OK");

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        console.log(xtime)
        console.log(shortdate)
        for (let bb in xobject) {
            // if (bb == "eSPY") {
            let objectB = {};
//        xobject[bb].A = parseFloat(xobject[bb].A.toFixed(2));
            xobject[bb].O = parseFloat(xobject[bb].O.toFixed(2));
            xobject[bb].C = parseFloat(xobject[bb].C.toFixed(2));
            xobject[bb].L = parseFloat(xobject[bb].L.toFixed(2));
            xobject[bb].H = parseFloat(xobject[bb].H.toFixed(2));
            //  let rr ={};
            //  rr[xtime + "000"]=xobject[bb];
            //   let xb ={}
            //  xb[shortDate]=rr;
            //  output[bb.replace(".", "_").replace(".", "_").replace(".", "_")]=xb;


//console.log(xobject[bb])

            let rSymbol = bb.replace(".", "_").replace(".", "_").replace(".", "_")
            try {
                //    admin.database().ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                //       admin.database().ref('liveT/' + bb.replace(".", "_").replace(".", "_").replace(".", "_")).update(objectX);

                if (rSymbol.substr(1, 1) == "A" || rSymbol.substr(1, 1) == "B" || rSymbol.substr(1, 1) == "C" || rSymbol.substr(1, 1) == "D" || rSymbol.substr(1, 1) == "E" || rSymbol.substr(1, 1) == "F") {
                    aeRef.ref('bar240/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "G" || rSymbol.substr(1, 1) == "H" || rSymbol.substr(1, 1) == "I" || rSymbol.substr(1, 1) == "J" || rSymbol.substr(1, 1) == "K" || rSymbol.substr(1, 1) == "L") {
                    flRef.ref('bar240/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "M" || rSymbol.substr(1, 1) == "N" || rSymbol.substr(1, 1) == "O" || rSymbol.substr(1, 1) == "P" || rSymbol.substr(1, 1) == "Q" || rSymbol.substr(1, 1) == "R" || rSymbol.substr(1, 1) == "S") {
                    msRef.ref('bar240/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "T" || rSymbol.substr(1, 1) == "U" || rSymbol.substr(1, 1) == "V" || rSymbol.substr(1, 1) == "W" || rSymbol.substr(1, 1) == "X" || rSymbol.substr(1, 1) == "Y" || rSymbol.substr(1, 1) == "Z") {
                    tzRef.ref('bar240/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }


            } catch (ex) {
                console.log('ERROR ON POST')
                console.log(ex)
            }

        }


        //  admin.database().ref('nanex').update(output)

        console.log('wrote nanex...')
        return false;
    })

});


exports.calc15AE = aeSpike.ref('bar15/{xSymbol}/{latestID}').onWrite(async (event, context) => {
    let results = await aeRef.ref('bar15/' + context.params.xSymbol).limitToLast(21).once("value")
    let barData = results.val()

    let updatedNode = await calcKeltData(barData)

    aeRef.ref('bar15/' + context.params.xSymbol + '/' + context.params.latestID).update(updatedNode)
    return false
})



exports.post15 = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        console.log('Did recieve minute data and write to nanex');
        let xobject = JSON.parse(req.body);

        //   console.log(xobject)
        res.status(200).send("OK");

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        console.log(xtime)
        console.log(shortdate)
        for (let bb in xobject) {
            // if (bb == "eSPY") {
            let objectB = {};
//        xobject[bb].A = parseFloat(xobject[bb].A.toFixed(2));
            xobject[bb].O = parseFloat(xobject[bb].O.toFixed(2));
            xobject[bb].C = parseFloat(xobject[bb].C.toFixed(2));
            xobject[bb].L = parseFloat(xobject[bb].L.toFixed(2));
            xobject[bb].H = parseFloat(xobject[bb].H.toFixed(2));
            //  let rr ={};
            //  rr[xtime + "000"]=xobject[bb];
            //   let xb ={}
            //  xb[shortDate]=rr;
            //  output[bb.replace(".", "_").replace(".", "_").replace(".", "_")]=xb;


//console.log(xobject[bb])

            let rSymbol = bb.replace(".", "_").replace(".", "_").replace(".", "_")
            try {
                //    admin.database().ref('nanex/' + rSymbol + '/' + shortdate + '/' + xtime + "000").set(xobject[bb]);
                //       admin.database().ref('liveT/' + bb.replace(".", "_").replace(".", "_").replace(".", "_")).update(objectX);

                if (rSymbol.substr(1, 1) == "A" || rSymbol.substr(1, 1) == "B" || rSymbol.substr(1, 1) == "C" || rSymbol.substr(1, 1) == "D" || rSymbol.substr(1, 1) == "E" || rSymbol.substr(1, 1) == "F") {
                    aeRef.ref('bar15/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "G" || rSymbol.substr(1, 1) == "H" || rSymbol.substr(1, 1) == "I" || rSymbol.substr(1, 1) == "J" || rSymbol.substr(1, 1) == "K" || rSymbol.substr(1, 1) == "L") {
                    flRef.ref('bar15/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "M" || rSymbol.substr(1, 1) == "N" || rSymbol.substr(1, 1) == "O" || rSymbol.substr(1, 1) == "P" || rSymbol.substr(1, 1) == "Q" || rSymbol.substr(1, 1) == "R" || rSymbol.substr(1, 1) == "S") {
                    msRef.ref('bar15/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }

                if (rSymbol.substr(1, 1) == "T" || rSymbol.substr(1, 1) == "U" || rSymbol.substr(1, 1) == "V" || rSymbol.substr(1, 1) == "W" || rSymbol.substr(1, 1) == "X" || rSymbol.substr(1, 1) == "Y" || rSymbol.substr(1, 1) == "Z") {
                    tzRef.ref('bar15/' + rSymbol + '/' + xtime + "000").set(xobject[bb]);
                }


            } catch (ex) {
                console.log('ERROR ON POST')
                console.log(ex)
            }

        }


        //  admin.database().ref('nanex').update(output)

        console.log('wrote nanex...')
        return false;
    })

});


exports.postBlockData = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing block')


        let xobject = JSON.parse(req.body);

        //console.log(xobject)

        //
        //
        // let output = {};
        // let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        // let xstring = "";

        let xtime = req.query.timestamp;

        for (let bb in xobject) {
            let xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_")

            if (xobject[bb].trades.length > 0) {

                for (let bx in xobject[bb].trades) {
                    xobject[bb].trades[bx].t = xtime + "000"
                    xobject[bb].trades[bx].Sy = xstring
                    blocks.ref("Symbol/" + xstring).push(xobject[bb].trades[bx]);


                    blocks.ref("latest/").push(xobject[bb].trades[bx]);

                    for (let br = 1; br < 50; br++) {
                        let xbit = br * 10;
                        if (xobject[bb].trades[bx].P > xbit) {
                            console.log('Block post above' + xbit)
                            blocks.ref("latestByPrice/" + xbit).push(xobject[bb].trades[bx]);
                        }

                    }


                    if (xobject[bb].trades[bx].S > 500000) {

                        blocks.ref("latest500000/").push(xobject[bb].trades[bx]);
                        //    blocks.ref("Symbol2/" + xstring + "/" + xtime + "000").push(xobject[bb].trades[bx]);

                        for (let br = 1; br < 50; br++) {
                            let xbit = br * 10;
                            console.log('Block post above' + xbit)

                            if (xobject[bb].trades[bx].P > xbit) {
                                blocks.ref("latest500000ByPrice/" + xbit).push(xobject[bb].trades[bx]);
                            }

                        }
                    }


                }


            }

        }


        //admin.database().ref('liveTick/').update(output);
        //   blocks.ref().add(output);


//    console.log('wrote nanex...')
        return false;
    })
});


exports.postOptionsReport = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing optionsFlow----------------------------------------')


        let xobject = JSON.parse(req.body);
        console.log(xobject)
        let outobject = {}
        let currentSymbol = "";
        let xcount = 0;
        let lastPrice = 0;


        for (let c in xobject) {
            let rSymbol = xobject[c].sym.replace("o", "e");

            if (rSymbol != currentSymbol) {

                currentSymbol = rSymbol
                if (xcount != 0) {
                    console.log('INCREMENTAL WRITEEE' + currentSymbol)
                    options.ref("dailyValues/" + currentSymbol).update(outobject);
                }

                outobject = {}
                xcount = 0


                if (
                    rSymbol.substr(1, 1) == 'A' ||
                    rSymbol.substr(1, 1) == 'B' ||
                    rSymbol.substr(1, 1) == 'C' ||
                    rSymbol.substr(1, 1) == 'D' ||
                    rSymbol.substr(1, 1) == 'E' ||
                    rSymbol.substr(1, 1) == 'F'
                ) {

                    lastPrice = await livetickae.ref('liveTick/' + rSymbol + "/C").once("value")
                    lastPrice = lastPrice.val()

                }

                if (
                    rSymbol.substr(1, 1) == 'G' ||
                    rSymbol.substr(1, 1) == 'H' ||
                    rSymbol.substr(1, 1) == 'I' ||
                    rSymbol.substr(1, 1) == 'J' ||
                    rSymbol.substr(1, 1) == 'K' ||
                    rSymbol.substr(1, 1) == 'L'
                ) {
                    //   //////console.log('FL Database')
                    lastPrice = await livetickfl.ref('liveTick/' + rSymbol + "/C").once("value")
                    lastPrice = lastPrice.val()

                }

                if (
                    rSymbol.substr(1, 1) == 'M' ||
                    rSymbol.substr(1, 1) == 'N' ||
                    rSymbol.substr(1, 1) == 'O' ||
                    rSymbol.substr(1, 1) == 'P' ||
                    rSymbol.substr(1, 1) == 'Q' ||
                    rSymbol.substr(1, 1) == 'R' ||
                    rSymbol.substr(1, 1) == 'S'
                ) {
                    //  //////console.log('MS Database')

                    lastPrice = await livetickms.ref('liveTick/' + rSymbol + "/C").once("value")
                    lastPrice = lastPrice.val()

                }

                if (
                    rSymbol.substr(1, 1) == 'T' ||
                    rSymbol.substr(1, 1) == 'U' ||
                    rSymbol.substr(1, 1) == 'V' ||
                    rSymbol.substr(1, 1) == 'W' ||
                    rSymbol.substr(1, 1) == 'X' ||
                    rSymbol.substr(1, 1) == 'Y' ||
                    rSymbol.substr(1, 1) == 'Z'
                ) {
                    lastPrice = await liveticktz.ref('liveTick/' + rSymbol + "/C").once("value")
                    lastPrice = lastPrice.val()


                }


            }
            let xTime = ((60000 * 60 * 24 * 200) + new Date(xobject[c].ex.replace("_", "-").replace("_", "-")).getTime()) - new Date().getTime()

            let oneYear = 60000 * 60 * 24 * 365;

            xTime = parseFloat(xTime / oneYear).toFixed(2)

            let putCall = "call"
            if (xobject[c].xType == 1) {
                putCall = "put"
            }
            let xiv = iv.getImpliedVolatility(xobject[c].SPOT, lastPrice, xobject[c].SP, xTime, .0015, putCall); // 0.11406250000000001 (11.4%)


            //     console.log('DID GET LATEST PRICE FOR '+rSymbol+":"+lastPrice)
            // console.log(xiv)

            outobject[xobject[c].SP + "_" + xobject[c].ex] = parseFloat(xiv).toFixed(3);
            console.log(xcount)
            xcount = xcount + 1
        }

        console.log('FINAL WRITE ' + currentSymbol)
        options.ref("dailyValues/" + currentSymbol).update(outobject);

        /// options.ref("dailyReport").update(outobject);

    })
})


exports.postOptionsFlow = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing optionsFlow')


        let xobject = JSON.parse(req.body);
        console.log(xobject)
        let shortdate = req.query.shortdate;
        // let xstring = "";

        let xtime = req.query.timestamp;
        for (let symbol in xobject) {
            options.ref("putcall/" + symbol + "/" + shortdate + "/" + xtime + '000').set(xobject[symbol]);
        }
        options.ref("putcallAccumulated").update(xobject);

    })
})
exports.postOptionData = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing options')


        let xobject = JSON.parse(req.body);

        // console.log(xobject)
        let xresults = {sweeps: 0, blocks: 0};
        //
        //
        // let output = {};
        // let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        // let xstring = "";

        let xtime = req.query.timestamp;

        for (let bb in xobject) {
            let xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_")

            if (xobject[bb].options.length > 0) {

                for (let bx in xobject[bb].options) {
                    console.log('Should write option data..')
                    xobject[bb].options[bx].t = xtime + "000"
                    options.ref("S/All/" + xstring).push(xobject[bb].options[bx]);
                    options.ref("latestAll/").push(xobject[bb].options[bx]);


                    if (xobject[bb].options[bx].C == "Sweep") {
                        options.ref("S/Sweep/" + xstring).push(xobject[bb].options[bx]);
                        xresults.sweeps = xresults.sweeps + 1;
                        options.ref("latestSweep/").push(xobject[bb].options[bx]);
                    }
                    if (xobject[bb].options[bx].C == "Block") {
                        options.ref("S/Block/" + xstring).push(xobject[bb].options[bx]);
                        xresults.blocks = xresults.blocks + 1;
                        options.ref("latestBlock/").push(xobject[bb].options[bx]);
                    }


                }
            } else {
                console.log("Option Not long enough")
            }

        }

        let wTime = moment(parseInt(xtime + "000")).format("HH:mm")
        console.log('Wrote Option Data For ' + wTime)
        console.log(xresults)

        //admin.database().ref('liveTick/').update(output);
        //   blocks.ref().add(output);


//    console.log('wrote nanex...')
        return false;
    })
});


exports.postLiveAE = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing live')


        let xobject = JSON.parse(req.body);

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        let xstring = "";
        for (let bb in xobject) {
            xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_").replace("/", "_")
            output[xstring] = xobject[bb]
            if (xobject[bb].MO == 0) {
                delete output[xstring].MO
            }

        }


        //admin.database().ref('liveTick/').update(output);
        livetickae.ref('liveTick/').update(output);


//    console.log('wrote nanex...')
        return false;
    })
});


exports.postLiveFL = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing live')


        let xobject = JSON.parse(req.body);

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        let xstring = "";
        for (let bb in xobject) {
            xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_").replace("/", "_")
            if (bb.indexOf("GDI") == -1) {

                output[xstring] = xobject[bb]
                if (xobject[bb].MO == 0) {
                    delete output[xstring].MO
                }
            }
        }


        //admin.database().ref('liveTick/').update(output);
        livetickfl.ref('liveTick/').update(output);


//    console.log('wrote nanex...')
        return false;
    })
});
exports.postLiveMS = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing live')


        let xobject = JSON.parse(req.body);

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        let xstring = "";
        for (let bb in xobject) {
            xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_").replace("/", "_")
            output[xstring] = xobject[bb]
            if (xobject[bb].MO == 0) {
                delete output[xstring].MO
            }

        }


        //admin.database().ref('liveTick/').update(output);
        livetickms.ref('liveTick/').update(output);


//    console.log('wrote nanex...')
        return false;
    })
});
exports.postLiveTZ = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing live')


        let xobject = JSON.parse(req.body);

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        let xstring = "";
        for (let bb in xobject) {
            xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_").replace("/", "_")
            output[xstring] = xobject[bb]
            if (xobject[bb].MO == 0) {
                delete output[xstring].MO
            }

        }


        //admin.database().ref('liveTick/').update(output);
        liveticktz.ref('liveTick/').update(output);


//    console.log('wrote nanex...')
        return false;
    })
});


exports.postLiveAE2 = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing live')


        let xobject = JSON.parse(req.body);

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        let xstring = "";
        for (let bb in xobject) {
            xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_").replace("/", "_")
            output[xstring] = xobject[bb]
            if (xobject[bb].MO == 0) {
                delete output[xstring].MO
            }

        }


        //admin.database().ref('liveTick/').update(output);
        livetickae.ref('liveTick/').update(output);


//    console.log('wrote nanex...')
        return false;
    })
});


exports.postLiveFL2 = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing live')


        let xobject = JSON.parse(req.body);

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        let xstring = "";
        for (let bb in xobject) {
            xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_").replace("/", "_")
            if (bb.indexOf("GDI") == -1) {

                output[xstring] = xobject[bb]
                if (xobject[bb].MO == 0) {
                    delete output[xstring].MO
                }
            }
        }


        //admin.database().ref('liveTick/').update(output);
        livetickfl.ref('liveTick/').update(output);


//    console.log('wrote nanex...')
        return false;
    })
});
exports.postLiveMS2 = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing live')


        let xobject = JSON.parse(req.body);

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        let xstring = "";
        for (let bb in xobject) {
            xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_").replace("/", "_")
            output[xstring] = xobject[bb]
            if (xobject[bb].MO == 0) {
                delete output[xstring].MO
            }

        }


        //admin.database().ref('liveTick/').update(output);
        livetickms.ref('liveTick/').update(output);


//    console.log('wrote nanex...')
        return false;
    })
});
exports.postLiveTZ2 = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        //console.log('Did recieve minute data and write to nanex');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.status(200).send("OK");
        console.log('processing live')


        let xobject = JSON.parse(req.body);

        let output = {};
        let xtime = req.query.timestamp;
        let shortdate = req.query.shortdate;
        let xstring = "";
        for (let bb in xobject) {
            xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_").replace("/", "_")
            output[xstring] = xobject[bb]
            if (xobject[bb].MO == 0) {
                delete output[xstring].MO
            }

        }


        //admin.database().ref('liveTick/').update(output);
        liveticktz.ref('liveTick/').update(output);


//    console.log('wrote nanex...')
        return false;
    })
});


exports.postMovers = functions.https.onRequest((req, res) => {

    //console.log('Did recieve minute data and write to nanex');
    let xobject = JSON.parse(req.body);

    res.status(200).send("OK");

    let output = {};
    let xtime = req.query.timestamp;
    let shortdate = req.query.shortdate;


    let xstring = "";
    for (let bb in xobject) {

        xstring = bb.replace(".", "_").replace(".", "_").replace(".", "_")
        output[xstring] = xobject[bb]

    }


    admin.database().ref('movers/' + shortdate + "/" + xtime + "000").set(output);


//    console.log('wrote nanex...')
    return false;

});


exports.postScans = functions.https.onRequest((req, res) => {

    //console.log('Did recieve minute data and write to nanex');
    console.log('Did Recieve scans ')
    let xobject = req.body
    console.log(req.body)
    let output = {};

// let xcount=0;
//     //xobject=xobject.substr(1,xobject.length-1);
    for (let bb in xobject) {

        let recordB = bb

        console.log('Did Find Record----------------------------')
        console.log(recordB);

        if (recordB.indexOf("~~") != -1) {

            let xitems = recordB.split("~~")
            for (let ff in xitems) {
                //    console.log(xitems[ff])
                if (xitems[ff].indexOf("||") != -1) {

                    let xbits = xitems[ff].split("||")
                    if (xbits[7]) {
                        xbits[0] = xbits[0].replace("/", "_")
                        xbits[0] = xbits[0].replace(".", "_")
                        let outbox = {
                            t: xbits[0],
                            d: xbits[1],
                            bullT: xbits[2],
                            bullS: xbits[3],
                            bearT: xbits[4],
                            bearS: xbits[5],
                            b: xbits[6],
                            da: xbits[7],

                        }
//console.log(outbox)

                        output[xbits[0]] = outbox;
                    }
                }


            }

        }


    }


//xobject=JSON.parse(xobject);
    res.status(200).send("OK");
    // console.log(xobject);
    let xtime = new Date().getTime().toString()

    admin.database().ref('scans/' + xtime).set(output);
//    console.log('wrote nanex...')
    return false;

});



exports.postScansTest = functions.https.onRequest((req, res) => {

    //console.log('Did recieve minute data and write to nanex');
    console.log('Did Recieve scans ')
    let xobject = req.body
    console.log(req.body)
    let output = [];
    let foundIt = false


    if(JSON.stringify(req.body).indexOf("TracksTheid!0t")!=-1){
        console.log('DID FIND PASSCODE')
    }else{
        return null;
    }
//     for (let bb in xobject) {
//         if(bb.indexOf("NewOrleansSucks")!=-1){
// console.log('DID FIND PASSCODE')
//         }
//
//     }
// if(foundIt==false){
//     return null;
// }

// let xcount=0;
//     //xobject=xobject.substr(1,xobject.length-1);
    for (let bb in xobject) {

        let recordB = bb

        // console.log('Did Find Record----------------------------')
//        console.log(recordB);

        if (recordB.indexOf("~~") != -1) {

            //per Mike on 11/13/20, just these columns...
            let xitems = recordB.split("~~")
            for (let ff in xitems) {
                //   console.log(xitems[ff])
                if (xitems[ff].indexOf("||") != -1) {

                    let xbits = xitems[ff].split("||")
                    // console.log('LENGTH OF RECORD' + xbits.length)
                    if (xbits[3]!=undefined) {
                        xbits[0] = xbits[0].replace("/", "_")
                        xbits[0] = xbits[0].replace(".", "_")
                        let outbox = {
                            t: xbits[0],
                            // d:xbits[1],
                            b: xbits[1],
                            ty: xbits[3],
                            d:xbits[2]
                            //there'll be a 1 or zero for top or bottom

                        }
//console.log(xbits[0])

                        output.push(outbox);
                    }else{

                        console.log('Rejected')
                    }
                }


            }

        }


    }


//xobject=JSON.parse(xobject);
    res.status(200).send("OK");
    // console.log(xobject);
    let xtime = new Date().getTime().toString()
//console.log("OUTPUT")
    //  console.log(output)

    admin.database().ref('scansTest/' + xtime).set(output);
//    console.log('wrote nanex...')
    return false;

});


exports.postScans2 = functions.https.onRequest((req, res) => {

    //console.log('Did recieve minute data and write to nanex');
    console.log('Did Recieve scans ')
    let xobject = req.body
    console.log(req.body)
    let output = {};
    let foundIt = false
//     for (let bb in xobject) {
        if(JSON.stringify(req.body).indexOf("TracksTheid!0t")!=-1){
console.log('DID FIND PASSCODE')
        }else{
            return null;
        }
//
//     }
// if(foundIt==false){
//     return null;
// }

// let xcount=0;
//     //xobject=xobject.substr(1,xobject.length-1);
    for (let bb in xobject) {

        let recordB = bb

        // console.log('Did Find Record----------------------------')
//        console.log(recordB);

        if (recordB.indexOf("~~") != -1) {

            //per Mike on 11/13/20, just these columns...
            let xitems = recordB.split("~~")
            for (let ff in xitems) {
                //   console.log(xitems[ff])
                if (xitems[ff].indexOf("||") != -1) {

                    let xbits = xitems[ff].split("||")
                    // console.log('LENGTH OF RECORD' + xbits.length)
                    if (xbits[10]) {
                        xbits[0] = xbits[0].replace("/", "_")
                        xbits[0] = xbits[0].replace(".", "_")
                        let outbox = {
                            t: xbits[0],
                            d: xbits[1],
                            bullT: xbits[2],//out
                            bullS: xbits[3],//out
                            bearT: xbits[4],//out
                            bearS: xbits[5],//out
                            b: xbits[6],
                            da: xbits[7],
                            c: xbits[8],
                            h: xbits[9],
                            ty: xbits[10],
                            //there'll be a 1 or zero for top or bottom

                        }
//console.log(outbox)

                        output[xbits[0]] = outbox;
                    }
                }


            }

        }


    }


//xobject=JSON.parse(xobject);
    res.status(200).send("OK");
    // console.log(xobject);
    let xtime = new Date().getTime().toString()

    admin.database().ref('scans2/' + xtime).set(output);
//    console.log('wrote nanex...')
    return false;

});

exports.postScans3 = functions.https.onRequest((req, res) => {
    /*
        1.  Load the current file
        2.  Load the new file
        3.  Scan the new file for each "Type".
            If there's one, then
                delete all the similiar type in the current file
        4.  Add all to the current file with push
        5.  Save file...


        Need to revise the loading on the scancontent2.js file
         */

    let postScans3CL = 101

    //console.log('Did recieve minute data and write to nanex');
    let xReq_Body = req.body
    console.log(postScans3CL + .1, 'Did Recieve Excel Request: ', xReq_Body)


//    let foundIt = false
//     for (let bb in xReq_Body) {
//         if(bb.indexOf("NewOrleansSucks")!=-1){
// console.log('DID FIND PASSCODE')
//         }
//     }
// if(foundIt==false){
//     return null;
// }
    let updateType = {}
    updateType._4H = false
    updateType._W = false
    updateType._D = false
    updateType._M = false
    updateType.W_4H = false
    updateType.W_W = false
    updateType.W_D = false
    updateType.W_M = false

    let output = {};
    let todayDate = new Date().getTime()

    //get the object
    let objectToSplit = ''
    for (let bb in xReq_Body) {

        objectToSplit = bb
    }

    let counter = 0

//console.log('objectToSplit: ',objectToSplit)
    if (objectToSplit.indexOf("~~") != -1) {
        //console.log('ready to split ')

        let xSubStrings = objectToSplit.split("~~")//however many rows of scan data
        for (let bb in xSubStrings) {
            //valid row
            if (xSubStrings[bb].indexOf("||") != -1) {

                let rowArray = xSubStrings[bb].split("||")
                //console.log( rowArray)
                if (rowArray[3]) {
                    counter = counter + 1
                    //console.log("it took")
                    let ScanNodeForTicker = {
                        ticker: rowArray[0],
                        description: rowArray[1],
                        top_Bot: parseInt(rowArray[2]),
                        type: rowArray[3],
                        uploadDate: todayDate,

                        //there'll be a 1 or zero for top or bottom

                    }

                    switch (rowArray[3]) {
                        case "4H":
                            updateType._4H = true;
                            break
                        case "D":
                            updateType._D = true;
                            break
                        case "W":
                            updateType._W = true;
                            break
                        case "M":
                            updateType._M = true;
                            break
                        case "W4H":
                            updateType._W4H = true;
                            break
                        case "WD":
                            updateType._WD = true;
                            break
                        case "WW":
                            updateType._WW = true;
                            break
                        case "WM":
                            updateType._WM = true;
                            break
                    }

//console.log(ScanNodeForTicker)

                    output[counter.toString()] = ScanNodeForTicker;
                    /*                    output[rowArray[0]+"--"+rowArray[3]] = ScanNodeForTicker;*/
                }
            }


        }

    }


    //Get existing file
    admin.database().ref('scans3').limitToLast(1).once('value', xval => {
        let existingScans3 = xval.val()


        //Delete any existing scans if updateType = true
        for (let bb in existingScans3) {
            let thisResult = existingScans3[bb]

            for (let cc in thisResult) {
                let thisScanRow = thisResult[cc]
                //if updateType <> true, then add to output
                if (updateType['_' + thisScanRow.type] == false) {
                    counter = counter + 1
                    thisScanRow.uploadDate = todayDate
                    output[counter.toString()] = thisScanRow;
                    console.log(postScans3CL + .2, ' added ', thisScanRow)
                }

                console.log(postScans3CL + .2, thisResult[cc])
            }

        }


        //console.log("updateType: ",updateType)

//objectToSplit=JSON.parse(objectToSplit);
        res.status(200).send("OK");
        // console.log(objectToSplit);
        let xtime = new Date().getTime().toString()

        admin.database().ref('scans3/' + xtime).set(output);
//    console.log(postScans3CL+.1,'wrote nanex...')
        return false;
    })
});

exports.scheduledPopular = functions.pubsub.schedule('every 1 minutes').onRun((context) => {

    admin
        .database()
        .ref('favorites')
        .once('value', gotFavs);

    admin
        .database()
        .ref('mySymbols')
        .once('value',gotMySymbols);

})


function gotFavs(xval){
xval=xval.val()

    let unique={}

    for(let bb in xval){
for(let xx in xval[bb]) {

    if (xval[bb][xx].name) {
        if (unique[xval[bb][xx].name]) {
            unique[xval[bb][xx].name].count = unique[xval[bb][xx].name].count + 1;
        } else {
            unique[xval[bb][xx].name] = {count: 1, sym: xval[bb][xx].name}
        }

    }
}
    }


    let results =Object.values(unique)

    results= sortByB(results,"count")


    results.length = 30;




     trackingRef.ref('topFavs').set(results)


    console.log(JSON.stringify(results))

}




function sortByB(xrecords, row) {
    xrecords.sort((a, b) => (a[row] < b[row] ? 1 : -1))
    return xrecords;
}

function gotMySymbols(xval){
    xval=xval.val()

    let unique={}


    for(let bb in xval){
        for(let xx in xval[bb]){


            if(unique[xx]){
                unique[xx].count=unique[xx].count+1;
            }else{
                unique[xx]={count:1,sym:xx}
            }

        }

    }


    let results =Object.values(unique)

results= sortByB(results,"count")


    results.length = 30;




    trackingRef.ref('topSymbols').set(results)


    console.log(JSON.stringify(results))


}




//rrr
exports.scheduledFunction = functions.pubsub.schedule('every 1 hours').onRun((context) => {
    console.log('This will be run every Hour!');




    let xdate = new Date().getHours()

    // if(xdate==22) {
    //
    //     admin
    //         .database()
    //         .ref('triggerAuditReport/' + new Date().getTime())
    //         .set(true)
    //
    // }
    //
    if(xdate==21) {
        admin
            .database()
            .ref('users')
            .once('value', backUsers);

    }
    // admin
    //     .database()
    //     .ref('chargeFailed')
    //     .once('value', checkFailedTime);
    //
    //
    admin
        .database()
        .ref('futureCancel')
        .once('value', processFutureCancels);

    //AWS server time:  7:45 PM = 2:45 PM EST...
    //for 1 AM EST time, need 6 AM server time

    //
    // admin
    //     .database()
    //     .ref('users')
    //     .once('value', hourlyCleanup);
    //

    return null;
});




exports.processFutureCancel = functions.database.ref('users/{uid}/futureCancel')
    .onWrite(async (event, context) => {


        console.log('process future cancel-------------------')
        //let dateFirstExtended = event.after._data
        let uid = context.params.uid

        admin.database().ref('users/' + uid).once('value').then(
            async function (xuser) {




                if (xuser.subID) {

                    stripe.subscriptions.del(
                        xuser.subID,
                        function (err, confirmation) {
                            console.log('stripe cancelled via future', xuser.subID)
                            console.log("confirmation: ", confirmation)
                            console.log(err)

                            if (confirmation == null) {
                                stripetest.subscriptions.del(
                                    xuser.subID,
                                    function (err, confirmation) {
                                        console.log('stripe cancelled via future ', xuser.subID)
                                        console.log("confirmation: ", confirmation)
                                        console.log(err)
                                    }
                                );

                            }
                        }
                    );


                }





                return false
            })




        return false

    })


//user cancelled but still has time left on his subscription
function processFutureCancels(cancels) {

    console.log('Processing Future Cancels')
//    console.log(cancels)
    cancels = cancels.val()


    let xtime = new Date().getTime()
    for (let bb in cancels) {
        if (parseInt(cancels[bb]) < xtime) {

            console.log('Did Cancel ' + bb)

            admin
                .database()
                .ref()
                .child('users/' + bb + '/cancelling')
                .set(bb)
            admin
                .database()
                .ref()
                .child('users/' + bb + '/paymentStatus')
                .set("Cancelled")
admin.database() .ref()
    .child('cancelConfirmation/' + bb)
    .set(false)
            admin
                .database()
                .ref()
                .child('futureCancelDone/' + bb).set(true)
            admin
                .database()
                .ref()
                .child('futureCancel/' + bb).remove();
        }


    }


}


function checkFailedTime(xval) {

    let xdate = new Date().getTime()
    xdate = xdate - (60000 * 60 * 48)
    xval = xval.val();

    for (let bb in xval) {
        if (xval[bb] < xdate) {

            //
            admin
                .database()
                .ref('chargeFailed/' + bb).remove();

            admin
                .database()
                .ref('users/' + bb + '/cancelling').set(bb)


        }


    }


}


function hourlyCleanup(xdata) {
    /*
    List of cleanup
    user/uid/....
        mainStatus, priorMainStatus
        amountPaidNew, amountPaidNewDate, trialCompleteDate, billingType

     */

    let xusers = xdata.val()


}

function getAuthUsers(allusers,nextPageToken,callback){


    if(nextPageToken) {

        admin.auth().listUsers(1000, nextPageToken)
            .then(function (listUsersResult) {
                listUsersResult.users.forEach(function (userRecord) {
                    allusers.push( userRecord.toJSON());
                });
                if (listUsersResult.pageToken) {
                    // List next batch of users.
                    getAuthUsers(allusers,listUsersResult.pageToken,callback);
                }else{
                    callback(allusers)
                }
            })
            .catch(function (error) {
                console.log('Error listing users:', error);
            });

    }else{
        admin.auth().listUsers(1000)
            .then(function (listUsersResult) {
                listUsersResult.users.forEach(function (userRecord) {
                    allusers.push( userRecord.toJSON());
                });
                if (listUsersResult.pageToken) {
                    // List next batch of users.
                    getAuthUsers(allusers,listUsersResult.pageToken,callback);
                }else{
                    callback(allusers)
                }
            })
            .catch(function (error) {
                console.log('Error listing users:', error);
            });

    }

}






async function backUsers(xdata) {
    let xusers = xdata.val()

    console.log('Backing UP')
    xusers = JSON.stringify(xusers)

    let xtime = moment().format('YYYY_MM_DD_HH')
    let xtime2 = moment().format('YYYY_MM_DD')

//    admin.storage().bucket('/dbbackup').child(xtime+'.json')
    let fileName = 'tempbackup.txt';
    let destination = "dbbackup/" + xtime2 + "/users_" + xtime + ".json";
    const tempFilePath = path.join(os.tmpdir(), fileName);
    // console.log( `Writing out to ${tempFilePath}` );
    //  fs.writeFileSync(tempFilePath, xusers);
    console.log('Did Write temp file')

    zip.file('users.json', xusers);

    // let allusers=   await getAuthUsers();


    getAuthUsers([],null,(allusers)=> {

        allusers=JSON.stringify(allusers)

        zip.file('auth.json', allusers);


        var data = zip.generate({base64: false, compression: 'DEFLATE'});
        fs.writeFileSync(tempFilePath, data, 'binary');


        let storage = admin.storage()
        storage
            .bucket()
            .upload(tempFilePath, {destination})
            .then(() => {
                console.log('Did BackUp Users on ' + xtime)
//let            attachment =await fs.readFileSync(tempFilePath).toString("base64")

                fs.unlinkSync(tempFilePath)
                console.log('Did Write storage file')
                let attachment = Buffer.from(data, 'binary').toString('base64')

                // const msg = {
                //     to: "analytics@flowtrade.com",
                //     from: 'info@flowtrade.com',
                //     subject: 'Auth User Backup ' + xtime,
                //     text: 'Backup Successful',
                //     attachments: [
                //         {
                //             content: attachment,
                //             filename: "users_" + xtime + ".zip",
                //             type: "text/json",
                //             disposition: "attachment"
                //         }
                //     ]
                // };
                //
                // console.log('SENDING backup to analytics@flowtrade.com')
                // sgMail.send(msg).catch(err => {
                //     console.log(err);
                // });

            })
            .catch(function (error) {
                console.log('Error listing users:', error);
            });


    })



}


function checkOldNews(xbit) {

    newsRef.ref('allNews').remove()
    if (xbit == 0) {
        newsRef.ref('allNews').once('value').then(
            function (val2) {


                if (val2 != null) {

                    let xtime = new Date().getTime() - (60000 * 60 * 24 * 7)

                    val2 = val2.val()


                    for (let bx in val2) {

                        if (val2[bx].ttime < xtime) {

                            newsRef.ref('allNews/' + bx).remove();

                        }

                    }

                }

            })

    }
    if (xbit == 1) {

        newsRef.ref('liveNews').remove()
        return false;

    }
    if (xbit == 2) {
        newsRef.ref('liveSymbolNews').remove();

    }
    if (xbit == 3) {
        newsRef.ref('newsById').remove()
//return;

    }

}


exports.IPAddress = functions.https.onRequest((req, res) => {
    cors(req, res, () => { // For Firebase Hosting URIs, use req.headers['fastly-client-ip']
        // For callable functions, use rawRequest
        // Some users have better success with req.headers['x-appengine-user-ip']
        const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const message = JSON.stringify({ip: ipAddress});
        //  const message = util.format("<pre>Hello world!\n\nYour IP address: %s\n\nRequest headers: %s</pre>", ipAddress, headers);
        res.send(message);
    })
});



exports.lastSeen = functions.pubsub.schedule('every 5 minutes').onRun((context) => {
    console.log('This will be run every 1 minutes!');





    admin.database().ref('lastSeen').once('value').then(
        async        function (val2) {
val2=val2.val();

            if(val2!=null){

                for(let bx in val2){
                    admin.database().ref('users/'+bx+"/lastSeen").set(val2[bx])
                    admin.database().ref('shortUsers/'+bx+"/lastSeen").set(val2[bx])


                }




                admin.database().ref('lastSeen').remove();
            }


        })

    return null;
});

exports.scheduledFunction2 = functions.pubsub.schedule('every 5 minutes').onRun((context) => {
    console.log('This will be run every 1 minutes!');





    admin.database().ref('cancelMeNow').once('value').then(
        async        function (val2) {

            let cancelMe = val2.val()

            if (cancelMe != null) {


                let xtime=new Date().getTime();

                for(let bx in cancelMe){




                    let uid =bx
                    console.log('NEED TO CANCEL'+uid)

                    admin.database().ref('users/' + uid + "/cancelling").remove()
                    admin.database().ref('cancelMeNow/' + uid ).remove()
                    //zoho and discord here, stripe and emails and everything else handled below
                    admin.database().ref('cancelled/' + uid).set(true)
                    admin.database().ref('users/' + uid + "/cancelTime").set(xtime)

                    //old method
                    admin.database().ref('users/' + uid + "/paymentStatus").set('Cancelled')

                    //new method
                    admin.database().ref('users/' + uid).once('value').then(xuser => {
                        xuser = xuser.val()

                        //new method


                        //refCode - affiliate FB ID
                        let refCode = xuser.refCode || ''


                        if (xuser.subID) {

                            stripe.subscriptions.del(
                                xuser.subID,
                                function (err, confirmation) {
                                    console.log('DID Secondary Cancel Stripe Subscription ', xuser.subID)
                                    console.log("confirmation: ", confirmation)
                                    console.log(err)

                                    if (confirmation == null) {
                                        stripetest.subscriptions.del(
                                            xuser.subID,
                                            function (err, confirmation) {
                                                console.log('DID DELETE  in stripe test Stripe Subscription ', xuser.subID)
                                                console.log("confirmation: ", confirmation)
                                                console.log(err)
                                            }
                                        );

                                    }
                                }
                            );


                        }







                    })





















                }





            }


        })








    return null;
});


// send welcome email to newly created user
exports.sendWelcomeEmail = functions.auth.user().onCreate((user) => {
    const email = user.email; // The email of the user.
    const displayName = user.displayName; // The display name of the user.
    console.log('Should Send Welcome Email')


    const msg = {
        to: email,
        from: 'noreply@flowtrade.com',
        subject: 'Welcome to FlowTrade!',
        templateId: 'd-61de0029888941a4ab01c89d89a0431f'
    };
    sgMail
        .send(msg)
        .then(() => {
        }, console.error);

    return false
});

// send goodbye email to newly created user
exports.sendGoodbyeEmail = functions.auth.user().onDelete((user) => {
    const email = user.email; // The email of the user.
    const displayName = user.username // users name
    const signupDate = user.compSigTime // users signup date
    const currentDate = moment(new Date().getTime()).format('LLLL') // get currentDate
    const userSignupDate = moment(signupDate).format('LLLL') // get use signup date
    const diff = moment(currentDate).diff(userSignupDate, 'days') // get diff
    // send email to admin if user canceled in trial period
    if (diff < 7) {
        const msgToAdmin = {
            to: 'purchases@flowtrade.com',
            from: 'bot@flowtrade.com',
            subject: 'Subscription canceled',
            templateId: 'd-e332610f8c154c708dac18dad1255074',
            dynamic_template_data: {
                email: email,
                displayName: displayName
            }
        };
        sgMail
            .send(msgToAdmin)
            .then(() => {
            }, console.error);
    }

    const msgToUser = {
        to: email,
        from: 'noreply@flowtrade.com',
        subject: 'We are sorry to see you go',
        templateId: 'd-a3c984f2940a4f7eb9b70739774e7f14',
        dynamic_template_data: {
            email: email,
            displayName: displayName
        }
    };
    sgMail
        .send(msgToUser)
        .then(() => {
        }, console.error);
});

// send indicator email
exports.sendIndicatorPurchased = functions.https.onCall(async (data, context) => {
    if (!context.auth && !context.auth.token.email) {
        throw new functions.https.HttpsError('failed-precondition', 'Must be logged in')
    }


    //Call Server Side Email Stuff

    console.log('Send Indicator Purchased to ' + context.auth.token.email)


    const msg = {
        to: "purchases@flowtrade.com",
        from: 'noreply@flowtrade.com',
        subject: 'Indicator Purchased By User - action Required',
        templateId: 'd-55783c27be3c430085462928c2839b0f',
        dynamic_template_data: data,
    };
    await sgMail.send(msg).then(() => {
    }, console.error);


    const msg2 = {
        to: context.auth.token.email,
        from: 'noreply@flowtrade.com',
        subject: 'Indicator Purchased',
        templateId: 'd-aefa6041bf70447aab349b6567af8304',
        dynamic_template_data: data,

    };
    await sgMail.send(msg2).then(() => {
    }, console.error);

    return {success: true}
})

exports.sendWelcome2 = functions.https.onCall(async (data, context) => {
    if (!context.auth && !context.auth.token.email) {
        throw new functions.https.HttpsError('failed-precondition', 'Must be logged in')

    }


    //Call Server Side Email Stuff

    console.log('Send Welcome to ' + context.auth.token.email)


    const msg = {
        to: context.auth.token.email,
        from: 'noreply@flowtrade.com',
        subject: 'Welcome To FlowTrade',
        templateId: 'd-61de0029888941a4ab01c89d89a0431f',
        dynamic_template_data: data,
    };
    await sgMail.send(msg).then(() => {
    }, console.error);


    return {success: true}
})


exports.startTesting = functions.https.onRequest((req, res) => {
    cors(req, res, () => { // For Firebase Hosting URIs, use req.headers['fastly-client-ip']
        console.log('Started Testing')
        let xstring = new Date().getFullYear() + "_" + new Date().getDate() + "_" + new Date().getMonth() + "__" + new Date().getHours()


        admin
            .database()
            .ref('users')
            .orderByChild('email')
            .equalTo("testing@flowtrade.com")
            .limitToLast(10)
            .once('value', val => {
                if (val != null) {

                    console.log('DID Delete TESTING USER')

                    //    console.log(val.val())

                    let xusers = val.val()

                    for (let mm in xusers) {
                        console.log(mm)
                        admin.database().ref('users/' + mm).remove();
                        admin.auth().deleteUser(mm)
                    }
                }


            });

        admin.database().ref('automatedTesting/BasicFlow/' + xstring + '/started').set(new Date().getTime())
        res.send("Started");

    })
})


// send subscribe success email
exports.sendSubscribeSuccess = functions.https.onCall(async (data, context) => {
    if (!context.auth && !context.auth.token.email) {
        throw new functions.https.HttpsError('failed-precondition', 'Must be logged in')
    }


    console.log('Send Subscribe Success to ' + context.auth.token.email)
    console.log(data)

    const msg = {
        to: context.auth.token.email,
        from: 'noreply@flowtrade.com',
        subject: 'Subscribe Success',
        templateId: 'd-89e5fc6332a44e2089a737e68d905c8b',
        dynamic_template_data: data,
    };
    await sgMail.send(msg).then(() => {
    }, console.error);


    if (data.incomingURL) {
        if (data.incomingURL.indexOf("RFS") != -1) {
            data.refCode = data.incomingURL
            data.refName = "RFS"
        }
    }


    const msg2 = {
        to: "purchases@flowtrade.com",
        from: 'noreply@flowtrade.com',
        subject: 'New User Signed Up and Paid',
        templateId: 'd-064dc901efb04c89878f23585cc64d04',
        dynamic_template_data: data,
    };
    await sgMail.send(msg2).then(() => {
    }, console.error);


    return {success: true}
})


exports.sendVerifyEmail = functions.https.onCall(async (data, context) => {


    console.log('Send Verify Email')

    //  let data = req.body


    const actionCodeSettings = {
        // URL you want to redirect back to. The domain (www.example.com) for
        // this URL must be whitelisted in the Firebase Console.
        url: 'https://flowtrade.com/vEmail',
        // This must be true for email link sign-in.
        handleCodeInApp: true,
        iOS: {
            bundleId: 'com.example.ios'
        },
        android: {
            packageName: 'com.example.android',
            installApp: true,
            minimumVersion: '12'
        },
        // FDL custom domain.
        dynamicLinkDomain: 'flowtrade.com'
    };
    const useremail = data.email;
    let displayName = data.displayName;
    admin.auth().generateEmailVerificationLink(useremail, actionCodeSettings)
        .then((link) => {
            // Construct email verification template, embed the link and send
            // using custom SMTP server.


            const msg = {
                to: useremail,
                from: 'noreply@flowtrade.com',
                subject: 'Verify your Email',
                templateId: 'd-75e7626969cb43a095fcb882312966ee',
                dynamic_template_data: {
                    link: link,
                    email: useremail,
                    displayName: displayName
                }
            };
            sgMail
                .send(msg)
                .then(() => {
                }, console.error);


            return false;
        })
        .catch((error) => {
            // Some error occurred.
        });

    return {success: true}

});


// send password reset email
exports.sendResetPassword = functions.https.onCall(async (data, context) => {
    console.log('sendResetPassword function fired!')
    const email = data.email

    admin.auth().generatePasswordResetLink(email, {url: 'https://tradingproject25-f513b.firebaseapp.com/__/auth/action'})
        .then((link) => {
            console.log('link: ', link)
            console.log('email: ', email)
            const msg = {
                to: email,
                from: 'noreply@flowtrade.com',
                subject: 'Reset Password',
                templateId: 'd-1a2698d231484c3c9a78bd56e09c2b34',
                dynamic_template_data: {
                    email: email,
                    link: link
                }
            };
            return sgMail.send(msg).then(() => {
            }, console.error);
        })
        .catch((error) => {
            // Some error occurred.
            console.error(error)
        });
})

// send newsletter email
exports.sendNewsletter = functions.database.instance('flowtrade-newsletters').ref('sent/{sentId}').onCreate(async (snapshot, context) => {
    const data = snapshot.val();
    console.log('SUCCESS', data)
    const msg = {
        to: ['georgewwindsor@yahoo.com','jj@flowtrade.com'],
        from: 'noreply@flowtrade.com',
        subject: data.title,
        templateId: 'd-c4c6779954494f30b3f01cc7459df704',
        dynamic_template_data: {
            title: data.title,
            content: data.content
        }
    };
    await sgMail.send(msg).then(() => {
    }, console.error);

    return {success: true}
})

exports.goPayment = functions.database.ref('paymentHandoff/{userID}').onWrite(event => {


    console.log('Create Payment')

    let xresults = event.after._data

    let xstripe = stripe;

    let xplan = "Basic"

    if (xresults.plan == "Trial") {
        xplan = 'plan_GxxZabwYdb1JsN'
    }


    if (xresults.plan == "Trial99") {
        console.log('Did Set Trial 99')
        xplan = 'price_1GsgiiD48AfiHVvUSXZqkdEO'
    }


    if (xresults.isTestCard == true) {
        xstripe = stripetest;
        console.log('USING TEST STRIPE CREDENTIALS')

//            Test Plans
        xplan = "plan_GtE8FESGZnpwXH"
        if (xresults.plan == "Trial") {
            xplan = "plan_GtEWluhrqQ4YRG"

        }


    }


    if (xresults.plan == "Yearly") {


    } else {


        xstripe.customers.create({
                description: xresults.uid,
                payment_method: xresults.payment_method,
                email: xresults.email,
                name: xresults.name,
                invoice_settings: {
                    default_payment_method: xresults.payment_method,
                },
            }, function (err, customer) {

                if (err != null) {

                    console.log('Error Creating Customer')
                    console.log(subscription)
                    admin.database().ref('paymentResponse/' + xresults.uid).set({err: err})

//                            res.send(JSON.stringify({err: err}))
                    return false
                } else {
                    console.log('Success Create Customer')
                    //  console.log(err)
                }


                let xobject = {
                    customer: customer.id,
                    items: [{plan: xplan}],
                    expand: ["latest_invoice.payment_intent"]
                };


                if (xresults.plan == "Trial") {
                    console.log('Did Set trial period for user')

                    xobject.trial_period_days = 7
                }

                if (xresults.coupon) {
                    xobject.coupon = xresults.coupon
                }

                if (xresults.salesTax == true) {

                    if (xresults.isTestCard == true) {
                        xobject.default_tax_rates = [
                            'txr_1GQ4imD48AfiHVvUKtYi9Pqk'
                        ];
                    } else {
                        xobject.default_tax_rates = [
                            'txr_1GLrVjD48AfiHVvUXPBbGo7j'
                        ];

                    }
                }
                console.log('Creating subscription...')

                xstripe.subscriptions.create(xobject,
                    function (err, subscription) {

                        if (err == null) {
                            console.log('Created Subscription')
                            console.log(subscription)

                            admin.database().ref('paymentResponse/' + xresults.uid).set({
                                customerId: customer.id,
                                subid: subscription.id
                            })

                            admin.database().ref('users/' + xresults.uid + '/paymentStatus').set('Paid');
                            admin.database().ref('users/' + xresults.uid + '/stripeID').set(customer.id);
                            admin.database().ref('users/' + xresults.uid + '/subID').set(subscription.id);
                            admin.database().ref('stripeSubs/' + subscription.id).set(xresults.uid);

                            const msg = {
                                to: xresults.email,
                                from: 'noreply@flowtrade.com',
                                subject: 'Welcome To FlowTrade - Subscription Initialized',
                                templateId: 'd-8119cab66d454a50898acb11d73b842c',

                            };
                            sgMail.send(msg).then(() => {
                            }, console.error);

                            console.log('Send Welcome Email to ' + xresults.email)

                            xresults.user.isTrial = true

                            if (xresults.plan != "Trial") {
                                xresults.user.isTrial = false


                            }
                            const msg2 = {
                                to: "purchases@flowtrade.com",
                                from: 'noreply@flowtrade.com',
                                subject: 'New User Processed Credit Card',
                                templateId: 'd-064dc901efb04c89878f23585cc64d04',
                                dynamic_template_data: xresults.user,
                            };
                            sgMail.send(msg2).then(() => {
                            }, console.error);


                        } else {


                            admin.database().ref('paymentResponse/' + xresults.uid).set({err: err})
                        }
                    }
                );


            }
        );
    }


})


exports.paypalEvent = functions.https.onRequest((req, res) => {


    console.log('Paypal Event')
    console.log(req.body)

    let pEvent = req.body

    console.log(req.body.event_type)
    cors(req, res, () => {

        res.setHeader('Access-Control-Allow-Origin', '*');
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.send(JSON.stringify({ok: true}))

    })

    if (pEvent.event_type == "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {


        console.log('Stripe charge failed Event')
        console.log(pEvent)

        admin.database().ref('paypalSubs/' + pEvent.resource.id).once('value').then(subId => {

            if (subId.val() != null) {


                admin.database().ref('users/' + subId.val() + '/billingFailed').set(new Date().getTime());

                // send user payment failed email
                admin.database().ref('users/' + subId.val() + '/email').once('value').then(email => {
                    const msg = {
                        to: email,
                        from: 'noreply@flowtrade.com',
                        subject: 'Verify your Email',
                        templateId: 'd-6fb24e2067194565a5d3daaf9b46f055'
                    };
                    sgMail
                        .send(msg)
                        .then(() => {
                        }, console.error);
                });


                admin.database().ref('paypalChargeFailed/' + subId.val()).set(new Date().getTime());

            } else {
                console.log('Subscription ID not in system')

            }

        })

        console.log('BILLING FAILED')
    }

    if (pEvent.event_type == "BILLING.SUBSCRIPTION.CANCELLED") {
        console.log('BILLING Canceled')
        console.log('Stripe subscriptionDeleted')
        //let subId = pEvent.resource.id;

        //   console.log('TRIAL WILL END')

        // send user failed email
        admin.database().ref('paypalSubs/' + pEvent.resource.id).once('value').then(subId => {


            if (subId.val() != null) {

                //users/uid/cancelling triggers /cancelled/uid...
                /*
                                //handles zoho and discord
                                admin.database().ref('cancelled/' + subId.val()).set(true)
                */

                admin.database().ref('users/' + subId.val() + '/cancelling').set(subId.val());


            } else {
                console.log('Subscription ID not in system')

            }

        })
    }

    if (pEvent.event_type == "PAYMENT.SALE.COMPLETED") {

        console.log('INVOICE PAID')


        let subscriptionID = pEvent.resource.billing_agreement_id
        console.log(pEvent.resource.billing_agreement_id)

        console.log('Paypal Event')
        console.log(pEvent.resource)
        admin.database().ref('invoices/' + subscriptionID).push(pEvent.resource)


        admin.database().ref('paypalSubs/' + subscriptionID).once('value').then(subId => {

            if (subId.val() != null) {

                console.log('Found Matching Stripe User')
                // console.log(event)
                admin.database().ref('users/' + subId.val() + '/paymentStatus').set('Paid');
                admin.database().ref('users/' + subId.val() + '/xpackage').set('Regular');
//
//
//                admin.database().ref('users/' + subId.val() + '/amountPaid').set(pEvent.resource.amount.total);

                admin.database().ref('users/' + subId.val()).once('value').then(subUser => {


                    if (parseInt(pEvent.resource.amount.total) != 0) {
                        if (subUser.val().trialComplete != true) {

                            console.log('Did Set trial complete')
                            admin.database().ref('users/' + subId.val() + '/trialComplete').set(true);
                            admin.database().ref('trialOver/' + subId.val()).set(true);


                        }
                    }

                    if (pEvent.resource.amount.total != 0 && pEvent.resource.amount.total != undefined) {


                        admin.database().ref('users/' + subId.val() + "/amountPaid").set(pEvent.resource.amount.total)
                    }

                    /*                              Cancelled
                                                    d-51fe7816a6804466901f92ebdd7cbbf3

                                                    Succeeful
                                                    d-c5830b1cc266499fae6026ede66b79c0*/
                    //refCode - affiliate FB ID
                    let refCode = subUser.val().refCode || ''


                    //sending an email to the affiliate, if the affiliate exists
                    if (pEvent.resource.amount.total != 0) {
                        // if (refCode != '' && refCode.length == 28) {
                        //     admin.database().ref('users/' + refCode + '/email').once('value').then(
                        //         function (affiliateEmail) {
                        //
                        //             let output = {
                        //                 chargeSucceeded: new Date().getTime(),
                        //             }
                        //             if (subUser.val().trialComplete != true) {
                        //                 output = {
                        //                     chargeSucceeded: new Date().getTime(),
                        //                     trialOver: new Date().getTime(),
                        //                 }
                        //             }
                        //             admin.database().ref('affiliates/' + refCode + '/' + subId.val()).update(output);
                        //             const affiliateMsg = {
                        //                 to: affiliateEmail.val(),
                        //                 from: 'noreply@flowtrade.com',
                        //                 subject: 'Hey!  A referal/affiliate of yours has successfully been billed',
                        //                 templateId: 'd-c5830b1cc266499fae6026ede66b79c0',
                        //                 dynamic_template_data: subUser.val(),
                        //             };
                        //             sgMail.send(affiliateMsg).then(() => {
                        //             }, console.error);
                        //
                        //         })
                        // }
                    } else {


                    }
//


                    //  }
                })


            } else {
                console.log('Subscription ID not in system')

            }

        })


    }


    if (pEvent.event_type == "BILLING.SUBSCRIPTION.ACTIVATED") {

        admin.database().ref('paypalSubs/' + pEvent.resource.id).once('value').then(
            function (xxuser) {


                if (xxuser.val() != null) {

                    let uid = xxuser.val();

                    console.log("UID:")
                    console.log(uid)
                    console.log(pEvent.resource.id)
                    admin.database().ref('users/' + uid + "/paypal").set(true)
                    admin.database().ref('users/' + uid + "/paymentStatus").set('Paid')
                    admin.database().ref('users/' + uid + "/paypalSub").set(pEvent.resource.id)


                    //Get the USERRRRRRRR FOR THE REFCODEEEEE

                    console.log('DID SET PAYMENT TRUE FOR ' + uid)
                    // admin.database().ref('users/' + uid + '/email').once('value').then(
                    //     function (trueuser) {
                    //         let refCode = trueuser.refCode
                    //         if (refCode != '' && refCode.length == 28) {
                    //             admin.database().ref('users/' + refCode + '/email').once('value').then(
                    //                 function (affiliateEmail) {
                    //
                    //                     let output = {
                    //                         chargeSucceeded: new Date().getTime(),
                    //                     }
                    //                     if (xxuser.val().trialComplete != true) {
                    //                         output = {
                    //                             chargeSucceeded: new Date().getTime(),
                    //                             trialOver: new Date().getTime(),
                    //                         }
                    //                     }
                    //                     admin.database().ref('affiliates/' + refCode + '/' + uid).update(output);
                    //                     const affiliateMsg = {
                    //                         to: affiliateEmail.val(),
                    //                         from: 'noreply@flowtrade.com',
                    //                         subject: 'Hey!  A referal/affiliate of yours has signed up for a trial.',
                    //                         templateId: 'd-72e22e01f8f94000b078bf1fff52bb10',
                    //                         dynamic_template_data: subUser.val(),
                    //                     };
                    //                     sgMail.send(affiliateMsg).then(() => {
                    //                     }, console.error);
                    //
                    //                 })
                    //         }
                    //     })
                }
            })

    }

    return false;

})


exports.ChangePaymentMethod = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

        console.log('Create Payment')
        console.log(req.body)
        res.setHeader('Access-Control-Allow-Origin', '*');
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

        let xresults = req.body

        admin.database().ref('users/' + xresults.uid).once('value').then(
            function (xxuser) {
                xresults.user = xxuser.val();

                console.log('DID GET NEW USER FROM BACKEND');

                if (xresults.user.subID) {

                    console.log('Set the default payment method to ' + xresults.paymentMethodId)
                    if (xresults.isTest != true) {


                        stripe.paymentMethods.attach(
                            xresults.paymentMethodId,
                            {customer: xresults.user.stripeID},
                            function (err, paymentMethod) {
                                // asynchronously called
                                console.log("Attached Billing Method to Customer")

                                stripe.subscriptions.update(
                                    xresults.user.subID,
                                    {default_payment_method: xresults.paymentMethodId},
                                    function (err, subscription) {

                                        console.log('DID CALL STRIPE TO UPDATE SUBSCRIPTION CARD  ')
                                        console.log(err);
                                        console.log(subscription);
                                        if (err) {
                                            res.send(JSON.stringify({err: err}))
                                        } else {
                                            res.send(JSON.stringify(true))
                                        }


                                        //Needs to Integrat


                                        // stripe.invoices.list(
                                        //     {customer: xxuser.stripeID, status: 'open'},
                                        //     function (err, upcoming) {
                                        //
                                        //         for (let bb in upcoming) {
                                        //             stripe.invoices.pay(upcoming.id)
                                        //
                                        //             break
                                        //         }
                                        //
                                        //
                                        //     }
                                        // )

                                    }
                                );

                            }
                        );


                    } else {


                        stripetest.paymentMethods.attach(
                            xresults.paymentMethodId,
                            {customer: xresults.user.stripeID},
                            function (err, paymentMethod) {
                                // asynchronously called
                                console.log("Attached Billing Method to Customer")

                                stripetest.subscriptions.update(
                                    xresults.user.subID,
                                    {default_payment_method: xresults.paymentMethodId},
                                    function (err, subscription) {

                                        console.log('DID CALL STRIPE TO UPDATE SUBSCRIPTION CARD')
                                        console.log(err);


                                        console.log(subscription);
                                        if (err) {
                                            res.send(JSON.stringify({err: err}))
                                        } else {
                                            res.send(JSON.stringify(true))
                                        }
                                    }
                                );

                            }
                        );


                    }


                } else {
                    res.send(JSON.stringify({err: "No Subscription Found..."}))
                }


            })

    })
})


exports.CreatePaymentMethod = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

        console.log('Create Payment')
        //  console.log(req.body)
        res.setHeader('Access-Control-Allow-Origin', '*');
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

        let xresults = req.body

        admin.database().ref('users/' + xresults.uid).once('value').then(
            async  function (xxuser) {
                xresults.user = xxuser.val();

                console.log('DID GET NEW USER FROM BACKEND');


                let xstripe = stripe;

                let xplan = "Basic"


                if (xresults.plan == "Trial") {
                    xplan = 'plan_GxxZabwYdb1JsN'
                }


                if (xresults.plan == "Trial99") {
                    console.log('Did Set Trial 99')
                    xplan = 'price_1GsgiiD48AfiHVvUSXZqkdEO'
                }

                if (xresults.plan == "Trial129") {
                    console.log('Did Set Trial 129')
                    xplan = 'price_1Gvbf5D48AfiHVvUaGP6iRxg'
                }

                if (xresults.plan == "yearly") {
                    xplan = 'price_1IyLkvD48AfiHVvUcPmpQv9z'
                }

                if (xresults.plan == "BlackFriday") {
                    xplan = 'price_1Hqss4D48AfiHVvUA9gzgZVH'
                }



                if (xresults.isTestCard == true) {
                    xstripe = stripetest;
                    console.log('USING TEST STRIPE CREDENTIALS')

//            Test Plans
                    xplan = "plan_GtE8FESGZnpwXH"
                    if (xresults.plan == "Trial") {
                        xplan = "plan_GtEWluhrqQ4YRG"

                    }

                    if (xresults.plan == "Trial99") {
                        console.log('Did Set trial99')
                        xplan = "price_1GsgmbD48AfiHVvUKZatMPyq"

                    }


                    if (xresults.plan == "Trial129") {
                        console.log('Did Set Trial 129')
                        xplan = 'price_1Gvbn8D48AfiHVvUcbwCTs7N'
                    }

                    if (xresults.plan == "BlackFriday") {
                        xplan = 'price_1Hqt7vD48AfiHVvUSfULx6fW'
                    }
                }


                //refCode - affiliate FB ID
                let refCode = ""
                if (xresults.user) {
                    refCode = xresults.user.refCode || '';

                    if(xresults.user.subID){
//there is an existing subscription.

                        let subscription=     await  xstripe.subscriptions.retrieve(xresults.user.subID)

                        console.log('YOu have an existing subscription, and its data is:' +subscription.items.data[0].status)
                        //     console.log(subscription)

                        if(subscription.items.data[0].status!="canceled"){


                            console.log("PREVENTING DUPLICATE Subscription")
                            res.send(JSON.stringify({customerId: xresults.user.stripeID, subid: xresults.user.subID}))

                            return null;



                        }


                    }

                }













                stripe.paymentMethods.retrieve(
                    xresults.payment_method,
                    function (err, paymentMethod) {
                        // asynchronously called


                        xstripe.customers.create({
                            description: xresults.uid,
                            metadata: {
                                refCode: refCode,
                                firstName: xresults.user.firstName,
                                lastName: xresults.user.lastName
                            },
                            payment_method: xresults.payment_method,
                            email: xresults.email,
                            name: xresults.user.firstName + " " + xresults.user.lastName,
                            invoice_settings: {
                                default_payment_method: xresults.payment_method,
                            },
                        }, function (err, customer) {

                            if (err != null) {

                                console.log('Error Creating Customer')
                                console.log(err)

                                res.send(JSON.stringify({err: err}))
                                return false
                            } else {
                                console.log('Success Create Customer')
                                //  console.log(err)
                            }


                            try {

                                if (paymentMethod.card.fingerprint) {


                                    admin.database().ref('fingerprints/' + paymentMethod.card.fingerprint).set(true)


                                }
                                if (xresults.user.email == "testing@flowtrade.com") {

                                    let xstring = new Date().getFullYear() + "_" + new Date().getDate() + "_" + new Date().getMonth() + "__" + new Date().getHours()

                                    admin.database().ref('automatedTesting/BasicFlow/' + xstring + '/paymentSuccess').set(new Date().getTime())

                                }
                            } catch (ex) {

                            }


                            let xobject = {
                                customer: customer.id,
                                items: [{plan: xplan}],
                                expand: ["latest_invoice.payment_intent"]
                            };


                            if (xresults.plan == "Trial") {
                                console.log('Did Set trial period for user')

                                xobject.trial_period_days = 7
                            }

                            if (xresults.coupon) {
                                xobject.coupon = xresults.coupon
                            }

                            if (xresults.salesTax == true) {

                                if (xresults.isTestCard == true) {
                                    xobject.default_tax_rates = [
                                        'txr_1GQ4imD48AfiHVvUKtYi9Pqk'
                                    ];
                                } else {
                                    xobject.default_tax_rates = [
                                        'txr_1GLrVjD48AfiHVvUXPBbGo7j'
                                    ];

                                }
                            }
                            console.log('Creating subscription...')

                            xstripe.subscriptions.create(xobject,
                                function (err, subscription) {

                                    if (err == null) {
                                        console.log('Created Subscription')
                                        console.log(subscription)

                                        res.send(JSON.stringify({customerId: customer.id, subid: subscription.id}))

                                        admin.database().ref('users/' + xresults.uid + '/paymentStatus').set('Paid');

                                        if (xresults.plan == "yearly") {
                                            admin.database().ref('users/' + xresults.uid + '/billingPeriod').set('Yearly');
                                        } else {

                                            admin.database().ref('users/' + xresults.uid + '/billingPeriod').set('Monthly');

                                        }

                                        admin.database().ref('users/' + xresults.uid + '/stripeID').set(customer.id);
                                        admin.database().ref('users/' + xresults.uid + '/subID').set(subscription.id);
                                        admin.database().ref('stripeSubs/' + subscription.id).set(xresults.uid);
                                        admin.database().ref('users/' + xresults.uid + "/trialExpires").set(new Date().getTime() + (60000 * 60 * 24 * 7));

                                        admin.database().ref('paymentStatus/' + xresults.uid).set('Paid');

                                        /*                                Signed Up
                                                                        d-72e22e01f8f94000b078bf1fff52bb10

                                                                        Cancelled
                                                                        d-51fe7816a6804466901f92ebdd7cbbf3

                                                                        Succeeful
                                                                        d-c5830b1cc266499fae6026ede66b79c0*/


                                        //sending an email to the affiliate, if the affiliate exists

                                        console.log('Checking Ref:' + refCode)
                                        // if (refCode != '' && refCode.length == 28) {
                                        //     admin.database().ref('users/' + refCode).once('value').then(
                                        //         function (affiliate) {
                                        //             let affiliateEmail = affiliate.val().email
                                        //             console.log('Did Set Signup Ref')
                                        //             admin.database().ref('affiliates/' + refCode + '/' + xresults.uid).set({
                                        //
                                        //
                                        //                 signup: new Date().getTime(),
                                        //             });
                                        //             const affiliateMsg = {
                                        //                 to: affiliateEmail,
                                        //                 from: 'noreply@flowtrade.com',
                                        //                 subject: 'A referal of yours signed up ',
                                        //                 templateId: 'd-72e22e01f8f94000b078bf1fff52bb10',
                                        //                 dynamic_template_data: xresults.user,
                                        //             };
                                        //             sgMail.send(affiliateMsg).then(() => {
                                        //             }, console.error);
                                        //
                                        //
                                        //             xresults.user.isTrial = true
                                        //
                                        //             if (xresults.plan != "Trial") {
                                        //                 xresults.user.isTrial = false
                                        //
                                        //
                                        //             }
                                        //
                                        //             xresults.user.refName = affiliate.firstName + " " + affiliate.lastName
                                        //
                                        //             const msg2 = {
                                        //                 to: "purchases@flowtrade.com",
                                        //                 from: 'noreply@flowtrade.com',
                                        //                 subject: 'New Affiliate User Processed Credit Card',
                                        //                 templateId: 'd-064dc901efb04c89878f23585cc64d04',
                                        //                 dynamic_template_data: xresults.user,
                                        //             };
                                        //             sgMail.send(msg2).then(() => {
                                        //             }, console.error);
                                        //
                                        //
                                        //             if (affiliate.val().hasOwnPlatform == true) {
                                        //
                                        //
                                        //                 const msg = {
                                        //                     to: xresults.user.email,
                                        //                     from: 'noreply@flowtrade.com',
                                        //                     subject: 'Welcome To FlowTrade - Subscription Initialized',
                                        //                     templateId: 'd-397ba78fd8ce454b80c03c82958e38ae',
                                        //
                                        //                 };
                                        //                 sgMail.send(msg).then(() => {
                                        //                 }, console.error);
                                        //                 admin.database().ref('users/' + xresults.uid + '/referredByAffiliate').set(true);
                                        //
                                        //                 console.log('SHOULD set the upstreamAffiliate has own platform')
                                        //
                                        //
                                        //                 admin.database().ref('users/' + xresults.uid + '/upstreamAffiliateHasOwnPlatform').set(true);
                                        //
                                        //
                                        //             } else {
                                        //
                                        const msg3 = {
                                            to: xresults.user.email,
                                            from: 'noreply@flowtrade.com',
                                            subject: 'Welcome To FlowTrade - Subscription Initialized',
                                            templateId: 'd-8119cab66d454a50898acb11d73b842c',

                                        };
                                        sgMail.send(msg3).then(() => {
                                        }, console.error);
                                        //
                                        //
                                        //             }
                                        //
                                        //
                                        //         })
                                        //
                                        //
                                        // } else {


                                        xresults.user.isTrial = true

                                        if (xresults.plan != "Trial") {
                                            xresults.user.isTrial = false


                                        }
                                        const msg2 = {
                                            to: "purchases@flowtrade.com",
                                            from: 'noreply@flowtrade.com',
                                            subject: 'New User Processed Credit Card',
                                            templateId: 'd-064dc901efb04c89878f23585cc64d04',
                                            dynamic_template_data: xresults.user,
                                        };
                                        sgMail.send(msg2).then(() => {
                                        }, console.error);


                                        const msg = {
                                            to: xresults.user.email,
                                            from: 'noreply@flowtrade.com',
                                            subject: 'Welcome To FlowTrade - Subscription Initialized',
                                            templateId: 'd-8119cab66d454a50898acb11d73b842c',

                                        };
                                        sgMail.send(msg).then(() => {
                                        }, console.error);

                                    }


                                    //Now we need to change their discord user to trial, and add the user to zoho


                                    // } else {
                                    //
                                    //
                                    //     admin
                                    //         .database()
                                    //         .ref(`CheckoutErrors/${xresults.uid}`)
                                    //         .push(err)
                                    //
                                    //
                                    //     res.send({err: err})
                                    // }
                                }
                            );
                        })
                    }
                );

            }
        );

    })
    return false;
})

exports.CreatePaymentMethodB = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

        console.log('Create Payment')
        //  console.log(req.body)
        res.setHeader('Access-Control-Allow-Origin', '*');
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

        let xresults = req.body

        let isTrial=false;
        admin.database().ref('users/' + xresults.uid).once('value').then(
            async  function (xxuser) {
                xresults.user = xxuser.val();

                console.log('DID GET NEW USER FROM BACKEND');


                let xstripe = stripe;

                let xplan = "Basic"


                if (xresults.plan == "Trial") {
                    xplan = 'plan_GxxZabwYdb1JsN'
                    isTrial=true;

                }


                if (xresults.plan == "Trial99") {
                    console.log('Did Set Trial 99')
                    isTrial=true;

                    xplan = 'price_1GsgiiD48AfiHVvUSXZqkdEO'
                }

                if (xresults.plan == "Trial129") {
                    console.log('Did Set Trial 129')
                    isTrial=true;

                    xplan = 'price_1Gvbf5D48AfiHVvUaGP6iRxg'
                }

                if (xresults.plan == "Yearly") {
                    xplan = 'price_1IyLkvD48AfiHVvUcPmpQv9z'
                }

                if (xresults.plan == "BlackFriday") {
                    xplan = 'price_1Hqss4D48AfiHVvUA9gzgZVH'
                }



                if (xresults.isTestCard == true) {
                    xstripe = stripetest;
                    console.log('USING TEST STRIPE CREDENTIALS')

//            Test Plans
                    xplan = "plan_GtE8FESGZnpwXH"
                    if (xresults.plan == "Trial") {
                        xplan = "plan_GtEWluhrqQ4YRG"
                        isTrial=true;

                    }

                    if (xresults.plan == "Trial99") {
                        console.log('Did Set trial99')
                        xplan = "price_1GsgmbD48AfiHVvUKZatMPyq"
                        isTrial=true;

                    }

                    if (xresults.plan == "Yearly") {
                        xplan = 'price_1Ifq5xD48AfiHVvUxhzr5LMm'
                    }



                    if (xresults.plan == "Trial129") {
                        console.log('Did Set Trial 129')
                        xplan = 'price_1Gvbn8D48AfiHVvUcbwCTs7N'
                        isTrial=true;

                    }

                    if (xresults.plan == "BlackFriday") {
                        xplan = 'price_1Hqt7vD48AfiHVvUSfULx6fW'
                    }
                }


                //refCode - affiliate FB ID
                let refCode = ""
                if (xresults.user) {
                    refCode = xresults.user.refCode || '';

                    if(xresults.user.subID){
//there is an existing subscription.

                        let subscription=     await  xstripe.subscriptions.retrieve(xresults.user.subID)

                        console.log('YOu have an existing subscription, and its data is:' +subscription.items.data[0].status)
                        //     console.log(subscription)

                        if(subscription.items.data[0].status!="canceled"){


                            console.log("PREVENTING DUPLICATE Subscription")
                            res.send(JSON.stringify({customerId: xresults.user.stripeID, subid: xresults.user.subID}))

                            return null;



                        }


                    }

                }









                console.log('Retrieving payment method')





                xstripe.paymentMethods.retrieve(
                    xresults.payment_method,
                    function (err, paymentMethod) {
                        // asynchronously called

                        console.log('Got Payment method')
                        //   console.log(err)
                        //   console.log(paymentMethod)


                        xstripe.customers.create({
                            description: xresults.uid,
                            source: xresults.token.id,
                            metadata: {
                                refCode: refCode,
                                firstName: xresults.user.firstName,
                                lastName: xresults.user.lastName
                            },
                            payment_method: xresults.payment_method,
                            email: xresults.email,
                            name: xresults.user.firstName + " " + xresults.user.lastName,
                            invoice_settings: {
                                default_payment_method: xresults.payment_method,
                            },
                        }, async function (err, customer) {

                            if (err != null) {

                                console.log('Error Creating Customer')
                                console.log(err.message)

                                res.send(JSON.stringify({err: err.message}))
                                return false
                            } else {
                                console.log('Success Create Customer')
                                //  console.log(err)
                            }


                            try {

                                if (paymentMethod.card.fingerprint) {


                                    admin.database().ref('fingerprints/' + paymentMethod.card.fingerprint).set(true)


                                }
                                if (xresults.user.email == "testing@flowtrade.com") {

                                    let xstring = new Date().getFullYear() + "_" + new Date().getDate() + "_" + new Date().getMonth() + "__" + new Date().getHours()

                                    admin.database().ref('automatedTesting/BasicFlow/' + xstring + '/paymentSuccess').set(new Date().getTime())

                                }
                            } catch (ex) {

                            }


                            let xobject = {
                                customer: customer.id,
                                items: [{plan: xplan}],
                                expand: ["latest_invoice.payment_intent"]
                            };


                            if (xresults.plan == "Trial") {
                                console.log('Did Set trial period for user')

                                xobject.trial_period_days = 7
                            }

                            if (xresults.coupon) {
                                xobject.coupon = xresults.coupon
                            }

                            if (xresults.salesTax == true) {

                                if (xresults.isTestCard == true) {
                                    xobject.default_tax_rates = [
                                        'txr_1GQ4imD48AfiHVvUKtYi9Pqk'
                                    ];
                                } else {
                                    xobject.default_tax_rates = [
                                        'txr_1GLrVjD48AfiHVvUXPBbGo7j'
                                    ];

                                }
                            }



                            if(xresults.state){
                                if(xresults.state.toLowerCase()=="wa"){

                                    if (xresults.isTestCard == true) {
                                        xobject.tax_rates = [
                                            'txr_1GQ4imD48AfiHVvUKtYi9Pqk'
                                        ];
                                    } else {
                                        xobject.tax_rates = [
                                            'txr_1GLrVjD48AfiHVvUXPBbGo7j'
                                        ];

                                    }


                                }


                            }


                            console.log('Time to create a payment intent::: ' +customer.id)
//console.log(xresults.token.id)

                            // let cards=  await xstripe.customers.listSources(
                            //       customer.id,
                            //       {object: 'card', limit: 3}
                            //   );
                            //
                            //   console.log(cards)
                            //
                            //   let cardId= cards.data[0].id
                            //
                            //
                            // //  console.log(xresults.payment_method)

let xcharge={};

if(isTrial==true) {
     xcharge = await xstripe.charges.create({
        amount: 100,
        currency: 'usd',
        description: 'Flowtrade PreAuth',
       customer:customer.id,
        //source: xresults.token.id,
        capture: false,
    });


                                console.log('XCHARGE--------------')
                                console.log(xcharge.status)


                                if (xcharge.status != 'succeeded') {


                                    res.send(JSON.stringify({err: "CardInvalid"}))

                                    return null;


                                }


                            }

                            //console.log(xresults.user)



                            // xstripe.paymentIntents.create({
                            //         amount: 1000,
                            //
                            //         currency: 'usd',
                            //      customer:   customer.id,
                            //     capture_method:'manual',
                            //         payment_method_types: ['card'],
                            //     payment_method:xresults.payment_method,
                            //     },
                            //     function (err, paymentIntent) {
                            //
                            //
                            //     console.log('Payment Method Created')
                            //
                            //         console.log(err)
                            //         console.log(paymentIntent)
                            //
                            //
                            //
                            //
                            //
                            //     })

                            //  return;




                            console.log('Creating subscription...')

                            xstripe.subscriptions.create(xobject,
                                function (err, subscription) {

                                    if (err == null) {
                                        console.log('Created Subscription')
                                        console.log(subscription)

                                        res.send(JSON.stringify({customerId: customer.id, subid: subscription.id}))

                                        admin.database().ref('users/' + xresults.uid + '/paymentStatus').set('Paid');

                                        if (xresults.plan == "yearly") {
                                            admin.database().ref('users/' + xresults.uid + '/billingPeriod').set('Yearly');
                                        } else {

                                            admin.database().ref('users/' + xresults.uid + '/billingPeriod').set('Monthly');

                                        }

                                        if(isTrial==true) {
                                            admin.database().ref('users/' + xresults.uid + '/chargeId').set(xcharge.id)
                                        }
                                        admin.database().ref('users/' + xresults.uid + '/stripeToken').set(xresults.token.id);
                                        admin.database().ref('users/' + xresults.uid + '/stripeID').set(customer.id);
                                        admin.database().ref('users/' + xresults.uid + '/subID').set(subscription.id);
                                        admin.database().ref('stripeSubs/' + subscription.id).set(xresults.uid);
                                        admin.database().ref('users/' + xresults.uid + "/trialExpires").set(new Date().getTime() + (60000 * 60 * 24 * 7));

                                        admin.database().ref('paymentStatus/' + xresults.uid).set('Paid');

                                        /*                                Signed Up
                                                                        d-72e22e01f8f94000b078bf1fff52bb10

                                                                        Cancelled
                                                                        d-51fe7816a6804466901f92ebdd7cbbf3

                                                                        Succeeful
                                                                        d-c5830b1cc266499fae6026ede66b79c0*/


                                        //sending an email to the affiliate, if the affiliate exists

                                        console.log('Checking Ref:' + refCode)
                                        // if (refCode != '' && refCode.length == 28) {
                                        //     admin.database().ref('users/' + refCode).once('value').then(
                                        //         function (affiliate) {
                                        //             let affiliateEmail = affiliate.val().email
                                        //             console.log('Did Set Signup Ref')
                                        //             admin.database().ref('affiliates/' + refCode + '/' + xresults.uid).set({
                                        //
                                        //
                                        //                 signup: new Date().getTime(),
                                        //             });
                                        //             const affiliateMsg = {
                                        //                 to: affiliateEmail,
                                        //                 from: 'noreply@flowtrade.com',
                                        //                 subject: 'A referal of yours signed up ',
                                        //                 templateId: 'd-72e22e01f8f94000b078bf1fff52bb10',
                                        //                 dynamic_template_data: xresults.user,
                                        //             };
                                        //             sgMail.send(affiliateMsg).then(() => {
                                        //             }, console.error);
                                        //
                                        //
                                        //             xresults.user.isTrial = true
                                        //
                                        //             if (xresults.plan != "Trial") {
                                        //                 xresults.user.isTrial = false
                                        //
                                        //
                                        //             }
                                        //
                                        //             xresults.user.refName = affiliate.firstName + " " + affiliate.lastName
                                        //
                                        //             const msg2 = {
                                        //                 to: "purchases@flowtrade.com",
                                        //                 from: 'noreply@flowtrade.com',
                                        //                 subject: 'New Affiliate User Processed Credit Card',
                                        //                 templateId: 'd-064dc901efb04c89878f23585cc64d04',
                                        //                 dynamic_template_data: xresults.user,
                                        //             };
                                        //             sgMail.send(msg2).then(() => {
                                        //             }, console.error);
                                        //
                                        //
                                        //             if (affiliate.val().hasOwnPlatform == true) {
                                        //
                                        //
                                        //                 const msg = {
                                        //                     to: xresults.user.email,
                                        //                     from: 'noreply@flowtrade.com',
                                        //                     subject: 'Welcome To FlowTrade - Subscription Initialized',
                                        //                     templateId: 'd-397ba78fd8ce454b80c03c82958e38ae',
                                        //
                                        //                 };
                                        //                 sgMail.send(msg).then(() => {
                                        //                 }, console.error);
                                        //                 admin.database().ref('users/' + xresults.uid + '/referredByAffiliate').set(true);
                                        //
                                        //                 console.log('SHOULD set the upstreamAffiliate has own platform')
                                        //
                                        //
                                        //                 admin.database().ref('users/' + xresults.uid + '/upstreamAffiliateHasOwnPlatform').set(true);
                                        //
                                        //
                                        //             } else {
                                        //
                                        const msg3 = {
                                            to: xresults.user.email,
                                            from: 'noreply@flowtrade.com',
                                            subject: 'Welcome To FlowTrade - Subscription Initialized',
                                            templateId: 'd-8119cab66d454a50898acb11d73b842c',

                                        };
                                        sgMail.send(msg3).then(() => {
                                        }, console.error);
                                        //
                                        //
                                        //             }
                                        //
                                        //
                                        //         })
                                        //
                                        //
                                        // } else {


                                        xresults.user.isTrial = true

                                        if (xresults.plan != "Trial") {
                                            xresults.user.isTrial = false


                                        }
                                        const msg2 = {
                                            to: "purchases@flowtrade.com",
                                            from: 'noreply@flowtrade.com',
                                            subject: 'New User Processed Credit Card',
                                            templateId: 'd-064dc901efb04c89878f23585cc64d04',
                                            dynamic_template_data: xresults.user,
                                        };
                                        sgMail.send(msg2).then(() => {
                                        }, console.error);


                                        const msg = {
                                            to: xresults.user.email,
                                            from: 'noreply@flowtrade.com',
                                            subject: 'Welcome To FlowTrade - Subscription Initialized',
                                            templateId: 'd-8119cab66d454a50898acb11d73b842c',

                                        };
                                        sgMail.send(msg).then(() => {
                                        }, console.error);

                                    }


                                    //Now we need to change their discord user to trial, and add the user to zoho


                                    // } else {
                                    //
                                    //
                                    //     admin
                                    //         .database()
                                    //         .ref(`CheckoutErrors/${xresults.uid}`)
                                    //         .push(err)
                                    //
                                    //
                                    //     res.send({err: err})
                                    // }
                                }
                            );
                        })
                    }
                );

            }
        );

    })
    return false;
})


exports.MainCheckout = functions.https.onRequest((req, res) => {
    cors(req, res, () => {

        console.log('Create Payment')
        //  console.log(req.body)
        res.setHeader('Access-Control-Allow-Origin', '*');
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

        let xresults = req.body

        let isTrial=false;
        admin.database().ref('users/' + xresults.uid).once('value').then(
            async  function (xxuser) {
                xresults.user = xxuser.val();

                console.log('DID GET NEW USER FROM BACKEND');


                let xstripe = stripe;

                let xplan = "Basic"


                if (xresults.plan == "Trial") {
                    xplan = 'plan_GxxZabwYdb1JsN'
                    isTrial=true;
                }

                if (xresults.plan == "Trial99") {
                    console.log('Did Set Trial 99')
                    isTrial=true;
                    xplan = 'price_1GsgiiD48AfiHVvUSXZqkdEO'
                }

                if (xresults.plan == "Trial129") {
                    console.log('Did Set Trial 129')
                    isTrial=true;
                    xplan = 'price_1Gvbf5D48AfiHVvUaGP6iRxg'
                }

                if (xresults.plan == "Yearly") {
                    xplan = 'price_1IyLkvD48AfiHVvUcPmpQv9z'
                }

                if (xresults.plan == "BlackFriday") {
                    xplan = 'price_1Hqss4D48AfiHVvUA9gzgZVH'
                }

                if (xresults.isTestCard == true) {
                    xstripe = stripetest;
                    console.log('USING TEST STRIPE CREDENTIALS')

                    //Test Plans
                    xplan = "plan_GtE8FESGZnpwXH"
                    if (xresults.plan == "Trial") {
                        xplan = "plan_GtEWluhrqQ4YRG"
                        isTrial=true;
                    }

                    if (xresults.plan == "Trial99") {
                        console.log('Did Set trial99')
                        xplan = "price_1GsgmbD48AfiHVvUKZatMPyq"
                        isTrial=true;
                    }

                    if (xresults.plan == "Yearly") {
                        xplan = 'price_1Ifq5xD48AfiHVvUxhzr5LMm'
                    }

                    if (xresults.plan == "Trial129") {
                        console.log('Did Set Trial 129')
                        xplan = 'price_1Gvbn8D48AfiHVvUcbwCTs7N'
                        isTrial=true;
                    }

                    if (xresults.plan == "BlackFriday") {
                        xplan = 'price_1Hqt7vD48AfiHVvUSfULx6fW'
                    }
                }

                let refCode = ""
                if (xresults.user) {
                    refCode = xresults.user.refCode || '';

                    if(xresults.user.subID){

                        let subscription=     await  xstripe.subscriptions.retrieve(xresults.user.subID)

                        console.log('YOu have an existing subscription, and its data is:' +subscription.items.data[0].status)
                        //     console.log(subscription)

                        if(subscription.items.data[0].status!="canceled"){

                            console.log("PREVENTING DUPLICATE Subscription")
                            res.send(JSON.stringify({customerId: xresults.user.stripeID, subid: xresults.user.subID}))

                            return null;
                        }
                    }
                }

                console.log('Retrieving payment method')

                xstripe.paymentMethods.retrieve(
                    xresults.payment_method,
                    function (err, paymentMethod) {

                        console.log('Got Payment method')

                        xstripe.customers.create({
                            description: xresults.uid,
                            source: xresults.token.id,
                            metadata: {
                                refCode: refCode,
                                firstName: xresults.user.firstName,
                                lastName: xresults.user.lastName
                            },
                            payment_method: xresults.payment_method,
                            email: xresults.email,
                            name: xresults.user.firstName + " " + xresults.user.lastName,
                            invoice_settings: {
                                default_payment_method: xresults.payment_method,
                            },
                        }, async function (err, customer) {

                            if (err != null) {

                                console.log('Error Creating Customer')
                                console.log(err.message)

                                res.send(JSON.stringify({err: err.message}))
                                return false
                            } else {
                                console.log('Success Create Customer')
                            }

                            try {
                                if (paymentMethod.card.fingerprint) {
                                    admin.database().ref('fingerprints/' + paymentMethod.card.fingerprint).set(true)
                                }

                                if (xresults.user.email == "testing@flowtrade.com") {

                                    let xstring = new Date().getFullYear() + "_" + new Date().getDate() + "_" + new Date().getMonth() + "__" + new Date().getHours()

                                    admin.database().ref('automatedTesting/BasicFlow/' + xstring + '/paymentSuccess').set(new Date().getTime())

                                }
                            } catch (ex) {

                            }

                            let xobject = {
                                customer: customer.id,
                                items: [{plan: xplan}],
                                expand: ["latest_invoice.payment_intent"]
                            };


                            if (xresults.plan == "Trial") {
                                console.log('Did Set trial period for user')

                                xobject.trial_period_days = 7
                            }

                            if (xresults.coupon) {
                                xobject.coupon = xresults.coupon
                            }

                            if (xresults.salesTax == true) {

                                if (xresults.isTestCard == true) {
                                    xobject.default_tax_rates = [
                                        'txr_1GQ4imD48AfiHVvUKtYi9Pqk'
                                    ];
                                } else {
                                    xobject.default_tax_rates = [
                                        'txr_1GLrVjD48AfiHVvUXPBbGo7j'
                                    ];
                                }
                            }

                            if(xresults.state){
                                if(xresults.state.toLowerCase()=="wa"){

                                    if (xresults.isTestCard == true) {
                                        xobject.tax_rates = [
                                            'txr_1GQ4imD48AfiHVvUKtYi9Pqk'
                                        ];
                                    } else {
                                        xobject.tax_rates = [
                                            'txr_1GLrVjD48AfiHVvUXPBbGo7j'
                                        ];

                                    }
                                }
                            }

                            console.log('Time to create a payment intent::: ' +customer.id)

                            let xcharge={};

                            if(isTrial==true) {
                                xcharge = await xstripe.charges.create({
                                    amount: 100,
                                    currency: 'usd',
                                    description: 'Flowtrade PreAuth',
                                    customer:customer.id,
                                    capture: false,
                                });

                                console.log('XCHARGE--------------')
                                console.log(xcharge.status)

                                if (xcharge.status != 'succeeded') {

                                    res.send(JSON.stringify({err: "CardInvalid"}))

                                    return null;
                                }
                            }

                            console.log('Creating subscription...')

                            xstripe.subscriptions.create(xobject,
                                function (err, subscription) {

                                    if (err == null) {
                                        console.log('Created Subscription')
                                        console.log(subscription)

                                        res.send(JSON.stringify({customerId: customer.id, subid: subscription.id}))

                                        admin.database().ref('users/' + xresults.uid + '/paymentStatus').set('Paid');

                                        if (xresults.plan == "yearly") {
                                            admin.database().ref('users/' + xresults.uid + '/billingPeriod').set('Yearly');
                                        } else {

                                            admin.database().ref('users/' + xresults.uid + '/billingPeriod').set('Monthly');

                                        }

                                        if(isTrial==true) {
                                            admin.database().ref('users/' + xresults.uid + '/chargeId').set(xcharge.id)
                                        }
                                        admin.database().ref('users/' + xresults.uid + '/stripeToken').set(xresults.token.id);
                                        admin.database().ref('users/' + xresults.uid + '/stripeID').set(customer.id);
                                        admin.database().ref('users/' + xresults.uid + '/subID').set(subscription.id);
                                        admin.database().ref('stripeSubs/' + subscription.id).set(xresults.uid);
                                        admin.database().ref('users/' + xresults.uid + "/trialExpires").set(new Date().getTime() + (60000 * 60 * 24 * 7));

                                        admin.database().ref('paymentStatus/' + xresults.uid).set('Paid');
                                        console.log('Checking Ref:' + refCode)

                                        const msg3 = {
                                            to: xresults.user.email,
                                            from: 'noreply@flowtrade.com',
                                            subject: 'Welcome To FlowTrade - Subscription Initialized',
                                            templateId: 'd-8119cab66d454a50898acb11d73b842c',

                                        };
                                        sgMail.send(msg3).then(() => {
                                        }, console.error);
                                        xresults.user.isTrial = true

                                        if (xresults.plan != "Trial") {
                                            xresults.user.isTrial = false
                                        }
                                        const msg2 = {
                                            to: "purchases@flowtrade.com",
                                            from: 'noreply@flowtrade.com',
                                            subject: 'New User Processed Credit Card',
                                            templateId: 'd-064dc901efb04c89878f23585cc64d04',
                                            dynamic_template_data: xresults.user,
                                        };
                                        sgMail.send(msg2).then(() => {
                                        }, console.error);

                                        const msg = {
                                            to: xresults.user.email,
                                            from: 'noreply@flowtrade.com',
                                            subject: 'Welcome To FlowTrade - Subscription Initialized',
                                            templateId: 'd-8119cab66d454a50898acb11d73b842c',

                                        };
                                        sgMail.send(msg).then(() => {
                                        }, console.error);

                                    }
                                }
                            );
                        })
                    }
                );
            }
        );
    })
    return false;
})


exports.CreatePaymentMethodTest = functions.https.onRequest((req, res) => {
    cors(req, res, () => {


        console.log('Create Payment')
        console.log(req.body)

        let xresults = req.body

        let xstripe = stripe;

        let xplan = "Basic"
        res.setHeader('Access-Control-Allow-Origin', '*');
        //     res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

console.log("Payment GO")
        console.log(xresults)
        if (xresults.plan == "Trial") {


            xplan = 'plan_GxxZabwYdb1JsN'
        }


        if(xresults.pan="yearly"){
            xplan ="price_1IyLkvD48AfiHVvUcPmpQv9z";

        }


        if (xresults.isTestCard == true) {
            xstripe = stripetest;
            console.log('USING TEST STRIPE CREDENTIALS')

//            Test Plans
            xplan = "plan_GtE8FESGZnpwXH"
            if (xresults.plan == "Trial") {
                xplan = "plan_GtEWluhrqQ4YRG"

            }


        }





            xstripe.customers.create({
                    description: xresults.uid,
                    payment_method: xresults.payment_method,
                    email: xresults.email,
                    name: xresults.name,
                    invoice_settings: {
                        default_payment_method: xresults.payment_method,
                    },
                }, function (err, customer) {

                    if (err != null) {

                        console.log('Error Creating Customer')
                        console.log(subscription)

                        res.send(JSON.stringify({err: err}))
                        return false
                    } else {
                        console.log('Success Create Customer')
                        //  console.log(err)
                    }


                    let xobject = {
                        customer: customer.id,
                        items: [{plan: xplan}],
                        expand: ["latest_invoice.payment_intent"]
                    };


                    if (xresults.plan == "Trial") {
                        console.log('Did Set trial period for user')

                        xobject.trial_period_days = 7
                    }

                    if (xresults.coupon) {
                        xobject.coupon = xresults.coupon
                    }

                    if (xresults.salesTax == true) {

                        if (xresults.isTestCard == true) {
                            xobject.tax_rates = [
                                'txr_1GQ4imD48AfiHVvUKtYi9Pqk'
                            ];
                        } else {
                            xobject.tax_rates = [
                                'txr_1GLrVjD48AfiHVvUXPBbGo7j'
                            ];

                        }
                    }

                    if(xresults.state){
                        if(xresults.state.toLowerCase()=="wa"){

                            if (xresults.isTestCard == true) {
                                xobject.tax_rates = [
                                    'txr_1GQ4imD48AfiHVvUKtYi9Pqk'
                                ];
                            } else {
                                xobject.tax_rates = [
                                    'txr_1GLrVjD48AfiHVvUXPBbGo7j'
                                ];

                            }


                        }


                    }

                    console.log('Creating subscription...')

                    xstripe.subscriptions.create(xobject,
                        function (err, subscription) {

                            if (err == null) {
                                console.log('Created Subscription')
                                console.log(subscription)

                                admin.database().ref('paymentResponse/' + xresults.uid).set({
                                    customerId: customer.id,
                                    subid: subscription.id
                                })

                                res.send(JSON.stringify({customerId: customer.id, subid: subscription.id}))

                                admin.database().ref('users/' + xresults.uid + '/paymentStatus').set('Paid');
                                admin.database().ref('users/' + xresults.uid + '/stripeID').set(customer.id);
                                admin.database().ref('users/' + xresults.uid + '/subID').set(subscription.id);
                                admin.database().ref('stripeSubs/' + subscription.id).set(xresults.uid);

                                const msg = {
                                    to: xresults.email,
                                    from: 'noreply@flowtrade.com',
                                    subject: 'Welcome To FlowTrade - Subscription Initialized',
                                    templateId: 'd-8119cab66d454a50898acb11d73b842c',

                                };
                                sgMail.send(msg).then(() => {
                                }, console.error);


                                xresults.user.isTrial = true

                                if (xresults.plan != "Trial") {
                                    xresults.user.isTrial = false


                                }
                                const msg2 = {
                                    to: "purchases@flowtrade.com",
                                    from: 'noreply@flowtrade.com',
                                    subject: 'New User Processed Credit Card',
                                    templateId: 'd-064dc901efb04c89878f23585cc64d04',
                                    dynamic_template_data: xresults.user,
                                };
                                sgMail.send(msg2).then(() => {
                                }, console.error);


// console.log("about to go to firebase aaa "+xresults.uid)
//
// //                                admin.database().ref('users/' + xresults.uid ).once("value",function(xuser)  {
// //                                admin.database().ref('users/' + xresults.uid ).once("value").then(xuser =>   {
// //                                 admin.database().ref('users/' + xresults.uid).once('value').then(
// //                                         function (xuser) {
//
//
//                                     console.log("did receive value: ")
//                                 //    console.log(xresults.user)
//
//
//                                         console.log("firebase user did exist")
//
//
//
//                                         //ZOHO info for NEW record
//                                         let xCountry="US";
//                                         if(xresults.user.country) {
//                                             if (xresults.user.country.value) {
//                                                 xCountry = xresults.user.country.value
//                                             }
//                                         }
//
// /*
//                                         let xDiscordUserName ="missing discord user name";
//                                         if(xresults.user.discordInfo) {
//                                             if (xresults.user.discordInfo.discriminator && xresults.user.discordInfo.username) {
//                                                 xDiscordUserName = xresults.user.discordInfo.username +"#"+xresults.user.discordInfo.discriminator
//                                             }
//                                         }
// */
//
//                                         //zoho array
//                                         console.log('building record')
//                                         var records = [
//                                             {
// /*                                              Need to get
//                                                 Discord User Name
//
//                                                 Can't find these'
//                                                 "Lead Owner"       : xresults.user.email,
//                                                 "Lead Disposition"       : xresults.user.email,
// //                                                "Lead Disposition (select one)"       : xresults.user.email,
//                                                 "Lead Source"       : xresults.user.email,//none, marketing, organic marketing
// */
//
//                                                 "Lead Source" : xresults.user.refCode||"website",
//                                                 "First Name"  : xresults.user.firstName,
//                                                 "Last Name"   : xresults.user.lastName,
//                                                 "Title"       : xresults.user.jobTitle,
//                                                 "Email"       : xresults.user.email,
//                                                 "Phone"       : xresults.user.phoneCode+"-"+xresults.user.phoneNumber,
//                                                 "Lead Name"       : xresults.user.firstName + " " + xresults.user.lastName,
//                                                 "Lead Status (select one)"       : xresults.user.xpackage,
//                                                 "Trial Start Date"       : xresults.user.signUpTime,
//                                                 "Trial End Date"       : xresults.user.trialExpires,
//
//                                                 "Street"       : xresults.user.address,
//                                                 "City"       : xresults.user.city,
//                                                 "Zip Code"       : xresults.user.zip,
//                                                 "Country"   : xCountry,
//
//                                                 "Flow Trade User Name"       : xresults.user.username,
// //                                                "Discord User Name"       : xDiscordUserName
//                                             }
//                                         ];
//
//                                         console.log(records)
//
//                                       //  zoho.execute('crm', 'Leads', 'insertRecords', records, callback);
// // to pass optional parameters, Trial End Date; Trial Start Date, Lead Source, Lead Owner
//                                         zoho.execute('crm', 'Leads', 'insertRecords', records, {wfTrigger: true}, callback);
//
//                                         var callback = function (err, result) {
//                                             if (err !== null) {
//                                                 console.log(err);
//                                             } else if (result.isError()) {
//                                                 console.log(result.message);
//                                             } else {
//                                                 console.log(result.data);
//                                             }
//                                         }
//
//
//
//                               //  });


                            } else {

                                res.send({err: err})
                            }
                        }
                    );


                }
            );

    })
    return false;
})

exports.Upsell97 = functions.https.onRequest( (req, res) => {
    cors(req, res, async () => {


        console.log('Create Upsell')
        // console.log(req.body)

        let xresults = req.body

        let xstripe = stripe;

        let xplan = "Basic"
        res.setHeader('Access-Control-Allow-Origin', '*');
        //     res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

        let xuserId = req.body.uid;
        let  xuser= await admin.database().ref('users/' + xuserId).once('value')
        xuser=xuser.val();

        if(xuser){
            if (xuser.upsell97 == true) {
                res.send(JSON.stringify({ err: "ALREADYUPSELL" }));
                return;
            }

//  console.log(xresults.payment_method)

            try {
                let xcharge = await xstripe.charges.create({
                    currency: "USD",
                    customer: xuser.stripeID,
                    amount: 9700,
                    description: "Flowtrade 50"
                });

                console.log("XCHARGE--------------");
                console.log(xcharge.status);

                if (xcharge.status != "succeeded") {
                    res.send(JSON.stringify({ err: "CardInvalid" }));

                    return null;
                } else {
                    try {
                        let myName = xuser.firstName;
                        let myEmail = xuser.email;

                        var options = {
                            method: "POST",
                            url: "https://flowtrade.api-us1.com/admin/api.php?api_key=eae0a49c18405fca76499c07c87ee7e904603fb8f27903e1aa98ee648987955bb2c2b8ce&api_action=contact_add&api_output=json",
                            headers: {
                                "Api-Token": "eae0a49c18405fca76499c07c87ee7e904603fb8f27903e1aa98ee648987955bb2c2b8ce",
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                            form: {
                                email: myEmail,
                                first_name: myName,
                                "p[14]": "14",
                                "status[14]": "1",
                                "instantresponders[14]": "1",
                            },
                        };
                        request(options, function (error, response) {
                            if (error) throw new Error(error);
                            let result;
                            result = JSON.parse(response.body);
                        });
                    } catch (ex) {}

                    res.send(JSON.stringify({ success: true }));
                    admin
                        .database()
                        .ref("users/" + xuserId + "/upsell97")
                        .set(true);
                }
            } catch (ex) {
                xstripe = stripetest;
                let xcharge = await xstripe.charges.create({
                    currency: "USD",

                    customer: xuser.stripeID,
                    amount: 9700,
                    statement_descriptor: "FlowTradeFT5 Indicator",
                    statement_descriptor_suffix: "FlowTradeFT50Indicator",
                });

                console.log("XCHARGE--------------");
                console.log(xcharge.status);

                if (xcharge.status != "succeeded") {
                    res.send(JSON.stringify({ err: "CardInvalid" }));

                    return null;
                } else {
                    try {
                        let myName = xuser.firstName;
                        let myEmail = xuser.email;

                        var options = {
                            method: "POST",
                            url: "https://flowtrade.api-us1.com/admin/api.php?api_key=eae0a49c18405fca76499c07c87ee7e904603fb8f27903e1aa98ee648987955bb2c2b8ce&api_action=contact_add&api_output=json",
                            headers: {
                                "Api-Token": "eae0a49c18405fca76499c07c87ee7e904603fb8f27903e1aa98ee648987955bb2c2b8ce",
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                            form: {
                                email: myEmail,
                                first_name: myName,
                                "]": "14",
                                "status[14]": "1",
                                "instantresponders[14]": "1",
                            },
                        };
                        request(options, function (error, response) {
                            if (error) throw new Error(error);
                            let result;
                            result = JSON.parse(response.body);
                        });
                    } catch (ex) {}

                    res.send(JSON.stringify({ success: true }));
                    admin
                        .database()
                        .ref("users/" + xuserId + "/upsell97")
                        .set(true);
                }
            }
        }else{
            res.send(JSON.stringify({ err: "UIDNOTFOUND" }));
        }
    })
    return false;
})

exports.UpsellNew = functions.https.onRequest( (req, res) => {
    cors(req, res, async () => {


        console.log('Create Upsell')
        // console.log(req.body)

        let xresults = req.body

        let xstripe = stripe;

        let xplan = "Basic"
        res.setHeader('Access-Control-Allow-Origin', '*');
        //     res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

        let xuserId = req.body.uid;
        let  xuser= await admin.database().ref('users/' + xuserId).once('value')
        xuser=xuser.val();

        if(xuser){
            if (xuser.upsell97 == true) {
                res.send(JSON.stringify({ err: "ALREADYUPSELL" }));
                return;
            }

//  console.log(xresults.payment_method)

            try {
                let xcharge = await xstripe.charges.create({
                    currency: "USD",
                    customer: xuser.stripeID,
                    amount: 19700,
                    description: "Flowtrade 50"
                });

                console.log("XCHARGE--------------");
                console.log(xcharge.status);

                if (xcharge.status != "succeeded") {
                    res.send(JSON.stringify({ err: "CardInvalid" }));

                    return null;
                } else {
                    try {
                        let myName = xuser.firstName;
                        let myEmail = xuser.email;

                        var options = {
                            method: "POST",
                            url: "https://flowtrade.api-us1.com/admin/api.php?api_key=eae0a49c18405fca76499c07c87ee7e904603fb8f27903e1aa98ee648987955bb2c2b8ce&api_action=contact_add&api_output=json",
                            headers: {
                                "Api-Token": "eae0a49c18405fca76499c07c87ee7e904603fb8f27903e1aa98ee648987955bb2c2b8ce",
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                            form: {
                                email: myEmail,
                                first_name: myName,
                                "p[14]": "14",
                                "status[14]": "1",
                                "instantresponders[14]": "1",
                            },
                        };
                        request(options, function (error, response) {
                            if (error) throw new Error(error);
                            let result;
                            result = JSON.parse(response.body);
                        });
                    } catch (ex) {}

                    res.send(JSON.stringify({ success: true }));
                    admin
                        .database()
                        .ref("users/" + xuserId + "/upsell97")
                        .set(true);
                }
            } catch (ex) {
                xstripe = stripetest;
                let xcharge = await xstripe.charges.create({
                    currency: "USD",

                    customer: xuser.stripeID,
                    amount: 19700,
                    statement_descriptor: "FlowTradeFT5 Indicator",
                    statement_descriptor_suffix: "FlowTradeFT50Indicator",
                });

                console.log("XCHARGE--------------");
                console.log(xcharge.status);

                if (xcharge.status != "succeeded") {
                    res.send(JSON.stringify({ err: "CardInvalid" }));

                    return null;
                } else {
                    try {
                        let myName = xuser.firstName;
                        let myEmail = xuser.email;

                        var options = {
                            method: "POST",
                            url: "https://flowtrade.api-us1.com/admin/api.php?api_key=eae0a49c18405fca76499c07c87ee7e904603fb8f27903e1aa98ee648987955bb2c2b8ce&api_action=contact_add&api_output=json",
                            headers: {
                                "Api-Token": "eae0a49c18405fca76499c07c87ee7e904603fb8f27903e1aa98ee648987955bb2c2b8ce",
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                            form: {
                                email: myEmail,
                                first_name: myName,
                                "]": "14",
                                "status[14]": "1",
                                "instantresponders[14]": "1",
                            },
                        };
                        request(options, function (error, response) {
                            if (error) throw new Error(error);
                            let result;
                            result = JSON.parse(response.body);
                        });
                    } catch (ex) {}

                    res.send(JSON.stringify({ success: true }));
                    admin
                        .database()
                        .ref("users/" + xuserId + "/upsell97")
                        .set(true);
                }
            }
        }else{
            res.send(JSON.stringify({ err: "UIDNOTFOUND" }));
        }
    })
    return false;
})

exports.CheckUpsell97 = functions.https.onRequest( (req, res) => {
    cors(req, res, async () => {
        let xresults = req.body

        res.setHeader('Access-Control-Allow-Origin', '*');
        //     res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

        let xuserId = req.body.uid;
        let  xuser= await admin.database().ref('users/' + xuserId).once('value')
        xuser=xuser.val();

        if(xuser){
            if (xuser.upsell97 == true) {
                res.send(JSON.stringify({ response: "ALREADYUPSELL" }));
                return;
            }else{
                res.send(JSON.stringify({ response: "NEWUSER" }));
                return;
            }
        }else{
            res.send(JSON.stringify({ response: "UIDNOTFOUND" }));
            return;
        }
    })
    return false;
})

exports.Upsell2 = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        console.log("Create Payment");
        console.log(req.body);

        let xresults = req.body;

        let xstripe = stripe;


        res.setHeader("Access-Control-Allow-Origin", "*");
        //     res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081');

        // Request methods you wish to allow
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

        // Request headers you wish to allow
        res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader("Access-Control-Allow-Credentials", true);

        let xuser = await admin.database().ref('users/' + xresults.uid).once('value');

        xuser = xuser.val()

        if(xuser){
            let savePlan = "";

            if (xresults.plan == "monthly") {
                savePlan = "Monthly";
            } else if (xresults.plan == "yearly") {
                savePlan = "Yearly";
            }

            if (xuser.membership == "Monthly" || xuser.membership == "Yearly") {
                res.send(JSON.stringify({ err: "ALREADYUPSELL" }));
                return;
            }

            try {
                let xcharge = await xstripe.charges.create({
                    currency: "USD",
                    customer: xuser.stripeID,
                    amount: 100,
                    description: "Flowtrade PreAuth",
                    capture: false,
                });

                console.log("XCHARGE--------------");
                console.log(xcharge.status);

                if (xcharge.status != "succeeded") {
                    res.send(JSON.stringify({ err: "CardInvalid" }));

                    return null;
                } else {
                    let xplan = "";
                    let xcoupon = "";

                    if (xresults.plan == "monthly") {
                        xplan = "plan_GxxZabwYdb1JsN";
                        xcoupon = "24AZfCMo";
                    } else {
                        xplan = "price_1HA7QED48AfiHVvUxjmgpYMf";
                        xcoupon = "pd2P0NKF";
                    }

                    let xobject = {
                        customer: xuser.stripeID,
                        items: [{ plan: xplan }],
                        expand: ["latest_invoice.payment_intent"],
                        coupon: xcoupon,
                    };

                    if (xresults.salesTax == true) {
                        if (xresults.isTestCard == true) {
                            xobject.default_tax_rates = ["txr_1GQ4imD48AfiHVvUKtYi9Pqk"];
                        } else {
                            xobject.default_tax_rates = ["txr_1GLrVjD48AfiHVvUXPBbGo7j"];
                        }
                    }

                    xstripe.subscriptions.del(xuser.subID);

                    xstripe.subscriptions.create(xobject, function (err, subscription) {
                        if (err == null) {
                            console.log("Created Subscription");
                            console.log(subscription);

                            admin
                                .database()
                                .ref("paymentResponse/" + xresults.uid)
                                .set({
                                    customerId: xuser.stripeID,
                                    subid: subscription.id,
                                });

                            admin
                                .database()
                                .ref("users/" + xresults.uid + "/paymentStatus")
                                .set("Paid");
                            admin
                                .database()
                                .ref("users/" + xresults.uid + "/subID")
                                .set(subscription.id);
                            admin
                                .database()
                                .ref("stripeSubs/" + subscription.id)
                                .set(xresults.uid);
                            admin
                                .database()
                                .ref("users/" + xresults.uid + "/membership")
                                .set(savePlan);

                            res.send(JSON.stringify({ success: true, customerId: xuser.stripeID, subid: subscription.id }));
                        } else {
                            res.send({ err: err });
                        }
                    });
                }
            } catch (ex) {
                let xstripe = stripetest;
                let xcharge = await xstripe.charges.create({
                    currency: "USD",
                    customer: xuser.stripeID,
                    amount: 100,
                    description: "Flowtrade PreAuth",
                    capture: false,
                });

                console.log("XCHARGE--------------");
                console.log(xcharge.status);

                if (xcharge.status != "succeeded") {
                    res.send(JSON.stringify({ err: "CardInvalid" }));

                    return null;
                } else {
                    let xplan = "";
                    let xcoupon = "";

                    if (xresults.plan == "monthly") {
                        xplan = "plan_GtEWluhrqQ4YRG";
                        xcoupon = "UXHnDpcZ";
                    } else {
                        xplan = "price_1Ifq5xD48AfiHVvUxhzr5LMm";
                        xcoupon = "otAZkbzo";
                    }

                    let xobject = {
                        customer: xuser.stripeID,
                        items: [{ plan: xplan }],
                        expand: ["latest_invoice.payment_intent"],
                        coupon: xcoupon,
                    };

                    if (xresults.salesTax == true) {
                        if (xresults.isTestCard == true) {
                            xobject.default_tax_rates = ["txr_1GQ4imD48AfiHVvUKtYi9Pqk"];
                        } else {
                            xobject.default_tax_rates = ["txr_1GLrVjD48AfiHVvUXPBbGo7j"];
                        }
                    }
                    xstripe.subscriptions.del(xuser.subID);
                    xstripe.subscriptions.create(xobject, function (err, subscription) {
                        if (err == null) {
                            console.log("Created Subscription");
                            console.log(subscription);

                            admin
                                .database()
                                .ref("paymentResponse/" + xresults.uid)
                                .set({
                                    customerId: xuser.stripeID,
                                    subid: subscription.id,
                                });

                            admin
                                .database()
                                .ref("users/" + xresults.uid + "/paymentStatus")
                                .set("Paid");
                            admin
                                .database()
                                .ref("users/" + xresults.uid + "/subID")
                                .set(subscription.id);
                            admin
                                .database()
                                .ref("stripeSubs/" + subscription.id)
                                .set(xresults.uid);

                            admin
                                .database()
                                .ref("users/" + xresults.uid + "/membership")
                                .set(savePlan);

                            res.send(JSON.stringify({ success: true, customerId: xuser.stripeID, subid: subscription.id }));
                        } else {
                            res.send({ err: err });
                        }
                    });
                }
            }
        }else{
            res.send(JSON.stringify({ err: "UIDNOTFOUND" }));
        }
    });
    return false;
});

exports.Checkout97 = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        console.log(req);
        console.log("Create Payment");
        //  console.log(req.body)
        res.setHeader("Access-Control-Allow-Origin", "*");
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");

        // Request headers you wish to allow
        res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type");

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader("Access-Control-Allow-Credentials", true);

        let xresults = req.body;

        let isTrial = false;

        admin
            .database()
            .ref("users/" + xresults.uid)
            .set(xresults.user);

        admin
            .database()
            .ref("users/" + xresults.uid)
            .once("value")
            .then(async function (xxuser) {
                xresults.user = xxuser.val();

                console.log("DID GET NEW USER FROM BACKEND");

                let xstripe = stripe;
                let coupon = "nd3YeObV";

                let xplan = "Basic";

                if (xresults.plan == "Trial") {
                    xplan = "plan_GxxZabwYdb1JsN";
                    isTrial = true;
                }

                if (xresults.isTestCard == true) {
                    xstripe = stripetest;
                    coupon = "LxLevFkG";
                    console.log("USING TEST STRIPE CREDENTIALS");

                    //            Test Plans
                    xplan = "plan_GtE8FESGZnpwXH";
                    if (xresults.plan == "Trial") {
                        xplan = "plan_GtEWluhrqQ4YRG";
                        isTrial = true;
                    }
                }

                //refCode - affiliate FB ID
                let refCode = "";
                if (xresults.user) {
                    refCode = xresults.user.refCode || "";

                    if (xresults.user.subID) {
                        //there is an existing subscription.

                        let subscription = await xstripe.subscriptions.retrieve(xresults.user.subID);

                        console.log("YOu have an existing subscription, and its data is:" + subscription.items.data[0].status);
                        //     console.log(subscription)

                        if (subscription.items.data[0].status != "canceled") {
                            console.log("PREVENTING DUPLICATE Subscription");
                            res.send(JSON.stringify({ customerId: xresults.user.stripeID, subid: xresults.user.subID }));

                            return null;
                        }
                    }
                }

                console.log("Retrieving payment method");

                xstripe.paymentMethods.retrieve(xresults.payment_method_id, function (err, paymentMethod) {
                    // asynchronously called

                    console.log("Got Payment method");

                    xstripe.customers.create(
                        {
                            source: xresults.token.id,
                            description: xresults.uid,
                            metadata: {
                                refCode: refCode,
                                firstName: xresults.user.firstName,
                                lastName: xresults.user.lastName
                            },
                            payment_method: xresults.payment_method_id,
                            email: xresults.email,
                            name: xresults.user.firstName + " " + xresults.user.lastName,
                            invoice_settings: {
                                default_payment_method: xresults.payment_method_id,
                            },
                        },
                        async function (err, customer) {
                            if (err != null) {
                                console.log("Error Creating Customer");
                                console.log(err.message);

                                res.send(JSON.stringify({ err: err.message }));
                                return false;
                            } else {
                                console.log("Success Create Customer");
                                //  console.log(err)
                            }

                            try {
                                if (paymentMethod.card.fingerprint) {
                                    await admin
                                        .database()
                                        .ref("fingerprints/" + paymentMethod.card.fingerprint)
                                        .set(true);
                                }
                                if (xresults.user.email == "testing@flowtrade.com") {
                                    let xstring = new Date().getFullYear() + "_" + new Date().getDate() + "_" + new Date().getMonth() + "__" + new Date().getHours();

                                    await admin
                                        .database()
                                        .ref("automatedTesting/BasicFlow/" + xstring + "/paymentSuccess")
                                        .set(new Date().getTime());
                                }
                            } catch (ex) {}

                            let xobject = {
                                customer: customer.id,
                                items: [{ plan: xplan }],
                                expand: ["latest_invoice.payment_intent"],
                            };

                            if (xresults.plan == "Trial") {
                                console.log("Did Set trial period for user");

                                xobject.trial_period_days = 7;
                            }

                            xobject.coupon = coupon;

                            if (xresults.salesTax == true) {
                                if (xresults.isTestCard == true) {
                                    xobject.default_tax_rates = ["txr_1GQ4imD48AfiHVvUKtYi9Pqk"];
                                } else {
                                    xobject.default_tax_rates = ["txr_1GLrVjD48AfiHVvUXPBbGo7j"];
                                }
                            }

                            console.log("Time to create a payment intent::: " + customer.id);

                            let xcharge = await xstripe.charges.create({
                                amount: 100,
                                currency: "usd",
                                description: "Funnel PreAuth97",
                                capture: false,
                                customer: customer.id,
                            });

                            console.log("XCHARGE--------------");
                            console.log(xcharge.status);

                            if (xcharge.status != "succeeded") {
                                res.send(JSON.stringify({ err: "CardInvalid" }));

                                return null;
                            }

                            console.log("Creating subscription...");

                            xstripe.subscriptions.create(xobject, function (err, subscription) {
                                if (err == null) {
                                    console.log("Created Subscription");
                                    console.log(subscription);

                                    admin
                                        .database()
                                        .ref("users/" + xresults.uid + "/paymentStatus")
                                        .set("Paid");

                                    if (xresults.plan == "yearly") {
                                        admin
                                            .database()
                                            .ref("users/" + xresults.uid + "/billingPeriod")
                                            .set("Yearly");
                                    } else {
                                        admin
                                            .database()
                                            .ref("users/" + xresults.uid + "/billingPeriod")
                                            .set("Monthly");
                                    }

                                    admin
                                        .database()
                                        .ref("users/" + xresults.uid + "/stripeID")
                                        .set(customer.id);
                                    admin
                                        .database()
                                        .ref("users/" + xresults.uid + "/subID")
                                        .set(subscription.id);
                                    admin
                                        .database()
                                        .ref("stripeSubs/" + subscription.id)
                                        .set(xresults.uid);
                                    admin
                                        .database()
                                        .ref("users/" + xresults.uid + "/trialExpires")
                                        .set(new Date().getTime() + 60000 * 60 * 24 * 7);

                                    admin
                                        .database()
                                        .ref("paymentStatus/" + xresults.uid)
                                        .set("Paid");
                                    res.send(JSON.stringify({ success: true, customerId: customer.id, subid: subscription.id }));
                                    console.log("Checking Ref:" + refCode);

                                    const msg3 = {
                                        to: xresults.user.email,
                                        from: "noreply@flowtrade.com",
                                        subject: "Welcome To FlowTrade - Subscription Initialized",
                                        templateId: "d-8119cab66d454a50898acb11d73b842c",
                                    };
                                    sgMail.send(msg3).then(() => {}, console.error);

                                    xresults.user.isTrial = true;

                                    if (xresults.plan != "Trial") {
                                        xresults.user.isTrial = false;
                                    }
                                    const msg2 = {
                                        to: "purchases@flowtrade.com",
                                        from: "noreply@flowtrade.com",
                                        subject: "New User Processed Credit Card",
                                        templateId: "d-064dc901efb04c89878f23585cc64d04",
                                        dynamic_template_data: xresults.user,
                                    };
                                    sgMail.send(msg2).then(() => {}, console.error);

                                    const msg = {
                                        to: xresults.user.email,
                                        from: "noreply@flowtrade.com",
                                        subject: "Welcome To FlowTrade - Subscription Initialized",
                                        templateId: "d-8119cab66d454a50898acb11d73b842c",
                                    };
                                    sgMail.send(msg).then(() => {}, console.error);
                                }
                            });
                        }
                    );
                });
            });
    });
    return false;
});

exports.PaypalUpsell97 = functions.https.onRequest( (req, res) => {
    cors(req, res, async () => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        //     res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8081');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);

        let xuserId = req.body.uid;

        admin.database().ref("users/" + xuserId + "/upsell97").set(true);
        res.send(JSON.stringify({ success: true }));
    })
})

exports.CreatePaymentIntent = functions.https.onRequest((req, res) => {
    cors(req, res, () => { // For Firebase Hosting URIs, use req.headers['fastly-client-ip']
        // For callable functions, use rawRequest
        // Some users have better success with req.headers['x-appengine-user-ip']
        //   const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        //  const message = JSON.stringify({ip: ipAddress});
        //  const message = util.format("<pre>Hello world!\n\nYour IP address: %s\n\nRequest headers: %s</pre>", ipAddress, headers);


        console.log('Create Payment Intnet')

        let xresults = req.body


        let xstripe = stripe;

        if (xresults.isTestCard == true) {
            xstripe = stripetest;
        }
        let samount = xresults.amount * 100;
        if (xresults.salesTax == true) {

            samount = parseFloat(samount * 1.105)


        }

        let title = "Yearly Membership";
        if (xresults.indicator) {
            title = xresults.indicator + "-" + xresults.platform
        }

        let xpayment = {
            amount: 10,
            currency: 'usd',
            payment_method_types: ['card'],
            statement_descriptor: title,
        };

        console.log(xpayment)


        console.log('Create Payment Intent')
        const intent = xstripe.paymentIntents.create(xpayment,
            function (err, paymentIntent) {
                // asynchronously called
                console.log(err)
//console.log(paymentIntent)
                res.setHeader('Access-Control-Allow-Origin', '*');
//                res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8082');
                res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

                // Request methods you wish to allow
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

                // Request headers you wish to allow
                res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

                // Set to true if you need the website to include cookies in the requests sent
                // to the API (e.g. in case you use sessions)
                res.setHeader('Access-Control-Allow-Credentials', true);
                console.log('Intent Key' + paymentIntent.client_secret)
                res.send(JSON.stringify({client_secret: paymentIntent.client_secret}));


            })


    })
});

// send coach email about user assign
exports.assignCoachToUser = functions.https.onCall(async (data, context) => {
    if (!context.auth && !context.auth.token.email) {
        throw new functions.https.HttpsError('failed-precondition', 'Must be logged in')
    }
    // get coach
    const coach = {
        name: data.coachUsername,
        email: data.coachEmail,
        avatar: data.coachAvatar
    }
    // get user
    const user = {
        name: data.userUserName,
        email: data.userEmail,
        avatar: data.userAvatar
    }

    // send email to coach
    const msgToCoach = {
        to: coach.email,
        from: 'noreply@flowtrade.com',
        subject: 'User assigned for coaching',
        templateId: 'd-8b8ab50dc0854a42b4cb1aef702cb051',
        dynamic_template_data: {
            displayName: user.name,
            avatar: user.avatar
        }
    };
    await sgMail.send(msgToCoach).then(() => {
    }, console.error);

    // send email to user
    const msgToUser = {
        to: user.email,
        from: 'noreply@flowtrade.com',
        subject: 'Coach assigned',
        templateId: 'd-33b26dd593504994abe59944c7ce03b0',
        dynamic_template_data: {
            displayName: coach.name,
            avatar: coach.avatar
        }
    };
    await sgMail.send(msgToUser).then(() => {
    }, console.error);


    return {success: true};
})

// exports.assignCoachToUser = functions.database
//     .ref('/users/{userId}/assignedTo/{coachId}')
//     .onWrite((change, context) => {
//         console.log('COACH ASSIGNED : ', context.params.coachId)
//         console.log('TO USER: ', context.params.userId)
//     });

// exports.assignUserToCoachEmail = functions.database
//     .ref('/users/{coachId}/team/{userId}')
//     .onWrite((change, context) => {
//         console.log('USER ASSIGNED : ', context.params.userId)
//         console.log('TO COACH: ', context.params.coachId)
//     });


exports.GetInvoiceHistory = functions.https.onRequest((req, res) => {
    console.log('GET INVOICE HISTORY')
    cors(req, res, () => { // For Firebase Hosting URIs, use req.headers['fastly-client-ip']


        stripe.charges.list(
            {limit: 12, customer: req.body.customerId},
            function (err, invoiceItems) {
                // asynchronously called
                console.log('GOt CHARGES')
                res.setHeader('Access-Control-Allow-Origin', '*');
//                res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8082');
                //  res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

                // Request methods you wish to allow
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

                // Request headers you wish to allow
                res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
                console.log(invoiceItems)
                // Set to true if you need the website to include cookies in the requests sent
                // to the API (e.g. in case you use sessions)
                res.setHeader('Access-Control-Allow-Credentials', true);
                res.send(JSON.stringify(invoiceItems));


            }
        );

    })
})

exports.GetUpcomingInvoice = functions.https.onRequest((req, res) => {
    cors(req, res, () => { // For Firebase Hosting URIs, use req.headers['fastly-client-ip']

        stripe.invoices.retrieveUpcoming(
            {customer: req.body.customerId},
            function (err, upcoming) {
                // asynchronously called


                res.setHeader('Access-Control-Allow-Origin', '*');
//                res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8082');
                res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

                // Request methods you wish to allow
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

                // Request headers you wish to allow
                res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

                // Set to true if you need the website to include cookies in the requests sent
                // to the API (e.g. in case you use sessions)
                res.setHeader('Access-Control-Allow-Credentials', true);
                res.send(JSON.stringify(upcoming));


            }
        );

    })
})



//"exports" assigns "newZohoUser" as a function in Firebase.  Allows us to use triggers from FB events...
//users/{uid}/validating knows whoever is using this function because they will have written to this spot

//Only getting people who put their credit card in, not just users who didn't get to the sign up process
// async function createZohoUser(xuser) {
//     console.log('accessed createZohoUser')
//
//     console.log(xuser.val())
//
//     let xCountry = "US";
//     if (xuser.val().country) {
//         if (xuser.val().country.value) {
//             xCountry = xuser.val().country.value
//         } else {
//             xCountry = xuser.val().country
//         }
//     }
//     console.log("filling records")
//
//     var muser = xuser.val()
//     /*
//         var records = [
//             {
//                 /!*                                              Need to get
//                  Discord User Name
//
//                  Can't find these'
//                  "Lead Owner"       : xresults.user.email,
//                  "Lead Disposition"       : xresults.user.email,
//                  "Lead Disposition (select one)"       : xresults.user.email,
//                  "Lead Source"       : xresults.user.email,none, marketing, organic marketing
//                 *!/
//
//                 "Lead Source": muser.refCode || "website",
//                 "First Name": muser.firstName,
//                 "Last Name": muser.lastName,
//                 "Title": muser.jobTitle,
//                 "Email": muser.email,
//                 "Phone": muser.phoneCode + "-" + muser.phoneNumber,
//                 "Lead Name": muser.firstName + " " + muser.lastName,
//                 "Lead Status (select one)": muser.xpackage,
//                 "Trial Start Date": muser.signUpTime,
//                 "Trial End Date": muser.trialExpires,
//
//                 "Street": muser.address,
//                 "City": muser.city,
//                 "Zip Code": muser.zip,
//                 "Country": xCountry,
//
//                 "Flow Trade User Name": muser.username,
//     //     "Discord User Name"       : xDiscordUserName
//             }
//         ];
//     */
//     var records = [
//         {
//             "Lead Source": "website",
//             "First Name": "aRick",
//             "Last Name": "Najjar",
//             "Email": "najjar.rick@gmail.com",
//             "Phone": "440-590-1977",
//             "Lead Name": "George Wilson",
//         }
//     ];
//
//     console.log(records)
//
//     zoho.execute('crm', 'Leads', 'insertRecords', records, callback);
//
//
//     var callback = function (err, result) {
//         if (err !== null) {
//             console.log(err);
//         } else if (result.isError()) {
//             console.log(result.message);
//         } else {
//             console.log(result.data);
//         }
//     }
//
//
//     console.log("It zohoed1")
// //    console.log(zoho)
//     console.log("It zohoed2")
//     return;
//
// //   zoho.execute('crm', 'Leads', 'insertRecords', records, {wfTrigger: true})
//     /*
//
//         try {
//
//
//                 zoho.execute('crm', 'Leads', 'insertRecords', records, {wfTrigger: true}, function (err, result) {
//
//                 if (err !== null) {
//                     console.log(err);
//                 } else if (result.isError()) {
//                     console.log(result.message);
//                 } else {
//                     console.log(result.data);
//                 }
//             });
//         } catch(ex
//
//
//         ){
//             console.log("error here today")
//             console.log(ex)
//         }
//
//     */
//
//
// }


// exports.newZohoUser = functions.database.ref('users/{uid}/paymentDate').onWrite((event, context) => {
// //on the page checkoutForm for more info
//     console.log("creating new zohouser for FireBase ID  " + context.params.uid)
//     //grabs the whole user as 'xuser'
//
//
// //    admin.database().ref('users/' + context.params.uid)        .once('value').then(createZohoUser);
//
//
//     var records = [
//         {
//             "Lead Source": "website",
//             "First Name": "aRick",
//             "Last Name": "Najjar",
//             "Email": "najjar.rick@gmail.com",
//             "Phone": "440-590-1977",
//             "Lead Name": "George Wilson",
//         }
//     ];
//
//     console.log(records)
//
// //    zoho.execute('crm', 'Leads', 'insertRecords', records,  {wfTrigger: true}, callback);
//     zoho.execute('crm', 'Leads', 'insertRecords', records, callback);
//
//     console.log("it zohoed1")
//
//     var callback = function (err, result) {
//         if (err !== null) {
//             console.log("err !== null")
//             console.log(err);
//         } else if (result.isError()) {
//             console.log("result.isError()")
//             console.log(result.message);
//         } else {
//             console.log("else")
//             console.log(result.data);
//         }
//     }
//
// //    let varUsersList = zoho.crm.getRecords("users");
// //    console.log(varUsersList)
//
//
//     console.log("It zohoed2b")
//
//     return true;
//     /*
//
//     const coleccionRef = admin.database().ref('users/' + context.params.uid);
//     coleccionRef.once('value').then( snapshot => {
//         createZohoUser(snapshot)
//     }, error => {
//         console.error(error);
//     });
//
//     console.log("got past function createZohoUser call")
//     return false*/
// })


//rrr


exports.upsellCoupon = functions.database.ref('users/{uid}/upsellCoupon')
    .onWrite(async (event, context) => {


        console.log('adjustStripeTrialEndDate started-------------------')
        //let dateFirstExtended = event.after._data
        let uid = context.params.uid

        admin.database().ref('users/' + uid).once('value').then(
            async function (xuser) {

try {
    stripe.subscriptions.update(
        xuser.val().subID, {
            coupon: "to7WKw4U"
        }
    );
}catch(ex){

}
                stripetest.subscriptions.update(
                    xuser.val().subID,{
                        coupon:"dRd0a7Qs"
                    }

                );







                return false
            })




        return false

            })








        exports.adjustStripeTrialEndDate = functions.database.ref('users/{uid}/dateFirstExtended')
    .onWrite(async (event, context) => {

        //Starts here for any user, then, in this function, pushes {user} to /dateFirstExtended, picked up in app.js onWrite

        console.log('adjustStripeTrialEndDate started-------------------')
        //let dateFirstExtended = event.after._data
        let uid = context.params.uid

        admin.database().ref('users/' + uid).once('value').then(
            await function (xuser) {

                xuser = xuser.val();

                console.log('trialExpires for ' + uid, '  to ', moment(xuser.trialExpires).format("M/D/YY"))


                if (xuser.subID) {
                    console.log("found stripe, extending now for ", uid, "  zohoID: ",
                        xuser.zohoID, " to ", moment(xuser.trialExpires).format("M/D/YY"))

                    /*
                                        let xobject = {
                                            customer: xuser.subID,
                    /!*                        items: [{plan: xplan}],
                                            expand: ["latest_invoice.payment_intent"]*!/

                                        };
                    */

                    console.log(xuser.trialExpires, " is Stripe trial_end, ", xuser.trialExpires)

                    stripe.subscriptions.update(
                        xuser.subID,
                        {
                            proration_behavior: 'none',
                            trial_end: parseInt(xuser.trialExpires / 1000),
                        },

                        function (err, confirmation) {
                            console.log('adjusted Stripe trial_End date to ', moment(xuser.trialExpires).format("M/D/YY"))
                            console.log(confirmation)

                            if (confirmation == null) {
                                console.log("stripeTest  subID: ", xuser.subID, "   trialExpires: ", moment(xuser.trialExpires).format("M/D/YY"),
                                    "------------------------------------")
                                stripetest.subscriptions.update(xuser.subID, {
                                        proration_behavior: 'none',
                                        trial_end: parseInt(xuser.trialExpires / 1000),
                                    },
                                    function (err, confirmation) {
                                        console.log('adjusted Stripe TEST,', xuser.subID, ' trial_End date to ', moment(xuser.trialExpires).format("M/D/YY"))
                                        console.log(confirmation)
                                    }
                                );
                            }


                        }
                    );
                    admin.database().ref().child('dateFirstExtended')
                        .push(xuser)
//                        .push({trialExpires: xuser.trialExpires, uid: uid, zohoID: xuser.zohoID,})


                }

                //zoho should be adjusted by the onWrite to dateFirstExtended in app.js
                //updateZohoTrialEndsNew(xuser)


                const email = xuser.email; // The email of the xuser.
                const displayName = xuser.firstName + " " + xuser.lastName

                console.log('Messaging Admin ' + email)

                // send email to admin if xuser canceled in trial period
                const msgToAdmin = {
                    to: 'purchases@flowtrade.com',
                    from: 'bot@flowtrade.com',
                    subject: 'Trial extended to ' + moment(xuser.trialExpires).format("M/D/YY"),
                    templateId: 'd-1d835f82cde94030aec1d8eb5fd2bf7d',
                    dynamic_template_data: {
                        email: email,
                        displayName: displayName,
                        trialExpires: moment(xuser.trialExpires).format("M/D/YY"),
                    }
                };
                sgMail.send(msgToAdmin).then(() => {
                }, console.error);

                console.log('Messaginge User Trial extended ' + email)

                const msgToUser = {
                    to: email,
                    from: 'noreply@flowtrade.com',
                    subject: 'Your FREE trial period was extended',
                    templateId: 'd-75403e08bb8a4137a04b8a4c30a21d78',
                    dynamic_template_data: {
                        email: email,
                        displayName: displayName,
                        trialExpires: moment(xuser.trialExpires).format("M/D/YY"),
                    }
                };
                sgMail.send(msgToUser).then(() => {
                }, console.error);


                //sending an email to the affiliate, if the affiliate exists
                if (xuser.refCode != '' && xuser.refCode.length == 28) {
                    admin.database().ref('users/' + xuser.refCode + '/email').once('value').then(
                        function (affiliateEmail) {
                            console.log('Messaging Affiliate Trial Extended ' + affiliateEmail)

                            const affiliateMsg = {
                                to: affiliateEmail.val(),
                                from: 'noreply@flowtrade.com',
                                subject: 'Hey!  A referal of yours, ' + displayName + ' extended their trial to ' + moment(xuser.trialExpires).format("M/D/YY"),
                                templateId: 'd-ad1a8dd4ebdd4077b67df9738e398e72',
                                dynamic_template_data: xuser,
                            };
                            sgMail.send(affiliateMsg).then(() => {
                            }, console.error);

                        })
                }


            })

        return false
    })
;

//rrr
exports.adjustStripeSubscriptionAmount = functions.database.ref('users/{uid}/adjustStripeSubscriptionAmount')
    .onWrite((event, context) => {

        //Starts here for any user, then, in this function, pushes {user} to /dateFirstExtended, picked up in app.js onWrite

        let consoleLogVersion = 178
        //let dateFirstExtended = event.after._data
        let uid = context.params.uid

        console.log(consoleLogVersion + " started for uid: " + uid)

        admin.database().ref('users/' + uid).once('value').then(
            async function (xuser) {


                xuser = xuser.val();
                //Unit amount cannot be changed.  Create a new coupon, and apply it to this CUSTOMER, not to the Subscription
                //Original price is 19900.  a percent_off = 100 is 100% off.
                //To get to a $99 price, need to discount 19900 to end up with 9900
                let newAmount = xuser.adjustStripeSubscriptionAmount
                let couponAmountOff = 19900 - (xuser.adjustStripeSubscriptionAmount * 100)
                let couponID = '199DiscountTo' + xuser.adjustStripeSubscriptionAmount.toString()

                //Just delete any other coupons and don't add one
                if (19900 == (xuser.adjustStripeSubscriptionAmount * 100)) {
                    couponID = ""
                }

                let userEmail = xuser.email
                let userStripeID = xuser.stripeID//updating the customer, not the subscription
                let userSubID = xuser.subID//updating the customer, not the subscription

                console.log(consoleLogVersion + .1 + "  email: " + userEmail + "   stripeID: " + userStripeID + "   newAmount: " + newAmount)


                if (userStripeID) {

                    //zoho should be adjusted by the onWrite to dateFirstExtended in app.js
                    //updateZohoSubscription(xuser)


                    //To get the async, each step is one at a time instead of await...

                    stripe.subscriptions.retrieve(userSubID,
                        function (err, confirmation) {
                            console.log(consoleLogVersion + .2 + " 1st try in NORMAL        confirmation: " + confirmation + '   err: ' + err)


                            //Found it, keep going
                            if (confirmation != undefined && confirmation != null) {
                                console.log(consoleLogVersion + .3 + " and it worked " + confirmation.items.data[0].id + '   confirmation: ' + confirmation + ', now retrieve coupon...')


                                if (couponID == '') {

                                    stripe.customers.deleteDiscount(
                                        userStripeID,
                                        function (err, confirmation) {

                                            console.log(consoleLogVersion + .8 + " user updated to $199, sending email, adjusting /uid/amountPaidNew")
                                            admin.database().ref('users/' + uid + '/amountPaidNew').set(newAmount);
                                            sendsEmailsFromadjustStripeSubscriptionAmount(1, xuser, newAmount, consoleLogVersion)
                                            setTimeout(() => {

                                                firebase
                                                    .database()
                                                    .ref(`profileUpdated/${uid}`)
                                                    .set(this.state.uid)
                                            }, 1000)

                                            return false
                                        })
                                } else {

                                    //See if coupon exists, use it if yes, else, create it.  Need FULL code duplicated with each path

                                    stripe.coupons.retrieve(
                                        couponID, function (err, confirmation) {
                                            console.log(consoleLogVersion + .4 + " confirmation & err: ", confirmation, "  ", err)

                                            if (confirmation != null && confirmation != undefined) {
                                                console.log(consoleLogVersion + .5 + " using existing coupon " + couponID + ', now updating customer')

                                                //If there's a coupon, delete it first
                                                stripe.customers.deleteDiscount(
                                                    userStripeID,
                                                    function (err, confirmation) {
                                                        // asynchronously called


                                                        stripe.customers.update(userStripeID, {
                                                                coupon: couponID
                                                            },
                                                            function (err, confirmation) {
                                                                if (confirmation != null) {
                                                                    console.log(consoleLogVersion + .8 + " user updated confirmation: " + confirmation + " and err: " + err + ', sending email, adjusting /uid/amountPaidNew')
                                                                    admin.database().ref('users/' + uid + '/amountPaidNew').set(newAmount);

                                                                    sendsEmailsFromadjustStripeSubscriptionAmount(1, xuser, newAmount, consoleLogVersion)
                                                                    setTimeout(() => {

                                                                        firebase
                                                                            .database()
                                                                            .ref(`profileUpdated/${uid}`)
                                                                            .set(this.state.uid)
                                                                    }, 1000)
                                                                    return false
                                                                }
                                                                //console.log('adjusted Stripe trial_End date to '+ moment(xuser.trialExpires).format("M/D/YY"))
                                                                console.log(consoleLogVersion + .8 + ", failed and here's confirmation: " + confirmation + " and err: " + err + ', sending email')
                                                                sendsEmailsFromadjustStripeSubscriptionAmount(-1, xuser, newAmount, consoleLogVersion)
                                                                return false
                                                            }
                                                        )
                                                    })


                                            } else {
                                                console.log(consoleLogVersion + .5 + " creating new coupon")
                                                stripe.coupons.create({
                                                    duration: 'forever',
                                                    id: couponID,
                                                    amount_off: couponAmountOff,
                                                    currency: 'usd',
                                                }, function (err, confirmation) {
                                                    console.log(consoleLogVersion + .6 + " coupon confirmation and err: " + confirmation + "   " + err + ", now updating customer")

                                                    //If there's a coupon, delete it first
                                                    stripe.customers.deleteDiscount(
                                                        userStripeID,
                                                        function (err, confirmation) {
                                                            // asynchronously called

                                                            stripe.customers.update(userStripeID, {
                                                                    coupon: couponID
                                                                },
                                                                function (err, confirmation) {
                                                                    if (confirmation != null) {
                                                                        console.log(consoleLogVersion + .9 + " user updated confirmation: " + confirmation + " and err: " + err + ', sending email, adjusting /uid/amountPaidNew')
                                                                        admin.database().ref('users/' + uid + '/amountPaidNew').set(newAmount);
                                                                        sendsEmailsFromadjustStripeSubscriptionAmount(1, xuser, newAmount, consoleLogVersion)
                                                                        setTimeout(() => {

                                                                            firebase
                                                                                .database()
                                                                                .ref(`profileUpdated/${uid}`)
                                                                                .set(this.state.uid)
                                                                        }, 1000)
                                                                        return false
                                                                    }
                                                                    //console.log('adjusted Stripe trial_End date to '+ moment(xuser.trialExpires).format("M/D/YY"))
                                                                    console.log(consoleLogVersion + .9 + ", failed here's confirmation: " + confirmation + " and err: " + err + ', sending email')
                                                                    sendsEmailsFromadjustStripeSubscriptionAmount(-1, xuser, newAmount, consoleLogVersion)
                                                                    return false
                                                                }
                                                            )

                                                        });
                                                });
                                            }
                                        });
                                }
                            } else
                                //wasn't found, try stripetest
                            {
                                console.log("T" + consoleLogVersion + .5 + " and it did NOT work, stripe normal NOT found, looking in stripetest NOW")
                                stripetest.subscriptions.retrieve(userSubID,
                                    function (err, confirmation) {

                                        if (couponID == '') {

                                            stripetest.customers.deleteDiscount(
                                                userStripeID,
                                                function (err, confirmation) {

                                                    console.log(consoleLogVersion + .8 + " user updated to $199, sending email, adjusting /uid/amountPaidNew")
                                                    admin.database().ref('users/' + uid + '/amountPaidNew').set(newAmount);
                                                    sendsEmailsFromadjustStripeSubscriptionAmount(1, xuser, newAmount, consoleLogVersion)
                                                    setTimeout(() => {

                                                        firebase
                                                            .database()
                                                            .ref(`profileUpdated/${uid}`)
                                                            .set(this.state.uid)
                                                    }, 1000)
                                                    return false
                                                })
                                        } else {

                                            couponID = 'T' + couponID


                                            if (confirmation != undefined && confirmation != null) {

                                                console.log("T" + consoleLogVersion + .6 + " and it worked " + confirmation.items.data[0].id + '   confirmation: ' + confirmation + ', now retrieve coupon...')

                                                stripetest.coupons.retrieve(
                                                    couponID, function (err, confirmation) {
                                                        console.log("T" + consoleLogVersion + .7 + " confirmation & err: ", confirmation, "  ", err)
                                                        if (confirmation != null && confirmation != undefined) {
                                                            console.log("T" + consoleLogVersion + .7 + " using existing coupon " + couponID + ', now updating customer')

                                                            //If there's a coupon, delete it first
                                                            stripetest.customers.deleteDiscount(
                                                                userStripeID,
                                                                function (err, confirmation) {
                                                                    // asynchronously called


                                                                    stripetest.customers.update(userStripeID, {
                                                                            coupon: couponID
                                                                        },
                                                                        function (err, confirmation) {
                                                                            if (confirmation != null) {
                                                                                console.log("T" + consoleLogVersion + .8 + " user updated confirmation: " + confirmation + " and err: " + err + ', sending email, adjusting /uid/amountPaidNew')
                                                                                admin.database().ref('users/' + uid + '/amountPaidNew').set(newAmount);
                                                                                sendsEmailsFromadjustStripeSubscriptionAmount(1, xuser, newAmount, consoleLogVersion)
                                                                                setTimeout(() => {

                                                                                    firebase
                                                                                        .database()
                                                                                        .ref(`profileUpdated/${uid}`)
                                                                                        .set(this.state.uid)
                                                                                }, 1000)
                                                                                return false
                                                                            }
                                                                            //console.log('adjusted Stripe trial_End date to '+ moment(xuser.trialExpires).format("M/D/YY"))
                                                                            console.log("T" + consoleLogVersion + .8 + ", failed here's confirmation: " + confirmation + " and err: " + err + ', sending email')
                                                                            sendsEmailsFromadjustStripeSubscriptionAmount(-1, xuser, newAmount, consoleLogVersion)
                                                                            return false
                                                                        }
                                                                    )
                                                                }
                                                            );


                                                        } else {
                                                            console.log("T" + consoleLogVersion + .8 + " creating new coupon")

                                                            stripetest.coupons.create({
                                                                duration: 'forever',
                                                                id: couponID,
                                                                amount_off: couponAmountOff,
                                                                currency: 'usd',
                                                            }, function (err, confirmation) {
                                                                console.log("T" + consoleLogVersion + .81 + " coupon confirmation and err: " + confirmation + "   " + err + ", now updating customer")
                                                                stripetest.customers.deleteDiscount(
                                                                    userStripeID,
                                                                    function (err, confirmation) {
                                                                        // asynchronously called

                                                                        stripetest.customers.update(userStripeID, {
                                                                                coupon: couponID
                                                                            },
                                                                            function (err, confirmation) {
                                                                                if (confirmation != null) {
                                                                                    console.log("T" + consoleLogVersion + .8 + " user updated confirmation: " + confirmation + " and err: " + err + ', sending email, adjusting /uid/amountPaidNew')
                                                                                    admin.database().ref('users/' + uid + '/amountPaidNew').set(newAmount);
                                                                                    sendsEmailsFromadjustStripeSubscriptionAmount(1, xuser, newAmount, consoleLogVersion)
                                                                                    setTimeout(() => {

                                                                                        firebase
                                                                                            .database()
                                                                                            .ref(`profileUpdated/${uid}`)
                                                                                            .set(this.state.uid)
                                                                                    }, 1000)
                                                                                    return false
                                                                                }
                                                                                //console.log('adjusted Stripe trial_End date to '+ moment(xuser.trialExpires).format("M/D/YY"))
                                                                                console.log("T" + consoleLogVersion + .8 + ", failed here's confirmation: " + confirmation + " and err: " + err + ', sending email')
                                                                                sendsEmailsFromadjustStripeSubscriptionAmount(-1, xuser, newAmount, consoleLogVersion)
                                                                                return false
                                                                            }
                                                                        )
                                                                    }
                                                                );

                                                            });
                                                        }
                                                    });
                                            }
                                        }
                                    }
                                )
                            }
                        })


                } else {
                    sendsEmailsFromadjustStripeSubscriptionAmount(-1, xuser, newAmount, consoleLogVersion)
                }

                return false
            })
        console.log(consoleLogVersion + '  first pass, still waiting on Stripe activity')
        return false
    });

async function sendsEmailsFromadjustStripeSubscriptionAmount(emailLevel, xuser, newAmount, consoleLogVersion) {

    const displayName = xuser.firstName + " " + xuser.lastName

    if (emailLevel == -1) {
        //Just send JJ email saying we tried...
        const msgToAdmin = {
            to: 'jj@flowtrade.com',
            from: 'info@flowtrade.com',
            templateId: 'd-b4821b26702b4793bd94eddc18309655',
            dynamic_template_data: {
                email: xuser.email,
                discordName: displayName,
                xMessage: 'Attempt to change subscription amount to ' + newAmount
                    + ' but no Stripe info avail so nothing was changed',
            }
        }
        sgMail.send(msgToAdmin).then(() => {
                console.log(consoleLogVersion + '    attention email sent to JJ')

            },
            console.log(consoleLogVersion + '    attention email sent to JJ with error '
                + console.error))

        return false
    }


    console.log(consoleLogVersion + ' Messaging Admin ' + xuser.email + " changing price to " + newAmount + ', checking for affiliate address first')

    console.log(consoleLogVersion + ' getting Affiliate email')
    //get affiliate email address
    //    if (xuser.refCode != '' && xuser.refCode.length == 28) {  instead, just let it be an error
    admin.database().ref('users/' + xuser.refCode + '/email').once('value').then(
        function (affiliateEmail) {
            const msgToAdmin = {
                to: 'jj@flowtrade.com',
                from: 'info@flowtrade.com',
                templateId: 'd-b4821b26702b4793bd94eddc18309655',
                dynamic_template_data: {
                    email: xuser.email,
                    discordName: displayName,
                    xMessage: "No attention needed.  User package price changed to " + newAmount
                        + " and email sent to " + xuser.email
                }
            }

            if (affiliateEmail != undefined && affiliateEmail != null) {
                msgToAdmin.cc = affiliateEmail
            }
            sgMail.send(msgToAdmin).then(() => {
                    console.log(consoleLogVersion + ' A    success attention email sent to JJ')

                },
                console.log(consoleLogVersion + ' B    success attention email to JJ failed with error '
                    + console.error))

        }
    )


    const msgToUser = {
        to: xuser.email,
        from: 'noreply@flowtrade.com',
        subject: 'Your package price changed!',
        templateId: 'd-d5e67d416b264f4ab99db0c3dbe73d1a',
        dynamic_template_data: {
            email: xuser.email,
            displayName: displayName,
            xMessage: "Your package price changed to $" + newAmount
                + " effective immediately.  Please contact JJ@FlowTrade if you have questions.",
        }
    };
    sgMail.send(msgToUser).then(() => {
            console.log(consoleLogVersion + ' C    success attention email sent to ' + xuser.email)
        },
        console.log(consoleLogVersion + ' D    success attention email to ' + xuser.email + ' but failed with error '
            + console.error))


}


async function processStripe(req, res) {

    try {
        const sig = req.headers['stripe-signature'];
        let webhookSecret = "whsec_XEipm3qYNRqC61qRYDtc2FDBOuwaPsA8";


        //console.log(sig)
        let event = {};
        try {
            event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
            console.log("normal event")
        } catch (ex) {
            console.log("TEST event")
            webhookSecret = "whsec_Q3DD5a9g2SG0QY82sP4biDmfWfmq80fU"
            event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        }

        console.log("here's the event.type:  ", event.type)


       // Occurs whenever a failed charge attempt occurs.
        if (event.type == "charge.failed") {

            console.log('Stripe charge failed Event')
            console.log(event)



            console.log(' the remote charge failed customer is '+event.customer)



                    //new method
                    admin.database().ref('users' )

                        .orderByChild("stripeID")
                        .equalTo(event.customer)
                        .limitToLast(1).once('value').then(xuser => {
                        //new method subtotal doesn't include taxes


                        console.log('CUSTOMER EMAIL: '+xuser.val().email)



                        // try{
                        //
                        //
                        //     xuser=xuser.val();
                        //     let  myName = xuser.firstName;
                        //     let  myEmail = xuser.email;
                        //
                        //     var options = {
                        //         'method': 'POST',
                        //         'url': 'https://flowtrade.api-us1.com/admin/aapi.php?api_key=eae0a49c18405fca76499c07c87ee7e904603fb8f27903e1aa98ee648987955bb2c2b8ce&api_action=contact_add&api_output=json',
                        //         'headers': {
                        //             'Api-Token': 'eae0a49c18405fca76499c07c87ee7e904603fb8f27903e1aa98ee648987955bb2c2b8ce',
                        //             'Content-Type': 'application/x-www-form-urlencoded'
                        //         },
                        //         form: {
                        //             'email': myEmail,
                        //             'first_name': myName,
                        //             'p[15]': '15',
                        //             'status[15]': '1',
                        //             'instantresponders[15]': '1'
                        //         }
                        //     };
                        //     request(options, function (error, response) {
                        //         if (error) throw new Error(error);
                        //       let  result = JSON.parse(response.body);
                        //     });
                        //
                        //
                        //
                        //
                        // }catch(ex){
                        //
                        //     console.log('Failed to send to activecampaign')
                        //     console.log(ex)
                        // }

                        //put this back when deleting the old method
                    })


                    // send user payment failed email
                    // admin.database().ref('users/' + subId.val() + '/email').once('value').then(email => {
                    //     const msg = {
                    //         to: email,
                    //         from: 'noreply@flowtrade.com',
                    //         subject: 'Billing Failed',
                    //         templateId: 'd-6fb24e2067194565a5d3daaf9b46f055'
                    //     };
                    //     sgMail
                    //         .send(msg)
                    //         .then(() => {
                    //         }, console.error);
                    // });
                    //
                    // //old and new method; handles zoho and discord
                 //   admin.database().ref('chargeFailed/' + subId.val()).set(new Date().getTime());









        }

        // Occurs whenever an invoice payment attempt succeeds, even if zero (end of signup process - TRIAL
        if (event.type == "invoice.payment_succeeded") {

            console.log('invoice.payment_succeeded and heres the event: ', event)

            //event.data.object.subscription is the subID in the user:    sub_Gwg9IrWoXk2v8L

            //Stores each invoice here as the whole stripe object
            admin.database().ref('invoices/' + event.data.object.subscription).push(event.data.object)


            //in stripeSubs, it's:  sub_Gwg9IrWoXk2v8L/uid of user once there's a subscription set up
            admin.database().ref('stripeSubs/' + event.data.object.subscription).once('value')
                .then(subId => {

                    //subId.val() is just the uid of the user
                    if (subId.val() != null) {

                        //here's the old method
                        console.log('Found Matching Stripe User')
                        admin.database().ref('users/' + subId.val() + '/paymentStatus').set('Paid');
                        admin.database().ref('users/' + subId.val() + '/xpackage').set('Regular');
                        admin.database().ref('users/' + subId.val() + '/amountPaid').set(event.data.object.amount_paid);


                        admin.database().ref('users/' + subId.val()).once('value').then(subUser => {
                            //only if non-zero amount paid...
                            if (event.data.object.amount_paid != undefined && parseInt(event.data.object.amount_paid) != 0) {

                                console.log('SHOULD SET TRIAL OVERRRRRR BECAUSE AMOUNT IS'+event.data.object.amount_paid)

                                //old method
                                admin.database().ref('users/' + subId.val() + "/amountPaid").set(event.data.object.amount_paid)
                                if (subUser.val().trialComplete != true) {
                                    console.log('Did Set trial complete Stripe'+subId.val())

                                    admin.database().ref('users/' + subId.val() + '/trialComplete').set(true);
                                    admin.database().ref('trialOver/' + subId.val()).set(true);
                                }


                                //added first time trialCompleteDate
                                if (
                                    (subUser.val().trialCompleteDate == null || subUser.val().trialCompleteDate == undefined
                                    ) && parseInt(event.data.object.subtotal) != 0) {
                                    admin.database().ref('users/' + subId.val() + '/trialCompleteDate').set(new Date().getTime())
                                }

                                if (parseInt(event.data.object.subtotal) != 0) {
                                    //new method subtotal doesn't include taxes
                                    admin.database().ref('users/' + subId.val() + "/mainStatus").set('Paid')
                                    admin.database().ref('users/' + subId.val() + "/amountPaidNew")
                                        .set(parseInt(event.data.object.subtotal) / 100)
                                    admin.database().ref('users/' + subId.val() + "/amountPaidNewDate").set(new Date().getTime())
                                }
                                let str = event.data.object.billing_reason
                                if (str.indexOf("subscription") < 0) {
                                    admin.database().ref('users/' + subId.val() + "/billingType").set('Special')
                                } else {
                                    admin.database().ref('users/' + subId.val() + "/billingType").set('Monthly')
                                }


                                //Update zoho with amount/date


                                //refCode - affiliate FB ID
                                let refCode = subUser.val().refCode || ''

                                //sending an email to the affiliate, if the affiliate exists
                                // if (refCode != '' && refCode.length == 28) {
                                //     admin.database().ref('users/' + refCode + '/email').once('value').then(
                                //         function (affiliateEmail) {
                                //
                                //             let output = {
                                //                 chargeSucceeded: new Date().getTime(),
                                //             }
                                //             if (subUser.val().trialComplete != true) {
                                //                 output = {
                                //                     chargeSucceeded: new Date().getTime(),
                                //                     trialOver: new Date().getTime(),
                                //                 }
                                //             }
                                //             admin.database().ref('affiliates/' + refCode + '/' + subId.val()).update(output);
                                //             const affiliateMsg = {
                                //                 to: affiliateEmail.val(),
                                //                 from: 'noreply@flowtrade.com',
                                //                 subject: 'Hey!  A referal/affiliate of yours has successfully been billed',
                                //                 templateId: 'd-c5830b1cc266499fae6026ede66b79c0',
                                //                 dynamic_template_data: subUser.val(),
                                //             };
                                //             sgMail.send(affiliateMsg).then(() => {
                                //             }, console.error);
                                //
                                //         })
                                // }
                            } else {
                                //amount paid is zero

                                //New Method
                                admin.database().ref('users/' + subId.val() + "/mainStatus").set('Trial')
                                admin.database().ref('users/' + subId.val() + "/mainPriorStatus").set('')
                                admin.database().ref('users/' + subId.val() + "/amountPaidNew").set(0)
                                //refCode - affiliate FB ID
                                let refCode = subUser.val().refCode || ''
                                //let affiliate know someone signed up
                                // if (refCode != '' && refCode.length == 28) {
                                //     admin.database().ref('users/' + refCode + '/email').once('value').then(
                                //         function (affiliateEmail) {
                                //
                                //             let output = {
                                //                 chargeSucceeded: new Date().getTime(),
                                //             }
                                //             admin.database().ref('affiliates/' + refCode + '/' + subId.val()).update(output);
                                //             const affiliateMsg = {
                                //                 to: affiliateEmail.val(),
                                //                 from: 'noreply@flowtrade.com',
                                //                 subject: 'Hey!  A referal of yours has signed up for a trial.',
                                //                 templateId: 'd-72e22e01f8f94000b078bf1fff52bb10',
                                //                 dynamic_template_data: subUser.val(),
                                //             };
                                //             sgMail.send(affiliateMsg).then(() => {
                                //             }, console.error);
                                //
                                //         })
                                // }
                            }
                        })


                    } else {
                        console.log('Subscription ID not in system')

                    }

                })


        }

        // trial period will end soon
        if (event.type == "customer.subscription.trial_will_end") {


            console.log('TRIAL WILL END')
            console.log(event.data)
            // send user failed email
            admin.database().ref('stripeSubs/' + event.data.object.subscription).once('value').then(subId => {

                if (subId.val() != null) {


                    admin.database().ref('users/' + subId.val() + '/email').once('value').then(email => {
                        const msg = {
                            to: email,
                            from: 'noreply@flowtrade.com',
                            subject: 'Trial period will expire soon',
                            templateId: ' d-719d76769a8a4c6db0bf27d028c6893e'
                        };
                        sgMail
                            .send(msg)
                            .then(() => {
                            }, console.error);
                    });


                } else {
                    console.log('Subscription ID not in system')

                }

            })

        }


        // Occurs whenever a customer's subscription ends.
        if (event.type == "customer.subscription.deleted") {

            console.log('Stripe subscriptionDeleted')
            console.log(event)
            let subid = event;

            //   console.log('TRIAL WILL END')
            console.log(event.data)
            // send user failed email
            admin.database().ref('stripeSubs/' + event.data.object.subscription).once('value').then(subId => {


                if (subId.val() != null) {

                    //old method
                    admin.database().ref('users/' + subId.val() + '/paymentStatus').set('Cancelled');

                    //new method
                    admin.database().ref('users/' + subId.val() + '/cancelling').set(subId.val());


                } else {
                    console.log('Subscription ID not in system')

                }

            })
        }
        res.status(200).send("OK");


        //if (event.type == "charge.succeeded") {

        //if (event.type == "customer.deleted") {

        // trial period expired
        // if (event.type == "invoice.created") {

        // Occurs whenever an invoice payment attempt fails, due either to a declined payment or to the lack of a stored payment method.
        // if (event.type == "invoice.payment_failed") {


    } catch (ex) {
        console.log('Stripe Error')
        console.log(ex)

    }
}


//rrr
exports.stripeEvent = functions.https.onRequest(processStripe)


//rrr
exports.stripeEventTest = functions.https.onRequest(processStripe)





//rrr
exports.CancelMyAccount = functions.database.ref('users/{uid}/cancelling').onWrite(event => {
//picks up this, STEP 1, then writes to set zoho and discord

    /*
        if (event.after._data !== null){
            // Deleted: data before but no data after
            console.log('Deleted');
            return false
        }
    */

    let uid = event.after._data

    if (uid == null) {
        console.log("stopped CancelMyAccount due to uid=null, onWrite = .remove...")
        return false
    }

    console.log('uid:' + uid)

    let xtime = new Date().getTime()
    // admin.database().ref('favorites/' + uid).remove()
    admin.database().ref('users/' + uid + "/cancelling").remove()

    //zoho and discord here, stripe and emails and everything else handled below
    admin.database().ref('cancelled/' + uid).set(true)
    admin.database().ref('users/' + uid + "/cancelTime").set(xtime)

    //old method
    admin.database().ref('users/' + uid + "/paymentStatus").set('Cancelled')

    //new method
    admin.database().ref('users/' + uid).once('value').then(xuser => {
        xuser = xuser.val()

        //new method
        let priorStatus = ""
        if (xuser.mainStatus != null && xuser.mainStatus != undefined) {
            priorStatus = xuser.mainStatus
        }
        admin.database().ref('users/' + uid + "/mainStatus").set('Cancelled')
        admin.database().ref('users/' + uid + "/priorMainStatus").set(priorStatus)


        console.log('show user cancelled')
        console.log(xuser)

        //refCode - affiliate FB ID
        let refCode = xuser.refCode || ''

        //testing user
        if (xuser.email == "testing@flowtrade.com") {
            let xstring = new Date().getFullYear() + "_" + new Date().getDate() + "_" + new Date().getMonth() + "__" + new Date().getHours()
            admin.database().ref('automatedTesting/BasicFlow/' + xstring + '/ended').set(new Date().getTime())
            admin.database().ref('users/' + uid).remove();
            admin.auth().deleteUser(uid)
        }


        if (xuser.subID) {

            stripe.subscriptions.del(
                xuser.subID,
                function (err, confirmation) {
                    console.log('DID DELETE  Stripe Subscription ', xuser.subID)
                    console.log("confirmation: ", confirmation)
                    console.log(err)

                    if (confirmation == null) {
                        stripetest.subscriptions.del(
                            xuser.subID,
                            function (err, confirmation) {
                                console.log('DID DELETE  in stripe test Stripe Subscription ', xuser.subID)
                                console.log("confirmation: ", confirmation)
                                console.log(err)
                            }
                        );

                    }
                }
            );


        }
        if (xuser.paypalSub) {
            console.log('Delete a Paypal Sub...')
            console.log(xuser.paypalSub)
            admin.database().ref('cancelPaypal/' + uid).set(xuser.paypalSub)
        }


        let user = xuser
        const email = user.email; // The email of the user.
        const displayName = user.username // users name
        const signupDate = user.signUpTime // users signup date
        const diff = moment(new Date().getTime()).diff(moment(signupDate), 'days') // get diff

        console.log('Messaging Admin Cancel ' + email)

        // send email to admin if user canceled in trial period
        if (diff < 7) {
            const msgToAdmin = {
                to: 'purchases@flowtrade.com',
                from: 'bot@flowtrade.com',
                subject: 'Trial canceled',
                templateId: 'd-e332610f8c154c708dac18dad1255074',
                dynamic_template_data: {
                    email: email,
                    displayName: displayName
                }
            };
            sgMail
                .send(msgToAdmin)
                .then(() => {
                }, console.error);
        } else {
            const msgToAdmin = {
                to: 'purchases@flowtrade.com',
                from: 'bot@flowtrade.com',
                subject: 'Paid Subscription canceled',
                templateId: 'd-e332610f8c154c708dac18dad1255074',
                dynamic_template_data: {
                    email: email,
                    displayName: displayName
                }
            };
            sgMail
                .send(msgToAdmin)
                .then(() => {
                }, console.error);
        }
        console.log('Messaginge User Cancel ' + email)

        const msgToUser = {
            to: email,
            from: 'noreply@flowtrade.com',
            subject: 'We are sorry to see you go',
            templateId: 'd-a3c984f2940a4f7eb9b70739774e7f14',
            dynamic_template_data: {
                email: email,
                displayName: displayName
            }
        };
        sgMail
            .send(msgToUser)
            .then(() => {
            }, console.error);


        //sending an email to the affiliate, if the affiliate exists
        // if (refCode != '' && refCode.length == 28) {
        //     admin.database().ref('users/' + refCode + '/email').once('value').then(
        //         function (affiliateEmail) {
        //             console.log('Messaging Admin Cancel ' + affiliateEmail)
        //
        //             admin.database().ref('affiliates/' + refCode + '/' + uid).update({
        //
        //
        //                 cancelled: new Date().getTime(),
        //             });
        //             const affiliateMsg = {
        //                 to: affiliateEmail.val(),
        //                 from: 'noreply@flowtrade.com',
        //                 subject: 'Hey!  A referal/affiliate of yours cancelled',
        //                 templateId: 'd-51fe7816a6804466901f92ebdd7cbbf3',
        //                 dynamic_template_data: xuser,
        //             };
        //             sgMail.send(affiliateMsg).then(() => {
        //             }, console.error);
        //
        //         })
        // }


    })

    return false
});


//OK THIS SECTion IS JUSt fOR DELEting oLD reCORDS
//=========================================================================================


exports.fnSendAffiliateEmail = functions.database.ref('inviteUser/{uid}').onWrite((event, context) => {

    if (event.after._data != null) {

//Rick Najjar (najjar.rick@gmail.com) sent you an invitation to a trial membership at FlowTrade.com.

        const msgToUser = {
            to: event.after._data.email,
            from: 'noreply@flowtrade.com',
            subject: 'Youve been invite to FlowTrade.com',
            templateId: 'd-098cad90036846469d0807e4ddbc7729',
            dynamic_template_data: event.after._data
        };
        sgMail
            .send(msgToUser)
            .then(() => {
            }, console.error);

        admin.database().ref('inviteUser/' + context.params.uid).remove()
    }

    return false
});


exports.fnSendAttentionEmail = functions.database.ref('attentionEmail/{uid}').onWrite((event, context) => {

    if (event.after._data != null) {

//Rick Najjar (najjar.rick@gmail.com) sent you an invitation to a trial membership at FlowTrade.com.

        console.log(event.after._data.xtype)
        return false

        const msgToUser = {
            to: "info@flowtrade.com",
            from: 'noreply@flowtrade.com',
            subject: 'Attention: ' + event.after._data.xtype,
            templateId: 'd-b4821b26702b4793bd94eddc18309655',
            dynamic_template_data: event.after._data
        };
        sgMail
            .send(msgToUser)
            .then(() => {
            }, console.error);

        admin.database().ref('inviteUser/' + context.params.uid).remove()

        console.log("email successfully sent")
        return false
    }

    console.log("event.after._data was null")
    return false
});


exports.fnSendAffiliateSignup = functions.database.ref('affiliateSignedUp/{uid}').onWrite((event, context) => {

    if (event.after._data != null) {

//Rick Najjar (najjar.rick@gmail.com) sent you an invitation to a trial membership at FlowTrade.com.


        console.log('SEND AN AFFILIATE EMAIL')


        const msgToUser = {
            to: "affiliates@flowtrade.com",
            from: 'noreply@flowtrade.com',
            subject: 'An affiliate would like to sign up!',
            templateId: 'd-31687cb2968f44b8b2a8a0b124448bf7',
            dynamic_template_data: event.after._data
        };
        sgMail
            .send(msgToUser)
            .then(() => {
            }, console.error);

        //  admin.database().ref('affiliateSignedUp/' + context.params.uid).set(false)
    }

    return false
});




exports.updateShortUser = functions.database.ref('users/{uid}').onWrite((event, context) => {

    if (event.after._data != null) {
        let fulluser = event.after._data
        let prevuser= event.before._data


        if(prevuser.lastSeen!=fulluser.lastSeen){
            //Timestamps dif, but is anything else?

            let xtotal=0;
            let ftotal=0
            for(let bb in prevuser){

                if(bb!="lastSeen") {
                    if (prevuser[bb] == fulluser[bb]) {
                        ftotal = ftotal + 1
                    }

                    xtotal = xtotal + 1
                }
            }


            if(xtotal==ftotal){
                return false;

            }





        }




        //if the only change, is the stupid timestamp, dont both.










        if (fulluser.email != null || !fulluser.email) {
//username set below
            let rC = fulluser.refCode || '--'
            let lN = fulluser.lastName || null
            let fN = fulluser.firstName || null
            let a = fulluser.address || null
            let c = fulluser.city || null
            let s = fulluser.state || null
            let e = fulluser.email
            let pS = fulluser.paymentStatus || 'missing'
            let pL = fulluser.packageLevel || 'missing'
            let xP = fulluser.xpackage || 'missing'

            if (rC != null) {
                rC = rC.toLowerCase()
            }
            if (rC.length > 30) {
                rC = rC.substr(0, 30) + '...'
            }

            if (lN != null) {
                lN = lN.toLowerCase()
            } else {
                lN = 'missing'
            }
            if (fN != null) {
                fN = fN.toLowerCase()
            } else {
                fN = 'missing'
            }
            if (a != null) {
                a = a.toLowerCase()
            } else {
                a = 'missing'
            }
            if (c != null) {
                c = c.toLowerCase()
            } else {
                c = 'missing'
            }
            if (s != null) {

                if(s.toLowerCase) {
                    s = s.toLowerCase()

                }
            } else {
                s = 'missing'
            }
            if (e != null) {
                e = e.toLowerCase()
            } else {
                e = 'missing'
            }

            let tC = fulluser.trialComplete || null
            let su = fulluser.signUpTime || null
            let pStatus = ""//this is the userpage filter status


            //Valid pS:  SuperAffiliate, Affiliate, Attention, Bailed, Cancelled, Free, Paid, Trial
            //SearchUsers converts pStatus
            /*
                    if (fulluser.pS == 'Attention') {
                        pStatus = 'Attention'
                    }

            if (fulluser.pS == 'Cancelled' || fulluser.pS == 'Attention'
                || fulluser.pS == 'Affiliate' || fulluser.pS == 'Bailed'
                || fulluser.pS == 'Free' || fulluser.pS == 'Paid') {
                pStatus = fulluser.pS
            } else {

            }
*/
            if (fulluser.pS != 'Cancelled' && fulluser.pS != 'Attention') {
                //Trial ends...
                if (fulluser.xP == 'Trial' && !fulluser.tC
                    && fulluser.pS != 'Paid' && fulluser.pS != 'Expired') {
                    let xtime = fulluser.su + 60 * 60000 * 24 * 7

                    xtime = xtime - new Date().getTime()
                    //   console.log(xtime)
                    if (xtime > 0) {
                        //    console.log('SHOULD SHOW TRIAL WHATHEVER A' + fulluser.pS)

                        let xday = parseInt(xtime / (60 * 60000 * 24)) + 1
                        if (fulluser.pS != 'Free' &&
                            fulluser.pS != 'Affiliate' &&
                            fulluser.pS != 'Cancelled') {
                            console.log('SHOULD SHOW TRIAL WHATHEVER')

                            pStatus = 'Trial Ends ' + xday + ' Day'
                        }
                    } else {
                        if (fulluser.pS != 'Paid') {
                            pStatus = 'Expired'

                            if (
                                !fulluser.subID &&
                                fulluser.pS != 'Free' &&
                                fulluser.pS != 'Affiliate' &&
                                fulluser.pS != 'Cancelled'
                            ) {


                                fulluser.pS = 'Bailed'
                            } else {
                            }
                        } else {
                            pStatus = 'Paid'
                        }
                    }

                }
            }


            let smalluser = {
                isPaypal: fulluser.paypal || false,
                rC: rC,
                lN: lN,
                fN: fN,
                aa: fulluser.affiliateAgreed || false,
                a: a,
                c: c,
                s: s,
                z: fulluser.zip || null,
                e: e,
                p: fulluser.phoneNumber || null,
                lT: fulluser.lastSeen || 0,
                pS: pS,
                pL: pL,
                cT: fulluser.cancelTime || null,
                xP: xP,
                tC: tC,
                su: su,
                aP: parseFloat(fulluser.amountPaid / 100) || 0,
            };


            if (fulluser.subID) {
                smalluser.subID = fulluser.subID
            }
            if (fulluser.stripeID) {
                smalluser.stripeID = fulluser.stripeID
            }

            if (fulluser.discordInfo) {
                smalluser.username = fulluser.discordInfo.username
            } else {
                smalluser.username = ""

            }


            admin.database().ref('shortUsers/' + context.params.uid).set(smalluser)


        }
    }
    return false
});



exports.checkRecaptcha = functions.https.onRequest((req, res) => {


    console.log('Chec Recaptcha')
    cors(req, res,async () => {

        console.log("cors....")
        res.setHeader('Access-Control-Allow-Origin', '*');
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);


        const response = req.query.token
        console.log("recaptcha token", response)



        rp({
            uri: 'https://recaptcha.google.com/recaptcha/api/siteverify',
            method: 'POST',
            formData: {
                secret: '6LftnXsaAAAAAKKU8qWC3lMh8g_iYImuehYxPYBG',
                response: response
            },
            json: true
        }).then(result => {
            console.log("recaptcha result", result)
            if (result.success) {
                res.send("true")
            } else {
                res.send("false")
            }
        }).catch(reason => {
            console.log("Recaptcha request failure", reason)
            res.send("Recaptcha request failed.")
        })
    })
})

exports.SearchUsers = functions.https.onRequest((req, res) => {

    cors(req, res, () => {

        res.setHeader('Access-Control-Allow-Origin', '*');
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);


        console.log('SearchUsers......................................................................')

        console.log(req.body)

        /*
            from console.log(req.body)
            { data:
            { filterString: 'SuperAffiliate  Affiliate Attention Cancelled Free Paid',
                searchTextString: '',
                sortField: 's',
                boolASC: false,
                firebasePageNumber: 1 } }
        */

        let filterString = req.body.data.filterString
        let searchTextString = req.body.data.searchTextString.toLowerCase().trim() || ''
        let sortField = req.body.data.sortField
        let boolASC = req.body.data.boolASC
        let firebasePageNumber = req.body.data.firebasePageNumber
        let countPerPage = 100
        let outputStartCount = (firebasePageNumber - 1) * countPerPage + 1
        let outputEndCount = firebasePageNumber * countPerPage - 1 //ends at 100, 200, ...

        //console.log(outputStartCount)
        //console.log(outputEndCount)

        //res.send(JSON.stringify({data:    {xcount: 10}   }))

        let outObject = {};
        let xcount = 0;
        let allStatusString = "Paid"
        let outArray = []
        let countsArray = {
            Affiliate: 0,
            Bailed: 0,
            Cancelled: 0,
            Failed: 0,
            Free: 0,
            Trial: 0,
            Paid: 0,
            Expired: 0,
        }
        //console.log(sortField, "          this is sortfield")
        admin.database()
            .ref("shortUsers")
            .orderByChild(sortField)
            .once("value")
            .then(function (xresult) {
                    let firebaseSortedUsers = xresult.val()

                    let xrecords = [];
                    for (let bb in firebaseSortedUsers) {


                        if (firebaseSortedUsers[bb].username) {
                            firebaseSortedUsers[bb].username=firebaseSortedUsers[bb].username.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].username = ''
                        }

                        if (firebaseSortedUsers[bb].fN) {
                            firebaseSortedUsers[bb].fN.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].fN = 'missing'
                        }
                        if (firebaseSortedUsers[bb].lN) {
                            firebaseSortedUsers[bb].lN.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].lN = 'missing'
                        }
                        if (firebaseSortedUsers[bb].e) {
                            firebaseSortedUsers[bb].e.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].e = 'missing'
                        }
                        if (firebaseSortedUsers[bb].a) {
                            firebaseSortedUsers[bb].a.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].a = 'missing'
                        }
                        if (firebaseSortedUsers[bb].c) {
                            firebaseSortedUsers[bb].c.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].c = 'missing'
                        }
                        if (firebaseSortedUsers[bb].s&& firebaseSortedUsers[bb].s.toLowerCase) {
                            firebaseSortedUsers[bb].s.toLowerCase()

                        } else {
                            firebaseSortedUsers[bb].s = 'missing'
                        }
                        if (firebaseSortedUsers[bb].z) {
                            firebaseSortedUsers[bb].z.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].z = 'missing'
                        }
                        if (!firebaseSortedUsers[bb].pS) {
                            firebaseSortedUsers[bb].pS = 'missing'
                        }

                        //Sets trial
                        if (firebaseSortedUsers[bb].xP == 'Trial'
                            && ("Affiliate Bailed Cancelled Failed Free Paid Expired").indexOf(firebaseSortedUsers[bb].pS) < 0) {
                            //expired or still valid
                            let xtime = firebaseSortedUsers[bb].su + 60 * 60000 * 24 * 7

                            xtime = xtime - new Date().getTime()
                            //   console.log(xtime)
                            if (xtime >= 0) {
                                firebaseSortedUsers[bb].pS = 'Trial'
                            } else {
                                firebaseSortedUsers[bb].pS = 'Expired'
                            }
                        }


                        firebaseSortedUsers[bb].uid = bb;

                        if (firebaseSortedUsers[bb].e != 'missing') {

                            xrecords.push(firebaseSortedUsers[bb])
                        }
                        //Create pStatus for display in users
                        if (allStatusString.indexOf(firebaseSortedUsers[bb].pS) < 0
                            && firebaseSortedUsers[bb].pS != 'missing') {
                            //console.log(allStatusString,"  ",firebaseSortedUsers[bb].pS)
                            allStatusString = allStatusString + ' ' + firebaseSortedUsers[bb].pS
                        }
                    }


                    let row = sortField

                    if (boolASC == false) {
                        xrecords.sort((a, b) => (a[row] < b[row] ? 1 : -1))
                    } else {
                        xrecords.sort((a, b) => (a[row] > b[row] ? 1 : -1))
                    }

                    let thisUser = null

                    //Get a full page filtered and sorted
                    for (let bbb in xrecords) {
                        //in filterString
                        //console.log("this is bbb in second: ",bbb,"  and the value ",outArray[bbb])
                        thisUser = xrecords[bbb]

                        countsArray[thisUser.pS] += 1

                        /*
                        console.log(filterString,"<<   pS: ",thisUser.pS,"   pStatus: ",thisUser.pStatus,"   ",
                            filterString.indexOf(thisUser.pS),"   ",
                            filterString.indexOf(thisUser.pStatus.substring(1, 5)))
                        */
                        //Cancelled Bailed Paid Free Affiliate Failed Attention SuperAffiliate missing
                        //console.log("xxxxxxxxxxxxx  ",allStatusString)


                        if (filterString.indexOf(thisUser.pS) != -1 /*||
                                (filterString.indexOf(thisUser.pStatus.substring(1, 5)) != -1)*/
                        ) {
                            console.log(thisUser.pS, "  ", thisUser.xP, "     ", thisUser.fN, " ", thisUser.lN,thisUser.un)


                            if (thisUser.fN.indexOf(searchTextString) != -1
                                || thisUser.lN.indexOf(searchTextString) != -1
                                || thisUser.username.indexOf(searchTextString) != -1
                                || thisUser.e.indexOf(searchTextString) != -1) {


                                xcount += 1
                                //if it's >= startpoint and <= endpoint, add it to outObject
                                if (xcount >= outputStartCount && xcount <= outputEndCount) {
                                    // console.log(xcount, "  e: ",thisUser.e,
                                    //     "     thisUser: ",thisUser)

                                    outObject[xcount] = thisUser

                                }

                            }
                        }

                    }
                    //Now we have to return the value.

                    //console.log("outObject................. ", outObject)

                    res.send(JSON.stringify({
                        data: {
                            users: outObject, userCount: xcount,
                            allStatusString: allStatusString, countsArray: countsArray
                        }
                    }))

                }
            )
    })
})

exports.SearchUsersExport = functions.https.onRequest((req, res) => {

    cors(req, res, () => {

        res.setHeader('Access-Control-Allow-Origin', '*');
        //res.setHeader('Access-Control-Allow-Origin', 'https://flowtrade.com');

        // Request methods you wish to allow
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

        // Request headers you wish to allow
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

        // Set to true if you need the website to include cookies in the requests sent
        // to the API (e.g. in case you use sessions)
        res.setHeader('Access-Control-Allow-Credentials', true);


        console.log('SearchUsers......................................................................')

        console.log(req.body)

        /*
            from console.log(req.body)
            { data:
            { filterString: 'SuperAffiliate  Affiliate Attention Cancelled Free Paid',
                searchTextString: '',
                sortField: 's',
                boolASC: false,
                firebasePageNumber: 1 } }
        */

        let filterString = req.body.data.filterString
        let searchTextString = req.body.data.searchTextString.toLowerCase().trim() || ''
        let sortField = req.body.data.sortField
        let boolASC = req.body.data.boolASC
        let firebasePageNumber = req.body.data.firebasePageNumber
        let countPerPage = 100
        let outputStartCount = (firebasePageNumber - 1) * countPerPage + 1
        let outputEndCount = firebasePageNumber * countPerPage - 1 //ends at 100, 200, ...

        //console.log(outputStartCount)
        //console.log(outputEndCount)

        //res.send(JSON.stringify({data:    {xcount: 10}   }))

        let outObject = {};
        let xcount = 0;
        let allStatusString = "Paid"
        let outArray = []
        let countsArray = {
            Affiliate: 0,
            Bailed: 0,
            Cancelled: 0,
            Failed: 0,
            Free: 0,
            Trial: 0,
            Paid: 0,
            Expired: 0,
        }
        //console.log(sortField, "          this is sortfield")
        admin.database()
            .ref("shortUsers")
            .orderByChild(sortField)
            .once("value")
            .then(function (xresult) {
                    let firebaseSortedUsers = xresult.val()

                    let xrecords = [];
                    for (let bb in firebaseSortedUsers) {


                        if (firebaseSortedUsers[bb].username) {
                            firebaseSortedUsers[bb].username=firebaseSortedUsers[bb].username.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].username = ''
                        }

                        if (firebaseSortedUsers[bb].fN) {
                            firebaseSortedUsers[bb].fN.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].fN = 'missing'
                        }
                        if (firebaseSortedUsers[bb].lN) {
                            firebaseSortedUsers[bb].lN.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].lN = 'missing'
                        }
                        if (firebaseSortedUsers[bb].e) {
                            firebaseSortedUsers[bb].e.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].e = 'missing'
                        }
                        if (firebaseSortedUsers[bb].a) {
                            firebaseSortedUsers[bb].a.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].a = 'missing'
                        }
                        if (firebaseSortedUsers[bb].c) {
                            firebaseSortedUsers[bb].c.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].c = 'missing'
                        }
                        if (firebaseSortedUsers[bb].s&& firebaseSortedUsers[bb].s.toLowerCase) {
                            firebaseSortedUsers[bb].s.toLowerCase()

                        } else {
                            firebaseSortedUsers[bb].s = 'missing'
                        }
                        if (firebaseSortedUsers[bb].z) {
                            firebaseSortedUsers[bb].z.toLowerCase()
                        } else {
                            firebaseSortedUsers[bb].z = 'missing'
                        }
                        if (!firebaseSortedUsers[bb].pS) {
                            firebaseSortedUsers[bb].pS = 'missing'
                        }

                        //Sets trial
                        if (firebaseSortedUsers[bb].xP == 'Trial'
                            && ("Affiliate Bailed Cancelled Failed Free Paid Expired").indexOf(firebaseSortedUsers[bb].pS) < 0) {
                            //expired or still valid
                            let xtime = firebaseSortedUsers[bb].su + 60 * 60000 * 24 * 7

                            xtime = xtime - new Date().getTime()
                            //   console.log(xtime)
                            if (xtime >= 0) {
                                firebaseSortedUsers[bb].pS = 'Trial'
                            } else {
                                firebaseSortedUsers[bb].pS = 'Expired'
                            }
                        }


                        firebaseSortedUsers[bb].uid = bb;

                        if (firebaseSortedUsers[bb].e != 'missing') {

                            xrecords.push(firebaseSortedUsers[bb])
                        }
                        //Create pStatus for display in users
                        if (allStatusString.indexOf(firebaseSortedUsers[bb].pS) < 0
                            && firebaseSortedUsers[bb].pS != 'missing') {
                            //console.log(allStatusString,"  ",firebaseSortedUsers[bb].pS)
                            allStatusString = allStatusString + ' ' + firebaseSortedUsers[bb].pS
                        }
                    }


                    let row = sortField

                    if (boolASC == false) {
                        xrecords.sort((a, b) => (a[row] < b[row] ? 1 : -1))
                    } else {
                        xrecords.sort((a, b) => (a[row] > b[row] ? 1 : -1))
                    }

                    let thisUser = null

                    //Get a full page filtered and sorted
                    for (let bbb in xrecords) {
                        //in filterString
                        //console.log("this is bbb in second: ",bbb,"  and the value ",outArray[bbb])
                        thisUser = xrecords[bbb]

                        countsArray[thisUser.pS] += 1

                        /*
                        console.log(filterString,"<<   pS: ",thisUser.pS,"   pStatus: ",thisUser.pStatus,"   ",
                            filterString.indexOf(thisUser.pS),"   ",
                            filterString.indexOf(thisUser.pStatus.substring(1, 5)))
                        */
                        //Cancelled Bailed Paid Free Affiliate Failed Attention SuperAffiliate missing
                        //console.log("xxxxxxxxxxxxx  ",allStatusString)


                        if (filterString.indexOf(thisUser.pS) != -1 /*||
                                (filterString.indexOf(thisUser.pStatus.substring(1, 5)) != -1)*/
                        ) {
                            console.log(thisUser.pS, "  ", thisUser.xP, "     ", thisUser.fN, " ", thisUser.lN,thisUser.un)


                            if (thisUser.fN.indexOf(searchTextString) != -1
                                || thisUser.lN.indexOf(searchTextString) != -1
                                || thisUser.username.indexOf(searchTextString) != -1
                                || thisUser.e.indexOf(searchTextString) != -1) {


                                xcount += 1
                                //if it's >= startpoint and <= endpoint, add it to outObject
                               // if (xcount >= outputStartCount && xcount <= outputEndCount) {
                                    // console.log(xcount, "  e: ",thisUser.e,
                                    //     "     thisUser: ",thisUser)

                                    outObject[xcount] = thisUser

                               // }

                            }
                        }

                    }
                    //Now we have to return the value.

                    //console.log("outObject................. ", outObject)

                    res.send(JSON.stringify({
                        data: {
                            users: outObject, userCount: xcount,
                            allStatusString: allStatusString, countsArray: countsArray
                        }
                    }))

                }
            )
    })
})






/*);

stripe.subscriptions.update(xuser.subID, {
cancel_at_period_end: false,
proration_behavior: 'create_prorations',
items: [{
    id: myStripeSubscription.items.data[0].id,
    price: {}
}]
});


stripe.subscriptions.update(
xuser.subID,
{
    items: [{price: 'price_CBb6IXqvTLXp3f'}],
    proration_behavior: 'none'
},*/

/*

                                stripetest.subscriptions.update(
                                    xuser.subID,
                                    {
                                        proration_behavior: 'none',
                                        items: {
                                            data: [{
                                                id: 'si_IMTCtLIyhMynCs',
                                                price: {
                                                    unit_amount: newAmount * 100
                                                }
                                            }]
                                        }

                                        /!*plan: {
                                        "unit_amount": newAmount * 100,}*!/
                                    },
*/
/*
                                const stripe = require('stripe')('sk_test_HUSxSmGPYk1rv4EwuUyGUWPe00uwQkUzht');

                                const subscriptionItem = await stripe.subscriptionItems.update(
                                    'si_ILJJw6UxCZhHy0',
                                    {metadata: {order_id: '6735'}}
                                );

                                tripe.subscriptions.update(xuser.subID, {
                                    cancel_at_period_end: false,
                                    proration_behavior: 'none',
                                    items: [{
                                        id: subscription.items.data[0].id,
                                        price: 'price_CBb6IXqvTLXp3f',
                                    }]
                                });


                                admin.database().ref().child('dateFirstExtended')
                                    .push(xuser)
            //                        .push({trialExpires: xuser.trialExpires, uid: uid, zohoID: xuser.zohoID,})

            */