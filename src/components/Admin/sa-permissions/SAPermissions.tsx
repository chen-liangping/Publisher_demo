'use client'

import React, { useState } from 'react'
import SAListPage from './SAListPage'
import SADetailPage from './SADetailPage'

export default function SAPermissions(): React.ReactElement {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)

  if (selectedAppId) {
    return (
      <SADetailPage
        appId={selectedAppId}
        onBack={() => setSelectedAppId(null)}
      />
    )
  }

  return <SAListPage onViewDetail={setSelectedAppId} />
}
