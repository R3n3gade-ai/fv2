import React from 'react'
import { CFooter } from '@coreui/react'

const TheFooter = () => {
  return (
    <CFooter fixed={false}>
      <div>
        <a href="https://flowtrade.com" target="_blank" rel="noopener noreferrer">FlowTrade</a>
        <span className="ml-1">&copy; 2021 FlowTrade.</span>
      </div>
    </CFooter>
  )
}

export default React.memo(TheFooter)
