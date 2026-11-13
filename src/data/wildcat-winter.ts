export const wildcatWinterIntro = 'Wildcat Tank Pt 2 is a free STEM invention showcase for all families with elementary and middle school students in the Livermore Valley Joint Unified School District (LVJUSD). There are 50 participant spots total: 25 in the elementary school track and 25 in the middle school track.'

export const wildcatWinterSections = [
  {
    title: 'What is Wildcat Tank?',
    paragraphs: [
      'Use STEM to invent a product that improves everyday life. Present on your own or with a group, explaining your product’s purpose, key features, and design. Any presentation format is welcome: a board, slides, drawings, or another format that helps you share your idea. A presentation board and a working model are not required. The idea and the pitch matter most!',
      'Pitch your idea to judges with real STEM careers, including scientists and engineers from places like Lawrence Livermore National Laboratory and Quest Science Center, then answer a few questions.',
      'Back for Part 2: last spring, 20 young inventors pitched ideas such as sign-language technology, smart water bottles, and plant helpers.',
    ],
  },
  {
    title: 'Who can participate?',
    paragraphs: [
      'All LVJUSD elementary students (TK–5th grade) and middle school students can participate. There are two tracks: elementary school and middle school, with 25 participants per track and 50 total. Once spots fill, additional participants go on the waitlist.',
      'Enter alone or with a group. All experience levels are welcome; no prior experience is needed. Group size details will be shared in the follow-up form.',
      'Invent something, practice speaking with real scientists, and maybe win a prize. Thanksgiving break is a great time to develop your idea and practice your presentation.',
      'After you register, we’ll send you another form 1–2 weeks before the event to collect final details.',
    ],
  },
  {
    title: 'Event day: your time slot',
    paragraphs: [
      'On Saturday, November 28, we’ll email your room, slot number, and presentation time (for example: Room A, Slot 4, about 6:25 PM). We’ll text a reminder on the afternoon of December 2.',
      'Check in between 5:30 and 5:50 PM. Everyone must check in by 5:50 PM, even if their presentation is later. You’ll receive a sticker with your number, then prepare your presentation materials at the gallery tables.',
      'Arriving late? You can still present, but you’ll move to the end of your room’s order. We can’t hold the line.',
      'When it’s almost your turn, a volunteer will call you to the on-deck chairs next to the stage. Stay near your presentation area or room until you’ve presented.',
      'Plan to stay until about 8:00 PM for finals and awards. Every presenter receives a certificate on stage.',
      'Can’t make it? Email us as soon as you know so we can offer your spot to someone on the waitlist.',
    ],
  },
  {
    title: 'Brainstorming tips',
    paragraphs: [
      'You don’t need a “crazy” idea. The best inventions solve small, everyday problems. Think about things that waste time at school or home, safety issues, things you lose, and messy or annoying tasks you wish were easier. Ask yourself: “What do I wish existed?”',
      'Ask your family: interview a family member about the most annoying thing they do every day. Their answer might inspire your invention!',
    ],
    items: [
      'Annoyance list: write down 10 everyday annoyances, then pick one to solve.',
      'Combine two things: mix two objects, such as a backpack and a charger.',
      'SCAMPER: Substitute, Combine, Adapt, Modify, Put to another use, Reverse/Rearrange an existing idea.',
      '5 Whys: keep asking “why?” until you find the real problem.',
    ],
  },
]

export const wildcatWinterDates = [
  ['Now–Sunday, November 29', 'Register using the Luma button on this page.'],
  ['November 23–27 · Thanksgiving break', 'Develop your idea and prepare your presentation in any format.'],
  ['Saturday, November 28', 'We email your room, slot number, and presentation time.'],
  ['Sunday, November 29', 'Last day to register. If you’re using slides, submit them by this date. Slides are optional.'],
  ['Monday, November 30 · 8:00 PM', 'Reply YES to confirm your spot. Unconfirmed spots go to the waitlist.'],
  ['Wednesday, December 2 · 5:30–8:00 PM', 'Wildcat Tank! Check-in is 5:30–5:50 PM. Planned venue: Altamont Creek Elementary MPR (confirmation pending).'],
]

export const wildcatWinterRubric = [
  ['Problem + usefulness', 'Is it a real problem? Would people actually use this?'],
  ['Creativity + innovation', 'Is it new, or a clever twist on something that exists?'],
  ['STEM connection', 'Does the STEM make sense? Did you think it through?'],
  ['Design + drawings', 'Are your designs or drawings clear and labeled?'],
  ['Pitch + confidence', 'Are you clear, confident, and able to answer questions?'],
]

export const wildcatWinterFaq = [
  ['Does it cost anything?', 'No. Entry, food, and activities are all free.'],
  ['Does my child need to build something or bring a board?', 'No. A drawing and a pitch are enough. Any presentation format is welcome; neither a working model nor a presentation board is required.'],
  ['Can siblings enter together?', 'Yes, students may enter as a group. Group size details will be shared in the follow-up form. Siblings entering separately will receive back-to-back slots.'],
  ['How much help can parents give?', 'Help with supplies and practice is great. The idea and the words should be your child’s own.'],
  ['Can younger siblings come?', 'Yes! STEM stations are available for all ages while pitches happen.'],
  ['Will there be photos?', 'Pillars of Tech may take photos and video for our website and social media. Contact us or speak with the check-in team about your family’s photo preferences. School media policy details will be confirmed.'],
]

export const wildcatWinterDescription = [
  wildcatWinterIntro,
  ...wildcatWinterSections.flatMap((section) => [section.title, ...section.paragraphs, ...(section.items ?? [])]),
  'Key dates · 2026',
  ...wildcatWinterDates.map(([date, detail]) => `${date}: ${detail}`),
  'Judging rubric: each judge scores five categories from 1–10, for a total of 50 points per judge.',
  ...wildcatWinterRubric.map(([category, detail]) => `${category}: ${detail}`),
  'There are two presentation rooms. The top two from each room return for a short final round in front of all judges. That round decides 1st, 2nd, and 3rd place.',
  'Parent FAQ',
  ...wildcatWinterFaq.map(([question, answer]) => `${question} ${answer}`),
  'Questions? Email pillarsoftech@gmail.com. Instagram: @thepillarsoftech. See last spring’s pitches and scores at https://pillarsoftech.org/wildcat-tank.',
].join('\n\n')
