import { useState } from 'react'
import { TilingModule } from './components/tiling/TilingModule'
import { IDModule } from './components/id/IDModule'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'tiling' | 'id-picture'>('tiling')

  return (
    <div className="app-container">
      {activeTab === 'tiling' ? (
        <TilingModule activeTab={activeTab} setActiveTab={setActiveTab} />
      ) : (
        <IDModule activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </div>
  )
}

export default App
