import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import Button from './ui/Button'

export default function ProfilePhotoCropper({ file, onClose, onSave, saving = false }) {
  const [previewURL, setPreviewURL] = useState('')
  const [dimensions, setDimensions] = useState(null)
  const [previewSize, setPreviewSize] = useState(280)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragOrigin, setDragOrigin] = useState(null)
  const cropArea = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    let cancelled = false
    const url = URL.createObjectURL(file)
    setPreviewURL(url)
    createImageBitmap(file).then(image => {
      if (!cancelled) setDimensions({ width: image.width, height: image.height })
      image.close()
    }).catch(error => {
      if (!cancelled) {
        console.error('Could not read the selected profile photo', error)
        onCloseRef.current()
      }
    })

    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
    }
  }, [file])

  const clampOffset = (nextOffset, nextZoom = zoom) => {
    const size = cropArea.current?.clientWidth || previewSize
    if (!dimensions) return nextOffset
    const baseWidth = size * Math.max(dimensions.width / dimensions.height, 1)
    const baseHeight = size * Math.max(dimensions.height / dimensions.width, 1)
    return {
      x: Math.max(-(baseWidth * nextZoom - size) / 2, Math.min((baseWidth * nextZoom - size) / 2, nextOffset.x)),
      y: Math.max(-(baseHeight * nextZoom - size) / 2, Math.min((baseHeight * nextZoom - size) / 2, nextOffset.y)),
    }
  }

  if (!previewURL || !dimensions) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-midnight-200 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-white">Crop profile photo</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-white/60 hover:text-white disabled:opacity-40"
            aria-label="Close crop dialog"
          >
            <X size={20} />
          </button>
        </div>
        <div
          ref={cropArea}
          className="relative mx-auto aspect-square w-full max-w-[280px] touch-none cursor-grab overflow-hidden rounded-full bg-midnight-100 active:cursor-grabbing"
          onPointerDown={event => {
            event.currentTarget.setPointerCapture(event.pointerId)
            setDragOrigin({ pointerX: event.clientX, pointerY: event.clientY, x: offset.x, y: offset.y })
          }}
          onPointerMove={event => {
            if (!dragOrigin) return
            setOffset(clampOffset({
              x: dragOrigin.x + event.clientX - dragOrigin.pointerX,
              y: dragOrigin.y + event.clientY - dragOrigin.pointerY,
            }))
          }}
          onPointerUp={() => setDragOrigin(null)}
          onPointerCancel={() => setDragOrigin(null)}
        >
          <img
            src={previewURL}
            alt="Selected photo crop preview"
            onLoad={event => setPreviewSize(event.currentTarget.parentElement.clientWidth)}
            draggable="false"
            className="pointer-events-none absolute select-none"
            style={{
              width: Math.max(previewSize, previewSize * dimensions.width / dimensions.height),
              height: Math.max(previewSize, previewSize * dimensions.height / dimensions.width),
              left: `calc(50% + ${offset.x}px)`,
              top: `calc(50% + ${offset.y}px)`,
              transform: `translate(-50%, -50%) scale(${zoom})`,
            }}
          />
        </div>
        <p className="mt-3 text-center text-xs text-white/40">Drag the photo to position it in the circle.</p>
        <label className="mt-4 block text-sm text-white/70">
          Zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={event => {
              const nextZoom = Number(event.target.value)
              setZoom(nextZoom)
              setOffset(current => clampOffset(current, nextZoom))
            }}
            className="mt-2 w-full accent-gold"
          />
        </label>
        <div className="mt-4 flex gap-2">
          <Button fullWidth variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button fullWidth loading={saving} onClick={() => onSave({
            zoom,
            offsetX: offset.x,
            offsetY: offset.y,
            previewSize: cropArea.current?.clientWidth || previewSize,
          })}>
            Save photo
          </Button>
        </div>
      </div>
    </div>
  )
}
