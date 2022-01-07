import React, { useEffect, useState, useRef } from 'react'
import { compose } from 'redux'
import { connect } from 'react-redux'
import { UpdateTwitterExclusions } from '../../store/actions/UserActions'
import PerfectScrollbar from 'perfect-scrollbar'
import Moment from 'react-moment';

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

/**
 * Component that converts child nodes into text with external links (anchor tags)
 */
const AutoLink = ({children}) => {
  return <>
    {mapLinks(children, (url, i) => (
      <a href={url} target="_blank" key={i}>
        {url}
      </a>
    ))}
  </>
}

/**
 * Applies a callback to all text chunks matching a URL format
 * 
 * Used by AutoLink component
 */
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
let twitterSettingsPs = null;

const Twitter = props => {
  const {
    profile, 
    exclusions, 
    UpdateTwitterExclusions
  } = props;

  const [showSettings, setShowSettings] = useState(false);
  const [timelines, setTimelines] = useState([]);
  const [tweets, setTweets] = useState([]);
  const [filteredTweets, setFilteredTweets] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  useEffect(() => {
    listenForTweets()
  }, []);

  function listenForTweets() {
    React.firebase.firebase.database(React.firebase.twitter)
      .ref(`tweets`)
      .orderByKey()
      .limitToLast(100)
      .on('child_added', (val) => {
        setTweets(tweets => [val.val(), ...tweets])
      });
  }

  function loadPreviousTweets() {
    if (loadingPrevious) {
      return;
    }

    if (tweets.length === 0) {
      return;
    }

    const [oldest] = tweets.slice(-1)

    setLoadingPrevious(true)

    React.firebase.firebase.database(React.firebase.twitter)
      .ref(`tweets`)
      .orderByKey()
      .endBefore(oldest.id)
      .limitToLast(100)
      .once('value', (val) => {
        setTweets(tweets => [
          ...tweets,
          ...Object.values(val.val() || {}).reverse()
        ])
        setLoadingPrevious(false)
      });
  }

  useEffect(() => {
    const ref = React.firebase.firebase.database(React.firebase.twitter)
      .ref(`timelines`)
      .on('value', (val) => {
        setTimelines(
          Object.values(val.val() || {})
            .sort((a, b) => (a.name > b.name) ? 1 : -1)
        )
      })
  }, []);

  useEffect(() => {
    const validUsernames = Object.values(timelines)
      .filter(timeline => !exclusions.includes(timeline.username))
      .map(timeline => timeline.username)

    const filtered = tweets.filter(tweet => {
      return validUsernames.includes(tweet.author.username)
    }).slice(0, 1000)

    setFilteredTweets(filtered)

  }, [tweets, timelines, profile])

  const toggleExclusion = (username) => {
    const updated = exclusions.includes(username)
      ? exclusions.filter(i => ![username].includes(i))
      : [...exclusions, username]

    UpdateTwitterExclusions(updated)
  }

  const toggleSettings = () => {
    setShowSettings(!showSettings)
  }

  const twitterFeedWrapperRef = useRef(null)
  const twitterSettingsWrapperRef = useRef(null)

  useEffect(async() => {
    twitterFeedPs && twitterFeedPs.destroy();
    twitterSettingsPs && twitterSettingsPs.destroy();

    twitterFeedWrapperRef.current && (twitterFeedPs = new PerfectScrollbar('.twitter-feed-wrapper'))
    twitterSettingsWrapperRef.current && (twitterSettingsPs = new PerfectScrollbar('.twitter-settings-wrapper'))
  }, [showSettings, exclusions, timelines, filteredTweets])

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
        <div ref={twitterSettingsWrapperRef} className="twitter-settings-wrapper">
          <CCard >
            <CCardBody className="pt-1">
              <CListGroup>
                {timelines.map((timeline) => {
                  return (
                    <CListGroupItem
                      className='h6 mb-0 d-flex justify-content-between align-items-center'
                      key={timeline.username}
                    >
                      <span>
                      { timeline.name }
                      </span>
                      <CSwitch 
                        shape={'pill'} 
                        color={'primary'} 
                        checked={!exclusions.includes(timeline.username)}
                        onChange={() => toggleExclusion(timeline.username)} 
                      />
                    </CListGroupItem>
                  )
                })}
              </CListGroup>
            </CCardBody>
          </CCard>
        </div>
      }

      {!showSettings &&
        <div
          ref={twitterFeedWrapperRef}
          className='twitter-feed-wrapper'
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
                      <Moment interval={10000} fromNow>{tweet.created_at}</Moment>
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
            {filteredTweets.length > 0 && filteredTweets.length < 1000 &&
              <CListGroupItem
                onClick={loadPreviousTweets}
                tag="button"
                className="text-center shadow-none"
                >
                Load more Tweets
              </CListGroupItem>
            }
          </CListGroup>
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