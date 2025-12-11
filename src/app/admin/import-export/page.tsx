'use client'

import { useState } from 'react'
import { useSession } from '@/contexts/SessionContext'

export default function ImportExportPage() {
  const { currentSession } = useSession()
  const [jsonInput, setJsonInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [importStats, setImportStats] = useState<any>(null)

  const handleImport = async () => {
    if (!currentSession) {
      setMessage({ type: 'error', text: 'No active session selected' })
      return
    }

    try {
      setImporting(true)
      setMessage(null)
      setImportStats(null)

      const data = JSON.parse(jsonInput)

      const response = await fetch('/api/import-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id,
          data
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Import failed')
      }

      setImportStats(result.stats)
      setMessage({ type: 'success', text: 'Data imported successfully!' })
      setJsonInput('')
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to import data' })
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    if (!currentSession) {
      setMessage({ type: 'error', text: 'No active session selected' })
      return
    }

    try {
      setExporting(true)
      setMessage(null)

      const response = await fetch(`/api/export-session?sessionId=${currentSession.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Export failed')
      }

      const jsonString = JSON.stringify(data, null, 2)
      setJsonInput(jsonString)
      setMessage({ type: 'success', text: 'Data exported successfully!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to export data' })
    } finally {
      setExporting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setJsonInput(content)
    }
    reader.readAsText(file)
  }

  const handleDownload = () => {
    const blob = new Blob([jsonInput], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session-${currentSession?.name}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearSession = async () => {
    if (!currentSession) {
      setMessage({ type: 'error', text: 'No active session selected' })
      return
    }

    try {
      setClearing(true)
      setMessage(null)
      setImportStats(null)

      const response = await fetch(`/api/clear-session?sessionId=${currentSession.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Clear failed')
      }

      setImportStats(result.stats)
      setMessage({ type: 'success', text: 'Session cleared successfully! All data has been removed.' })
      setShowClearConfirm(false)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to clear session' })
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Import / Export Session Data</h1>
          <p className="text-sm text-gray-600 mt-1">
            Import or export session data including classes, faculty, courses, and allocations
          </p>
        </div>

        {!currentSession && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">Please select a session to import or export data</p>
          </div>
        )}

        {message && (
          <div className={`rounded-lg p-4 mb-6 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </p>
          </div>
        )}

        {importStats && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Import Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Student Groups:</span>
                <span className="ml-2 font-semibold">{importStats.studentGroups || 0}</span>
              </div>
              <div>
                <span className="text-blue-700">Students:</span>
                <span className="ml-2 font-semibold">{importStats.students || 0}</span>
              </div>
              <div>
                <span className="text-blue-700">Faculty:</span>
                <span className="ml-2 font-semibold">{importStats.faculty || 0}</span>
              </div>
              <div>
                <span className="text-blue-700">Faculty Groups:</span>
                <span className="ml-2 font-semibold">{importStats.facultyGroups || 0}</span>
              </div>
              <div>
                <span className="text-blue-700">Halls:</span>
                <span className="ml-2 font-semibold">{importStats.halls || 0}</span>
              </div>
              <div>
                <span className="text-blue-700">Hall Groups:</span>
                <span className="ml-2 font-semibold">{importStats.hallGroups || 0}</span>
              </div>
              <div>
                <span className="text-blue-700">Courses:</span>
                <span className="ml-2 font-semibold">{importStats.courses || 0}</span>
              </div>
              <div>
                <span className="text-blue-700">Memberships:</span>
                <span className="ml-2 font-semibold">{importStats.memberships || 0}</span>
              </div>
              <div>
                <span className="text-blue-700">Course Relations:</span>
                <span className="ml-2 font-semibold">{importStats.courseRelations || 0}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={handleExport}
              disabled={!currentSession || exporting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting...' : 'Export Current Session'}
            </button>
            
            <label className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 cursor-pointer">
              Load from File
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {jsonInput && (
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Download JSON
              </button>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JSON Data
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste your JSON data here or load from file..."
              className="w-full h-96 p-3 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={!currentSession || !jsonInput || importing}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {importing ? 'Importing...' : 'Import to Current Session'}
          </button>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">
            Clear all data from the current session. This action cannot be undone.
          </p>
          
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={!currentSession}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Clear Current Session
            </button>
          ) : (
            <div className="bg-red-50 border border-red-300 rounded-md p-4">
              <p className="text-red-900 font-semibold mb-3">
                Are you sure you want to clear all data from &quot;{currentSession?.name}&quot;?
              </p>
              <p className="text-sm text-red-700 mb-4">
                This will permanently delete all students, faculty, halls, courses, and their relationships. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleClearSession}
                  disabled={clearing}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
                >
                  {clearing ? 'Clearing...' : 'Yes, Clear Everything'}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearing}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <h3 className="font-semibold text-gray-900 mb-2">Instructions:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Export: Downloads all data from the current session including students, faculty, halls, courses, and their relationships</li>
            <li>Import: Loads all entities and their relationships into the current session</li>
            <li>The import will create new records with new IDs while preserving all relationships</li>
            <li>Course-faculty, course-hall, and group membership relationships are automatically recreated</li>
            <li>Timetables are preserved for all entities</li>
            <li>Clear Session: Permanently removes all data from the current session (cannot be undone)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
