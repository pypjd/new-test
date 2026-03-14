import { useEffect, useState } from 'react'
import { isReadonlyDemoMode } from '../config/appMode'
import { readonlyDemoTripReview } from '../demo/demoData'
import { loadTripReview, saveTripReview } from '../services/tripStorage'
import type { TripReview } from '../types/trip'

function createInitialTripReviewState(): TripReview {
  return isReadonlyDemoMode ? readonlyDemoTripReview : loadTripReview()
}

export function useTripReviewState() {
  const [tripReview, setTripReview] = useState<TripReview>(createInitialTripReviewState)

  useEffect(() => {
    if (isReadonlyDemoMode) return
    saveTripReview(tripReview)
  }, [tripReview])

  return { tripReview, setTripReview }
}
