'use client'

import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { LeadMapPin } from '@/types/lead.types'
import { PipelineStage } from '@/types/pipeline.types'
import { getStageColor } from '@/utils/stageColors'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants'

interface MapViewProps {
  pins: LeadMapPin[]
  onPinClick: (id: string) => void
  updatedPin?: { id: string; stage: PipelineStage } | null
}

export default function MapView({ pins, onPinClick, updatedPin }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  const addMarker = useCallback(
    (pin: LeadMapPin) => {
      const map = mapRef.current
      if (!map || pin.lat === null || pin.lng === null) return

      const el = document.createElement('div')
      el.style.cssText = `
        width: 14px; height: 14px;
        border-radius: 50%;
        background: ${getStageColor(pin.stage)};
        border: 2px solid white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        cursor: pointer;
      `
      el.title = pin.name

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map)

      el.addEventListener('click', () => onPinClick(pin.id))
      markersRef.current.set(pin.id, marker)
    },
    [onPinClick]
  )

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const onLoad = () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current.clear()
      pins.forEach(addMarker)
    }

    if (map.isStyleLoaded()) {
      onLoad()
    } else {
      map.on('load', onLoad)
      return () => { map.off('load', onLoad) }
    }
  }, [pins, addMarker])

  useEffect(() => {
    if (!updatedPin) return
    const marker = markersRef.current.get(updatedPin.id)
    if (!marker) return
    const el = marker.getElement()
    el.style.background = getStageColor(updatedPin.stage)
  }, [updatedPin])

  return <div ref={containerRef} className="w-full h-full" />
}
