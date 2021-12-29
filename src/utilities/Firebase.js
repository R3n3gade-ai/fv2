import firebase from 'firebase';

var config = {
    apiKey: 'AIzaSyCpOX42m6eRZPD2-3x_ei8DFHcrz8KWOpw',
    authDomain: 'tradingproject19-f513b.firebaseapp.com',
    projectId: 'tradingproject19-f513b',
    storageBucket: 'tradingproject19-f513b.appspot.com',
    messagingSenderId: '422843145172',
    measurementId: "G-XBXR27JSBH",
    appId:'1:422843145172:web:fde9ddfa491c0952'
}

firebase.initializeApp({...config,
    databaseURL: 'https://tradingproject19-f513b.firebaseio.com'
})
export const firebaseInstance = Object.assign({}, {
    firebase,
    primary: firebase.initializeApp({...config,
        databaseURL: 'https://tradingproject19-f513b.firebaseio.com'
    }, 'primary'),
    tracking: firebase.initializeApp({...config,
        databaseURL: 'https://tradingproject19-tracking.firebaseio.com'
    }, 'tracking'),
    blocks: firebase.initializeApp({...config,
        databaseURL: 'https://tradingproject19-blocks.firebaseio.com'
    }, 'blocks'),
    ae: firebase.initializeApp({...config,
        databaseURL: "https://tradingproject-ae.firebaseio.com/"
    }, 'ae'),
    lae: firebase.initializeApp({...config,
        databaseURL: "https://tradingproject19-livetickae.firebaseio.com/"
    }, 'lae'),
    fl: firebase.initializeApp({...config,
        databaseURL: "https://tradingproject19-fl.firebaseio.com/"
    }, 'fl'),
    lfl: firebase.initializeApp({...config,
        databaseURL: "https://tradingproject19-livetickfl.firebaseio.com/"
    }, 'lfl'),
    ms: firebase.initializeApp({...config,
        databaseURL: "https://tradingproject19-ms.firebaseio.com/"
    }, 'ms'),
    lms: firebase.initializeApp({...config,
        databaseURL: "https://tradingproject19-livetickms.firebaseio.com/"
    }, 'lms'),
    tz: firebase.initializeApp({...config,
        databaseURL: "https://tradingproject19-tz.firebaseio.com/"
    }, 'tz'),
    ltz: firebase.initializeApp({...config,
        databaseURL: "https://tradingproject19-liveticktz.firebaseio.com/"
    }, 'ltz'),
    elTester: firebase.initializeApp({...config,
        databaseURL: "https://tradingproject19-eltester-b13d4.firebaseio.com/"
    }, 'elTester'),
    twitter: firebase.initializeApp({...config,
        databaseURL: "https://tradingproject19-twitter.firebaseio.com/"
    }, 'twitter')
})

firebaseInstance.twitter.database().useEmulator("localhost", 5003)