'use client'

import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 4_500
const FRAME_MS = 35
const FRAMES = 18
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function useScrambleText(phrases: readonly string[], active: boolean): string {
  const [text, setText] = useState(phrases[0] ?? '')
  const index = useRef(0)

  useEffect(() => {
    let hold: ReturnType<typeof setTimeout> | undefined
    let animation: ReturnType<typeof setInterval> | undefined
    setText(phrases[index.current] ?? phrases[0] ?? '')
    if (!active || phrases.length < 2) return

    const transition = () => {
      const next = (index.current + 1) % phrases.length
      const target = phrases[next]
      let frame = 0
      animation = setInterval(() => {
        frame += 1
        const revealed = Math.floor(target.length * frame / FRAMES)
        setText(Array.from(target, (letter, position) => {
          if (position < revealed || !/[a-z]/i.test(letter)) return letter
          const scrambled = LETTERS[Math.floor(Math.random() * LETTERS.length)]
          return letter === letter.toLowerCase() ? scrambled.toLowerCase() : scrambled
        }).join(''))
        if (frame >= FRAMES) {
          clearInterval(animation)
          index.current = next
          setText(target)
          hold = setTimeout(transition, HOLD_MS)
        }
      }, FRAME_MS)
    }

    hold = setTimeout(transition, HOLD_MS)
    return () => {
      clearTimeout(hold)
      clearInterval(animation)
    }
  }, [phrases, active])

  return text
}
