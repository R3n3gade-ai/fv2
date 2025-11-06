import React, { useEffect, useState, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import moment from 'moment'
import { firebaseConnect } from 'react-redux-firebase'
import classNames from 'classnames'
import CIcon from '@coreui/icons-react'
import {
  CCard,
  CCardBody,
  CRow,
  CCol,
  CCardHeader,
  CTextarea, 
  CButton, 
  CDataTable, 
  CBadge, 
  CForm,
  CCardFooter
} from '@coreui/react'

import Calendar from 'react-calendar'
import PerfectScrollbar from 'perfect-scrollbar'

const NoItems = function() {
  return (
    <div className="no-events">No events found</div>
  )
}

let calendarPs = null
const CalendarPage = props => {
  const {
    auth
  } = props;

  const [notes, setNotes] = useState({})
  const [notesForDate, setNotesForDate] = useState({})
  const [datesWithNotes, setDatesWithNotes] = useState([])
  const [date, setDate] = useState(new Date())
  const [economicEvents, setEconomicEvents] = useState([])
  const [fdaEvents, setFdaEvents] = useState([])
  const [earningsEvents, setEarningsEvents] = useState([])
  const [economicEventsLoading, setEconomicEventsLoading] = useState(false)
  const [fdaEventsLoading, setFdaEventsLoading] = useState(false)
  const [earningsEventsLoading, setEarningsEventsLoading] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [editingNoteKey, setEditingNoteKey] = useState(null)
  const [editingNoteText, setEditingNoteText] = useState('')

  let calendarWrapperRef = useRef(null)

  const userNotesRef = React.firebase
    .firebase
    .database(React.firebase.calendar)
    .ref(`userNotes/${auth.uid}`)

  useEffect(() => {
    getEventsDataForDate()
  }, [date])

  useEffect(() => {
    return userNotesRef.on('value', (snapshot) => {
        if (!snapshot) {
          return
        }

        setNotes(snapshot.val() || {})
      })
  }, [])

  useEffect(() => {
    let notesCopy = Object.assign({}, notes)
    Object.keys(notesCopy).forEach((key) => {
      if (notesCopy[key].date !== getIsoDateString(date)) {
        delete notesCopy[key]
      }
    })

    setNotesForDate(notesCopy)
  }, [notes, date])

  useEffect(() => {
    const dates = Object.values(notes).map((note) => {
      return note.date
    })
    
    setDatesWithNotes([...new Set(dates)])
  }, [notes])

  useEffect(() => {
    if (calendarWrapperRef.current) {
      calendarPs = new PerfectScrollbar('.calendar-wrapper_ref')
    }
  }, [notes, date])

  const getIsoDateString = (date) => {
    return date.toISOString().substring(0,10)
  }

  const processEventsSnapshot = (eventsSnapshot) => {
    return Object.values(eventsSnapshot || {}).sort((a, b) => {
      const momentA = moment(a.time, "HH:mm:ss").unix()
      const momentB = moment(b.time, "HH:mm:ss").unix()

      if (momentA > momentB) {
        return 1
      }

      if (momentB > momentA) {
        return -1
      }

      return 0
    })
  }

  const eventsQuery = (path, forDate) => {
    return React.firebase.firebase.database(React.firebase.calendar)
      .ref(path)
      .orderByChild(`date`)
      .equalTo(getIsoDateString(forDate))
      .limitToLast(1000)
  }

  const getEventsDataForDate = () => {
    setEconomicEventsLoading(true)
    setFdaEventsLoading(true)
    setEarningsEventsLoading(true)

    eventsQuery('economics', date).once('value', (snapshot) => {
      setEconomicEventsLoading(false)
      setEconomicEvents(
        processEventsSnapshot(snapshot.val()).filter((item) => {
          return item.country === 'USA'
        })
      )
    })

    eventsQuery('fda', date).once('value', (snapshot) => {
      setFdaEventsLoading(false)
      setFdaEvents(
        processEventsSnapshot(snapshot.val())
      )
    })

    eventsQuery('earnings', date).once('value', (snapshot) => {
      setEarningsEventsLoading(false)
      setEarningsEvents(
        processEventsSnapshot(snapshot.val())
      )
    })
  }

  const onNewNoteSubmit = (event) => {
    event.preventDefault()

    if (newNoteText.trim() === '') {
      return
    }

    const newNote = {
      text: newNoteText, 
      date: getIsoDateString(date), 
      timestamp: moment().unix()
    }

    setNewNoteText('')

    userNotesRef.push(newNote)
  }

  const onRemoveNoteClick = (event, key) => {
    event.preventDefault()

    if (!confirm('Are you sure you want to remove this note?')) {
      return
    }

    userNotesRef.child(key).remove()
  }

  const onEditNoteClick = (event, key) => {
    event.preventDefault()
    setEditingNoteKey(key)
    setEditingNoteText(notes[key].text)
  }

  const onSaveEditingNoteClick = (event, key) => {
    event.preventDefault()

    if (editingNoteText.trim() === '') {
      return
    }

    const noteCopy = Object.assign({}, notes[key], {
      text: editingNoteText, 
      timestamp: moment().unix()
    })

    userNotesRef.child(key).update(noteCopy)
    setEditingNoteKey(null)
    setEditingNoteText('')
  }

  const onCancelEditingNoteClick = (event) => {
    event.preventDefault()
    setEditingNoteKey(null)
    setEditingNoteText('')
  }

  return (
    <CCardBody innerRef={calendarWrapperRef} className='calendar-wrapper_ref'>
      <CRow>
        <CCol md='12' lg='6' xl='4'>
          <CCard>
            <CCardBody>
              <Calendar 
                calendarType="US"
                onChange={setDate}
                value={date}
                tileContent={ ({ activeStartDate, date, view }) => {
                  return ( 
                    <>
                      { 
                        datesWithNotes.includes(getIsoDateString(date)) && 
                        <div className="calendar-note-indicator" /> 
                      }
                    </>
                  )
                }}
              />
            </CCardBody>
          </CCard>
          <CCard>
            <CCardHeader>
              Notes for { moment(date).format('LL') }
            </CCardHeader>
            <CCardBody>
              {Object.keys(notesForDate).map((key) => {
                const note = notesForDate[key]

                return (
                  <CCard key={key} color="" className="mb-3 border">
                    {editingNoteKey === key && 
                      <CTextarea 
                        rows="6"
                        onChange={(event) => setEditingNoteText(event.target.value)}
                        value={editingNoteText}
                      ></CTextarea>
                    }
                    {editingNoteKey !== key && 
                      <CCardBody className="whitespace-pre-wrap">
                      {note.text}
                      </CCardBody>
                    }
                    <CCardFooter className="d-flex small justify-content-between">
                      <div className="text-muted">
                        {moment.unix(note.timestamp).format('LL h:mm A')}
                      </div>
                      {editingNoteKey === key && 
                        <div>
                          <a onClick={(event) => onSaveEditingNoteClick(event, key)} href="#">
                            <CIcon name="cil-check" />
                          </a>
                          <a onClick={onCancelEditingNoteClick} href="#" className="ml-3" >
                            <CIcon name="cil-x" />
                          </a>
                        </div>
                      }
                      {editingNoteKey !== key && 
                        <div>
                          <a onClick={(event) => onEditNoteClick(event, key)} href="#">
                            <CIcon name="cil-pencil" />
                          </a>
                          <a onClick={(event) => onRemoveNoteClick(event, key)} href="#" className="ml-3" >
                            <CIcon name="cil-trash" />
                          </a>
                        </div>
                      }
                    </CCardFooter>
                  </CCard>
                )
              })}
              <CForm onSubmit={onNewNoteSubmit}>
                <CTextarea 
                  placeholder="Add a new note..." 
                  rows="6"
                  onChange={(event) => setNewNoteText(event.target.value)}
                  value={newNoteText}
                ></CTextarea>
                <div className="text-right">
                  <CButton 
                    className="mt-3" 
                    color="secondary" 
                    type="submit"
                  >
                    Add Note
                  </CButton>
                </div>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md='12' lg='6' xl='8'>
          <CCard>
            <CCardHeader>
              <strong>{ moment(date).format('LL') }</strong>
            </CCardHeader>
            <CCardBody>
              <CCard>
                <CCardHeader>
                  Earnings Events
                  <CBadge 
                    className={classNames({
                      'ml-2': true,
                      'opacity-50': earningsEventsLoading
                    })}
                    color={earningsEvents.length > 1 ? 'primary' : 'light'} 
                    shape="pill"
                  >
                    {earningsEvents.length}
                  </CBadge>
                </CCardHeader>
                <div className={classNames({
                    'calendar-event-table-wrapper': true,
                    'opacity-50': earningsEventsLoading
                  })}>
                  <CDataTable
                    header={earningsEvents.length > 0}
                    items={earningsEvents}
                    fields={[
                      { key: 'time', label: 'Time'},
                      { key: 'ticker', label: 'Ticker'},
                      { key: 'name', label: 'Name'},
                      { key: 'period', label: 'Period'},
                    ]}
                    striped
                    border
                    hover={false}
                    noItemsViewSlot={<NoItems/>}
                    sorter
                    scopedSlots = {{
                      'time':
                        (item)=> {
                          return (
                            <td>
                              {moment(item.time, "HH:mm:ss").format("h:mm A")}
                            </td>
                          )
                        },
                      'ticker':
                        (item)=> {
                          return (
                            <td>
                              <strong>{item.ticker}</strong>
                            </td>
                          )
                        },
                      'name':
                        (item)=> {
                            return (
                            <td>
                              {item.name}
                            </td>
                          )
                        },
                      'period':
                        (item)=> {
                            return (
                            <td>
                              {item.period} {item.period_year}
                            </td>
                          )
                        },
                    }}
                  />
                </div>
              </CCard>
              <CCard>
                <CCardHeader>
                  Economic Events
                  <CBadge 
                    className={classNames({
                      'ml-2': true,
                      'opacity-50': earningsEventsLoading
                    })}
                    color={economicEvents.length > 1 ? 'primary' : 'light'} 
                    shape="pill"
                  >
                    {economicEvents.length}
                  </CBadge>
                </CCardHeader>
                  <div className={classNames({
                    'calendar-event-table-wrapper': true,
                    'opacity-50': economicEventsLoading
                  })}>
                    <CDataTable
                      header={economicEvents.length > 0}
                      items={economicEvents}
                      fields={[
                        { key: 'time', label: 'Time'},
                        { key: 'name', label: 'Name'},
                        { key: 'period', label: 'Period'},
                      ]}
                      hover={true}
                      border
                      striped
                      noItemsViewSlot={<NoItems/>}
                      sorter
                      scopedSlots = {{
                        'time':
                          (item)=> {
                            return (
                              <td>
                                {moment(item.time, "HH:mm:ss").format("h:mm A")}
                              </td>
                            )
                          },
                        'name':
                          (item)=> {
                            return (
                              <td>
                                {item.event_name}
                              </td>
                            )
                          },
                        'period':
                          (item)=> {
                            return (
                              <td>
                                {item.event_period} {item.period_year}
                              </td>
                            )
                          },
                      }}
                    />
                  </div>
              </CCard>
              <CCard>
                <CCardHeader>
                  FDA Events
                  <CBadge 
                    className={classNames({
                      'ml-2': true,
                      'opacity-50': earningsEventsLoading
                    })}
                    color={fdaEvents.length > 1 ? 'primary' : 'light'} 
                    shape="pill"
                  >
                    {fdaEvents.length}
                  </CBadge>
                </CCardHeader>
                <div className={classNames({
                  'calendar-event-table-wrapper': true,
                  'opacity-50': fdaEventsLoading
                })}>
                  <CDataTable
                    header={fdaEvents.length > 0}
                    items={fdaEvents}
                    fields={[
                      { key: 'time', label: 'Time'},
                      { key: 'company', label: 'Company'},
                      { key: 'drug', label: 'Drug'},
                      { key: 'event_type', label: 'Event'}
                    ]}
                    striped
                    border
                    noItemsViewSlot={<NoItems/>}
                    hover={false}
                    sorter
                    scopedSlots = {{
                      'time':
                        (item)=> {
                          return (
                            <td>
                              {moment(item.time, "HH:mm:ss").format("h:mm A")}
                            </td>
                          )
                        },
                      'company':
                        (item)=> {
                          return (
                            <td>
                              {item.companies.map((company) => company.name).join(', ')}
                            </td>
                          )
                        },
                      'drug':
                        (item)=> {
                          return (
                            <td>
                              {item.drug.name}
                            </td>
                          )
                        },
                      'event_type':
                        (item)=> {
                          return (
                            <td >
                              {item.event_type}
                            </td>
                          )
                        },
                    }}
                  />
                </div>
              </CCard>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CCardBody>
  )
}

const mapStateToProps = (state) => {
  return {
    auth: state.firebase.auth,
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  firebaseConnect((props) => ([]))
)(CalendarPage)