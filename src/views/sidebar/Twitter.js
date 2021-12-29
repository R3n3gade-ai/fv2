import React, { useEffect, useState, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { UpdateTwitterExclusions } from '../../store/actions/UserActions'
import PerfectScrollbar from 'perfect-scrollbar'
import {
  CCard,
  CCardBody,
  CSpinner,
  CTooltip,
  CLink,
  CListGroup,
  CListGroupItem, 
  CSwitch,
} from '@coreui/react'

import CIcon from '@coreui/icons-react'
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

let twitterFeedPs = null;

const Twitter = props => {
  const {
    profile, 
    exclusions, 

    UpdateTwitterExclusions
  } = props;

  const [loaded, setLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [timelines, setTimelines] = useState({});
  const [tweets, setTweets] = useState([]);
  const [filteredTweets, setFilteredTweets] = useState([]);

  useEffect(() => {
    return new Promise((resolve, reject) => {
      const ref = React.firebase.firebase.database(React.firebase.twitter)
        .ref(`tweets`)
        .limitToLast(10)
        .on('value', (val) => {
          setLoaded(true)
          setTweets(Object.values(val.val() || {}).reverse())
        });
    });
  }, []);

  useEffect(() => {
    const ref = React.firebase.firebase.database(React.firebase.twitter)
      .ref(`timelines`)
      .on('value', (val) => {
        setTimelines(val.val())
        resolve()
      })
  }, []);

  useEffect(() => {
    // if timelines aren't loaded yet, don't attempt to filter anything
    if (timelines.length === 0) {
      return
    }

    const validUsernames = Object.keys(timelines)
      .filter(key => !exclusions.includes(key))
      .map(key => timelines[key].username)

    setFilteredTweets(tweets.filter(tweet => {
      return validUsernames.includes(tweet.author.username)
    }))

  }, [tweets, timelines, profile])

  const toggleExclusion = (id) => {
    const updated = exclusions.includes(id)
      ? exclusions.filter(i => ![id].includes(i))
      : [...exclusions, id]

    UpdateTwitterExclusions(updated)
  }

  const toggleSettings = () => {
    setShowSettings(!showSettings)
  }

  const twitterFeedWrapperRef = useRef(null)

  useEffect(async() => {
    twitterFeedWrapperRef.current && (twitterFeedPs = new PerfectScrollbar('.twitter-feed_wrapper'))
  }, [loaded, showSettings, exclusions, timelines, tweets])

  return (
    <>
      <div className="twitter-feed-menu">
        <CTooltip content='Settings'>
          <CLink
            onClick={() => toggleSettings()}
            className='pl-1 pr-0'
          >
            <CIcon name='cis-settings' height={20} />
          </CLink>
        </CTooltip>
      </div>

      {showSettings &&
        <CCard>
          <CCardBody className="pt-1">
            <CListGroup>
              {Object.keys(timelines).map((key) => {
                return (
                  <CListGroupItem
                    className='h6 mb-0 d-flex justify-content-between align-items-center'
                    key={key}
                  >
                    <span>
                    { timelines[key].name }
                    </span>
                    <CSwitch 
                      shape={'pill'} 
                      color={'primary'} 
                      checked={!exclusions.includes(key)}
                      onChange={() => toggleExclusion(key)} 
                    />
                  </CListGroupItem>
                )
              })}
            </CListGroup>
          </CCardBody>
        </CCard>
      }

      {!showSettings &&
        <div>
          {!loaded &&
            <CSpinner className='absolute-spinner'/>
          }

          <div
            ref={twitterFeedWrapperRef}
            className='twitter-feed_wrapper'
          >
            <CListGroup flush className="twitter-feed" >
              {filteredTweets.length === 0 && 
                <CListGroupItem className="text-center">
                  No tweets found for the selected filters
                </CListGroupItem>
              }

              {filteredTweets.map(tweet => {
                return ( 
                  <CListGroupItem
                    key={tweet.id}
                    tag="span"
                    className="twitter-feed_tweet"
                    >
                    <div className="twitter-feed_image">
                      <img src={tweet.author.profile_image_url} width="48" height="48"/>
                    </div>
                    <div className="twitter-feed_content">
                      <a className="twitter-feed_title" href={'https://twitter.com/' + tweet.author.username} target="_blank">
                        <span className="twitter-feed_author">{tweet.author.name}</span>
                        <span className="twitter-feed_handle">@{tweet.author.username}</span>
                      </a>
                      <time className="twitter-feed_timestamp" dateTime={tweet.created_at}>
                        {moment(tweet.created_at).fromNow()}
                      </time>
                      <div className="twitter-feed_text">
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
    </>
  )
}

const mapStateToProps = (state) => {
  return {
    profile: state.firebase.profile,
    exclusions: state.firebase.profile.twitterExclusions ?? []
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    UpdateTwitterExclusions: (exclusions) => dispatch(UpdateTwitterExclusions(exclusions)),
  }
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(Twitter)