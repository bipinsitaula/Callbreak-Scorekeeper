import { describe, expect, it } from 'vitest'
import { parsePath, pathFor } from './routes'

describe('routes', () => {
  it('builds a path for every screen', () => {
    expect(pathFor('hub')).toBe('/')
    expect(pathFor('play')).toBe('/callbreak/play')
    expect(pathFor('record')).toBe('/blackjack/record')
    expect(pathFor('onlineGames')).toBe('/online')
    expect(pathFor('online')).toBe('/online/callbreak')
    expect(pathFor('online', 'S7AHG')).toBe('/online/callbreak/S7AHG')
    expect(pathFor('settings')).toBe('/settings')
    expect(pathFor('onlineHistory')).toBe('/online/callbreak/history')
    expect(pathFor('teenpatti', 'QCJ75')).toBe('/online/teenpatti/QCJ75')
    expect(pathFor('teenpattiHistory')).toBe('/online/teenpatti/history')
    expect(pathFor('jutpatti', 'QCJ75')).toBe('/online/jutpatti/QCJ75')
    expect(pathFor('jutpattiHistory')).toBe('/online/jutpatti/history')
  })

  it('only the online table carries a room code', () => {
    expect(pathFor('hub', 'S7AHG')).toBe('/')
  })

  it('parses paths back to screens', () => {
    expect(parsePath('/')).toEqual({ view: 'hub', room: null })
    expect(parsePath('/callbreak/leaderboard')).toEqual({ view: 'leaderboard', room: null })
    expect(parsePath('/blackjack/')).toEqual({ view: 'blackjack', room: null })
    expect(parsePath('/online')).toEqual({ view: 'onlineGames', room: null })
    expect(parsePath('/online/callbreak')).toEqual({ view: 'online', room: null })
    expect(parsePath('/online/callbreak/s7ahg')).toEqual({ view: 'online', room: 'S7AHG' })
    expect(parsePath('/online/callbreak/history')).toEqual({ view: 'onlineHistory', room: null })
    expect(parsePath('/online/teenpatti/qcj75')).toEqual({ view: 'teenpatti', room: 'QCJ75' })
    expect(parsePath('/online/teenpatti/history')).toEqual({ view: 'teenpattiHistory', room: null })
    expect(parsePath('/online/jutpatti/qcj75')).toEqual({ view: 'jutpatti', room: 'QCJ75' })
    expect(parsePath('/online/jutpatti/history')).toEqual({ view: 'jutpattiHistory', room: null })
  })

  it('falls back to home for unknown or malformed paths', () => {
    expect(parsePath('/nope')).toEqual({ view: 'hub', room: null })
    expect(parsePath('/online/callbreak/!!')).toEqual({ view: 'hub', room: null })
  })

  it('still understands old ?room= invite links', () => {
    expect(parsePath('/', '?room=abcde')).toEqual({ view: 'online', room: 'ABCDE' })
  })

  it('respects a base path (app served from a sub-folder)', () => {
    expect(pathFor('online', 'ABCDE', '/cards/')).toBe('/cards/online/callbreak/ABCDE')
    expect(parsePath('/cards/online/callbreak/ABCDE', '', '/cards/')).toEqual({ view: 'online', room: 'ABCDE' })
    expect(parsePath('/cards/', '', '/cards')).toEqual({ view: 'hub', room: null })
  })
})
