import React, { useEffect, useState, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { firebaseConnect } from 'react-redux-firebase'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CSpinner,
  CTooltip,
  CLink,
  CListGroup,
  CListGroupItem, 
  CMedia, 
  CMediaBody
} from '@coreui/react'

import {firebaseInstance} from '../../utilities/Firebase'
import CIcon from '@coreui/icons-react'
import classNames from 'classnames'
import moment from "moment"

const AutoLink = ({children}) => {
  return <>
    {mapLinks(children, (url, i) => (
      <a href={url} target="_blank" key={i}>
        {url}
      </a>
    ))}
  </>
}

const mapLinks = (text, fn) => {
  const EXP = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi; 
  
  return text.split(EXP).map((chunk, i) => {
    if (chunk.match(EXP)) {
      return fn(chunk, i);
    }

    return chunk;
  })
}

const Twitter = props => {
  const {
    twitterTimelines,
    profile
  } = props;

  const selectedTimeline = profile.twitterTimeline in twitterTimelines
    ? twitterTimelines[profile.twitterTimeline]
    : null

  const [loaded, setLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(!selectedTimeline);

  useEffect(() => {
    getTweets()
  });

  const getTweets = async() => {
    console.log('getTweets')
    return new Promise((resolve, reject) => {
      React.firebase.firebase.database(React.firebase.twitter)
        .ref(`/latest`)
        .limitToLast(100)
        .on('value', (val) => {
          console.log(val)
        });
    });
  };

  const toggleSettings = () => {
    if (!showSettings) {
      setLoaded(false)
    }

    setShowSettings(!showSettings)
  }

  const selectTimeline = (timelineId) => {
    setLoaded(false)
    setShowSettings(false)
  }

  const tweets = [
    {
      attachments: { media_keys: [ '3_1472299386268958724' ] },
      author_id: '2899773086',
      created_at: '2021-12-18T20:15:02.000Z',
      id: '1472299387820855302',
      source: 'E3MBot',
      text: 'A person was sold about every 3 minutes in the antebellum era. One was called Louisianna. \n' +
        '\n' +
        'https://t.co/F8XTl0Gibi https://t.co/2cWwM72Phd'
    },
    {
      attachments: { media_keys: [ '3_1472299386268958724' ] },
      author_id: '2899773086',
      created_at: '2021-12-18T20:15:02.000Z',
      id: '1472299387820855302',
      source: 'E3MBot',
      text: 'A person was sold about every 3 minutes in the antebellum era. One was called Louisianna. \n' +
        '\n' +
        'https://t.co/F8XTl0Gibi https://t.co/2cWwM72Phd'
    }
  ]

  return (
    <CCard className='m-0 card-h-full'>
      <CCardHeader className='card-header-actions mr-0 d-flex align-items-center justify-content-end c-header'>
        <CTooltip content='Settings'>
          <CLink
            onClick={() => toggleSettings()}
            className='card-header-action pl-1 pr-0'
          >
            <CIcon name='cis-settings' height={20} />
          </CLink>
        </CTooltip>
      </CCardHeader>
        {showSettings &&
          <CCardBody >
            <h5 className="mb-3">Select Timeline</h5>

            <CListGroup>
              {Object.keys(props.twitterTimelines).map((key) => {
                let timelineOption = props.twitterTimelines[key]
                return (
                    <CListGroupItem
                    tag="button"
                    className='h6 mb-0'
                    onClick={() => selectTimeline(key)}
                    active={ timelineOption === selectedTimeline}
                    key={key}
                  >
                    { timelineOption.name }
                  </CListGroupItem>
                )
              })}
            </CListGroup>
          </CCardBody>
        }

        {!showSettings && selectedTimeline &&
          <div>
            {!loaded &&
              <CSpinner className='absolute-spinner'/>
            }

            <div
              className={classNames({
                'opacity-0': !loaded,
                'opacity-100': loaded
              })}
            >
              <CListGroup flush className="twitter-feed">
                {tweets.map(tweet => {
                  return ( 
                    <CListGroupItem
                      tag="span"
                      className="twitter-feed_tweet"
                      >
                      <div class="twitter-feed_image">
                        <img src="https://pbs.twimg.com/profile_images/378800000833266807/9ed4b5e5bffc2e60da94913d51cbd666_normal.png" width="48" height="48"/>
                      </div>
                      <div class="twitter-feed_content">
                        <a class="twitter-feed_title" href="" target="_blank">
                          <span class="twitter-feed_author">The Wall Street Journal</span>
                          <span class="twitter-feed_handle">@WSJ</span>
                        </a>
                        <time class="twitter-feed_timestamp" datetime={tweet.created_at}>
                          {moment(tweet.created_at).fromNow()}
                        </time>
                        <div class="twitter-feed_text">
                          <AutoLink>
                            { tweet.text }
                          </AutoLink>
                        </div>
                      </div>
                    </CListGroupItem>
                  )
                })} 

              </CListGroup>
            </div>
          </div>
        }
    </CCard>
  )
}

const mapStateToProps = (state) => {
  return {
    profile: state.firebase.profile,
    twitterTimelines: 'twitterTimelines' in state.firebase.data ? state.firebase.data.twitterTimelines : {}
  }
}

const mapDispatchToProps = (dispatch) => {
  return {}
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  firebaseConnect((props) => ([
      `twitterTimelines`,
  ]))
)(Twitter)