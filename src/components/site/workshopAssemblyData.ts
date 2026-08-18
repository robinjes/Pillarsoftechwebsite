export type AssemblyState = 1 | 2 | 3

export const stages: Array<{ number: string; title: string; text: string }> = [
  { number: '01', title: 'Access', text: 'Start with a question, a table, and room to try.' },
  { number: '02', title: 'Build', text: 'Turn the idea into something you can test and tune.' },
  { number: '03', title: 'Lead', text: 'Carry the confidence into the next challenge.' },
]

export const visualStates: Array<{ state: AssemblyState; src: string; alt: string }> = [
  {
    state: 1,
    src: '/images/workshop/access.webp',
    alt: 'A closed workshop kit ready to open for a STEM project.',
  },
  {
    state: 2,
    src: '/images/workshop/build.webp',
    alt: 'An open STEM kit with wheels, sensors, wiring, and rover parts ready to assemble.',
  },
  {
    state: 3,
    src: '/images/workshop/lead.webp',
    alt: 'A completed rover with its components assembled and ready to test.',
  },
]

export const desktopVisualLabel = 'A rover project moves from a closed kit to organized components and a completed build through Access, Build, and Lead.'
