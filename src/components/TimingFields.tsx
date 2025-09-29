'use client'

interface TimingFieldsProps {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  onStartHourChange: (hour: number) => void
  onStartMinuteChange: (minute: number) => void
  onEndHourChange: (hour: number) => void
  onEndMinuteChange: (minute: number) => void
  title?: string
  description?: string
}

export default function TimingFields({
  startHour,
  startMinute,
  endHour,
  endMinute,
  onStartHourChange,
  onStartMinuteChange,
  onEndHourChange,
  onEndMinuteChange,
  title = "Working Hours",
  description = "Set the working day hours. This determines when they can be scheduled."
}: TimingFieldsProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">{title}</h4>
      <p className="text-xs text-gray-600 mb-3">{description}</p>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <select
                value={startHour}
                onChange={(e) => onStartHourChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hour</p>
            </div>
            <div className="flex-1">
              <select
                value={startMinute}
                onChange={(e) => onStartMinuteChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Minute</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <select
                value={endHour}
                onChange={(e) => onEndHourChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hour</p>
            </div>
            <div className="flex-1">
              <select
                value={endMinute}
                onChange={(e) => onEndMinuteChange(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Minute</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Current Schedule:</strong> {startHour.toString().padStart(2, '0')}:{startMinute.toString().padStart(2, '0')} - {endHour.toString().padStart(2, '0')}:{endMinute.toString().padStart(2, '0')}
        </p>
      </div>
    </div>
  )
}