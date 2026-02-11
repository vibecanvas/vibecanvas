export const COLOR_PALETTE = [
  { name: 'Black', value: '#1e1e1e' },
  { name: 'Red', value: '#e03131' },
  { name: 'Green', value: '#2f9e44' },
  { name: 'Blue', value: '#1971c2' },
  { name: 'Orange', value: '#f76707' },
  { name: 'White', value: '#ffffff' },
] as const

export const STROKE_WIDTHS = [
  { name: 'Thin', value: 1 },
  { name: 'Medium', value: 2 },
  { name: 'Thick', value: 4 },
] as const

export const LINE_TYPES = [
  { name: 'Straight', value: 'straight' },
  { name: 'Curved', value: 'curved' },
] as const

export const CAP_STYLES = [
  { name: 'None', value: 'none' },
  { name: 'Arrow', value: 'arrow' },
  { name: 'Dot', value: 'dot' },
  { name: 'Diamond', value: 'diamond' },
] as const

export type TLineType = typeof LINE_TYPES[number]['value']
export type TCapStyle = typeof CAP_STYLES[number]['value']
