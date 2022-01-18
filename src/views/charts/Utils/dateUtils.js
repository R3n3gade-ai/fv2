import tzmoment from 'moment-timezone'
import holidays from '../../../utilities/holidays'

const checkIfDayOff = async(day, firstExec) => {
    return new Promise((resolve, reject) => {
        const isDayOff = [0,6].includes(day.day()) || holidays.includes(day.format('YYYY_MM_DD')) || ( firstExec && day.hour() < 9 )
        if (isDayOff) {
            resolve()
        } else {
            reject()
        }
    })
}

export async function getLatestWorkingDay() {
    let requestDateOrigin = new Date(),
        requestedMoment = tzmoment(requestDateOrigin).tz('America/New_York'),
        isDayOff = true,
        firstExec = true

    while(isDayOff) {
        await checkIfDayOff(requestedMoment, firstExec)
            .then(() => {
                requestedMoment.subtract(1, 'days')
                firstExec = false
            })
            .catch(() => {
                isDayOff = false
            })
    }
    
    return requestedMoment.format('YYYY_MM_DD')
}