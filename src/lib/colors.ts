export const dayPalette = [
  "#8b7cf6",
  "#f48fb1",
  "#7eb6ff",
  "#f5b56b",
  "#6ec9b0",
  "#c9a6e8",
  "#ff8fab",
  "#67c7d6",
  "#f0c14d",
  "#9aa8ff",
]

export const cardWashes = ["#efe9ff", "#ffe8f3", "#e7f1ff", "#e7f8f2", "#fff3e4"]

export function dayColor(index: number) {
  return dayPalette[index % dayPalette.length]
}

export function cardWash(index: number) {
  return cardWashes[index % cardWashes.length]
}

export function trackColor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  return dayPalette[hash % dayPalette.length]
}
