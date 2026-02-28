import { useEffect, useRef, useState } from 'react'
import { searchAmapInputTips, type AMapPlaceSuggestion } from '../services/amap'

interface PlaceSelectResult {
  label: string
  lat: number
  lng: number
  amapId?: string
  raw: AMapPlaceSuggestion
}

interface PlaceAutocompleteProps {
  valueText: string
  onValueTextChange: (text: string) => void
  onSelect: (result: PlaceSelectResult) => void
  placeholder: string
  disabled?: boolean
}

function PlaceAutocomplete({
  valueText,
  onValueTextChange,
  onSelect,
  placeholder,
  disabled,
}: PlaceAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<AMapPlaceSuggestion[]>([])
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (disabled) {
      setOpen(false)
      setCandidates([])
      return
    }

    const q = valueText.trim()
    if (q.length < 2) {
      setCandidates([])
      setOpen(false)
      setError('')
      return
    }

    const controller = new AbortController()
    const currentId = ++requestIdRef.current

    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      const { tips, error: apiError } = await searchAmapInputTips(q, controller.signal)
      if (currentId !== requestIdRef.current) return
      setCandidates(tips)
      setOpen(true)
      if (apiError) {
        setError(apiError.message)
      }
      setLoading(false)
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [disabled, valueText])

  const handleSelect = (candidate: AMapPlaceSuggestion) => {
    onValueTextChange(candidate.name)
    onSelect({
      label: candidate.name,
      lat: candidate.lat,
      lng: candidate.lng,
      amapId: candidate.id,
      raw: candidate,
    })
    setOpen(false)
    setCandidates([])
  }

  return (
    <div className="autocomplete-field">
      <input
        value={valueText}
        onFocus={() => {
          if (candidates.length || error) setOpen(true)
        }}
        onChange={(event) => {
          onValueTextChange(event.target.value)
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120)
        }}
        placeholder={placeholder}
        disabled={disabled}
      />

      {open && (
        <div className="autocomplete-dropdown">
          {loading && <div className="autocomplete-item muted">搜索中...</div>}
          {!loading && error && <div className="autocomplete-item muted">{error}</div>}
          {!loading && !error && !candidates.length && <div className="autocomplete-item muted">未找到匹配地点</div>}

          {!loading &&
            !error &&
            candidates.map((candidate) => (
              <button
                type="button"
                className="autocomplete-item"
                key={`${candidate.id ?? candidate.name}-${candidate.lat}-${candidate.lng}`}
                onMouseDown={() => handleSelect(candidate)}
              >
                <span>{candidate.name}</span>
                <small>{candidate.displayName}</small>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

export default PlaceAutocomplete
