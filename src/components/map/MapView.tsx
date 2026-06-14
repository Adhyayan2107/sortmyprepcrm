'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
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
  onBoxSelect?: (ids: string[]) => void
}

interface DragStart {
  x: number
  y: number
}

interface BoxRect {
  left: number
  top: number
  width: number
  height: number
}

export default function MapView({ pins, onPinClick, updatedPin, onBoxSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())

  const [selectMode, setSelectMode] = useState(false)
  const [dragStart, setDragStart] = useState<DragStart | null>(null)
  const [boxRect, setBoxRect] = useState<BoxRect | null>(null)

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

  // Enable / disable drag pan when select mode changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (selectMode) {
      map.dragPan.disable()
    } else {
      map.dragPan.enable()
    }
  }, [selectMode])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selectMode) return
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setBoxRect(null)
    },
    [selectMode]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selectMode || !dragStart) return
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const curX = e.clientX - rect.left
      const curY = e.clientY - rect.top
      setBoxRect({
        left: Math.min(dragStart.x, curX),
        top: Math.min(dragStart.y, curY),
        width: Math.abs(curX - dragStart.x),
        height: Math.abs(curY - dragStart.y),
      })
    },
    [selectMode, dragStart]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selectMode || !dragStart) return
      const map = mapRef.current
      const container = containerRef.current
      if (!map || !container) return

      const rect = container.getBoundingClientRect()
      const curX = e.clientX - rect.left
      const curY = e.clientY - rect.top

      const x0 = Math.min(dragStart.x, curX)
      const y0 = Math.min(dragStart.y, curY)
      const x1 = Math.max(dragStart.x, curX)
      const y1 = Math.max(dragStart.y, curY)

      const sw = map.unproject([x0, y1])
      const ne = map.unproject([x1, y0])

      const minLng = sw.lng
      const maxLng = ne.lng
      const minLat = sw.lat
      const maxLat = ne.lat

      const matchingIds = pins
        .filter((p) => p.lng >= minLng && p.lng <= maxLng && p.lat >= minLat && p.lat <= maxLat)
        .map((p) => p.id)

      if (onBoxSelect) onBoxSelect(matchingIds)

      setBoxRect(null)
      setDragStart(null)
      setSelectMode(false)
    },
    [selectMode, dragStart, pins, onBoxSelect]
  )

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: 'relative', cursor: selectMode ? 'crosshair' : undefined }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Box-select rectangle overlay */}
      {boxRect && (
        <div
          style={{
            position: 'absolute',
            left: boxRect.left,
            top: boxRect.top,
            width: boxRect.width,
            height: boxRect.height,
            border: '2px solid #2563EB',
            background: 'rgba(37,99,235,0.08)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}

      {/* Draw Area toggle button — sits below the Mapbox NavigationControl */}
      <button
        type="button"
        onClick={() => {
          setSelectMode((prev) => !prev)
          setDragStart(null)
          setBoxRect(null)
        }}
        className="absolute z-10 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white shadow-md border text-xs font-medium cursor-pointer select-none"
        style={{
          top: '120px',
          right: '10px',
          color: selectMode ? '#2563EB' : '#6b7280',
          borderColor: selectMode ? '#2563EB' : '#e5e7eb',
        }}
      >
        {/* Dashed square icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray={selectMode ? undefined : '2 1.5'}
        >
          <rect x="1" y="1" width="12" height="12" rx="1" />
        </svg>
        {selectMode ? 'Cancel' : 'Select Area'}
      </button>
    </div>
  )
}
