import { useEffect, useRef, useState } from 'react'
import {
  formatPlaceLabel,
  normalizeQuery,
  searchPlaces,
  type NominatimPlace,
} from '../utils/nominatim'

interface PlaceSelectResult {
  label: string
  lat: number
  lon: number
  placeId?: string
  raw: NominatimPlace
}

interface PlaceAutocompleteProps {
  valueText: string
  onValueTextChange: (text: string) => void
  onSelect: (result: PlaceSelectResult) => void
  placeholder: string
  disabled?: boolean
}

// 地名联想输入：提供防抖搜索、候选下拉和点击选中回填。
function PlaceAutocomplete({
  valueText,
  onValueTextChange,
  onSelect,
  placeholder,
  disabled,
}: PlaceAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<NominatimPlace[]>([])
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (disabled) {
      setOpen(false)
      setCandidates([])
      return
    }

    const q = normalizeQuery(valueText)
    if (q.length < 2) {
      setCandidates([])
      setOpen(false)
      return
    }

    const controller = new AbortController()
    const currentId = ++requestIdRef.current

    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const list = await searchPlaces(q, controller.signal)
        if (currentId !== requestIdRef.current) return
        setCandidates(list)
        setOpen(true)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('地点联想请求失败，请稍后重试。')
          setCandidates([])
          setOpen(true)
        }
      } finally {
        if (currentId === requestIdRef.current) {
          setLoading(false)
        }
      }
    }, 400)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [disabled, valueText])

  const handleSelect = (candidate: NominatimPlace) => {
    const label = formatPlaceLabel(candidate.address) || normalizeQuery(valueText)

    onValueTextChange(label)
    onSelect({
      label,
      lat: Number(candidate.lat),
      lon: Number(candidate.lon),
      placeId: candidate.place_id ? String(candidate.place_id) : undefined,
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
          if (candidates.length) setOpen(true)
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
          {!loading && !error && !candidates.length && (
            <div className="autocomplete-item muted">未找到匹配地点</div>
          )}

          {!loading &&
            !error &&
            candidates.map((candidate) => {
              const label = formatPlaceLabel(candidate.address) || candidate.display_name
              return (
                <button
                  type="button"
                  className="autocomplete-item"
                  key={`${candidate.place_id}-${candidate.lat}-${candidate.lon}`}
                  onMouseDown={() => handleSelect(candidate)}
                >
                  <span>{label}</span>
                  <small>{candidate.display_name}</small>
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default PlaceAutocomplete
