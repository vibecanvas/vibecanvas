export const STROKE_QUICK_COLORS = [
  { name: 'Black', value: '#1f1f22' },
  { name: 'Red', value: '#e03131' },
  { name: 'Green', value: '#2f9e44' },
  { name: 'Blue', value: '#1c7ed6' },
  { name: 'Orange', value: '#f08c00' },
] as const

export const FILL_QUICK_COLORS = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'Pink', value: '#f8d7da' },
  { name: 'Green', value: '#c3e6cb' },
  { name: 'Blue', value: '#cfe2ff' },
  { name: 'Yellow', value: '#fff3bf' },
] as const

export const COLOR_PANEL_COLORS = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'Light Gray', value: '#e0e2e6' },
  { name: 'Gray', value: '#b3bac4' },
  { name: 'Black', value: '#1f1f27' },
  { name: 'Pink', value: '#e173a2' },
  { name: 'Coral', value: '#ef7f7f' },
  { name: 'Orange', value: '#f2a34a' },
  { name: 'Yellow', value: '#f1cb39' },
  { name: 'Green', value: '#7fd08c' },
  { name: 'Mint', value: '#62cdb0' },
  { name: 'Teal', value: '#5dbbc8' },
  { name: 'Blue', value: '#6ba9dd' },
  { name: 'Purple', value: '#8a6fdd' },
  { name: 'Lavender', value: '#ad9fdc' },
  { name: 'Magenta', value: '#d36adb' },
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
