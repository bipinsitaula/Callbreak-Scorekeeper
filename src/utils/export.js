import { formatScore, rankPlayers, sumScores } from './helpers'

const csvCell = (value) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** One row per round (bid, tricks and score per player) plus a totals row. */
export const buildCsv = (players, rounds) => {
  const header = ['Round', ...players.flatMap((p) => [`${p} bid`, `${p} tricks`, `${p} score`])]
  const rows = rounds.map((round, i) => [
    i + 1,
    ...players.flatMap((_, p) => [round.bids[p], round.tricks[p], (round.scores[p] / 10).toFixed(1)]),
  ])
  const totals = sumScores(rounds, players.length)
  rows.push(['Total', ...players.flatMap((_, p) => ['', '', (totals[p] / 10).toFixed(1)])])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const downloadCsv = (players, rounds, filename = 'call-break-scores.csv') => {
  // BOM so Excel reads UTF-8 names correctly
  const blob = new Blob(['﻿' + buildCsv(players, rounds)], { type: 'text/csv;charset=utf-8' })
  triggerDownload(blob, filename)
}

/** Render the final standings to a PNG blob using a canvas. */
export const renderResultsImage = (players, rounds, totalRounds) => {
  const totals = sumScores(rounds, players.length)
  const ranked = rankPlayers(players, totals)
  const width = 900
  const rowHeight = 84
  const height = 260 + ranked.length * rowHeight
  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#0d2a3a')
  gradient.addColorStop(1, '#070d1a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 44px Georgia, serif'
  ctx.fillText('♠ Call Break Scorekeeper', 56, 90)
  ctx.fillStyle = '#2de2a6'
  ctx.font = '24px system-ui, sans-serif'
  ctx.fillText(`${rounds.length} of ${totalRounds} rounds played`, 56, 134)

  const medals = ['#d4af37', '#c0c0c0', '#cd7f32']
  ranked.forEach((p, i) => {
    const y = 180 + i * rowHeight
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.beginPath()
    ctx.roundRect(48, y, width - 96, rowHeight - 14, 16)
    ctx.fill()

    ctx.fillStyle = medals[p.rank - 1] ?? 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.arc(96, y + (rowHeight - 14) / 2, 22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#070d1a'
    ctx.font = 'bold 24px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(p.rank), 96, y + (rowHeight - 14) / 2 + 9)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 28px system-ui, sans-serif'
    ctx.fillText(p.name.length > 22 ? `${p.name.slice(0, 21)}…` : p.name, 140, y + (rowHeight - 14) / 2 + 10)

    ctx.textAlign = 'right'
    ctx.fillStyle = p.score >= 0 ? '#2de2a6' : '#f87171'
    ctx.font = 'bold 30px system-ui, sans-serif'
    ctx.fillText(formatScore(p.score), width - 76, y + (rowHeight - 14) / 2 + 10)
  })

  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '18px system-ui, sans-serif'
  ctx.fillText('Call Break Scorekeeper', 56, height - 32)

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image export failed'))), 'image/png')
  )
}

/** Use the native share sheet when it can share files, otherwise download the PNG. */
export const shareResultsImage = async (players, rounds, totalRounds) => {
  const blob = await renderResultsImage(players, rounds, totalRounds)
  const file = new File([blob], 'call-break-results.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Call Break results' })
      return 'shared'
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled'
    }
  }
  triggerDownload(blob, 'call-break-results.png')
  return 'downloaded'
}
