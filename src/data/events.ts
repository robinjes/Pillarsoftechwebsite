export interface Event {
  id: string
  title: string
  date: string
  time: string
  location: string
  description: string
  status: 'upcoming' | 'past'
  image?: string
  guests?: string[]
  stats?: { label: string; value: string }[]
  registrationLink?: string
  registrationNote?: string
}

export const events: Event[] = [
  // --- UPCOMING EVENTS ---
  {
    id: 'egg-drop-junction',
    title: 'Egg Drop - Junction',
    date: 'January 29, 2026',
    time: '2:30 PM (Arrival)',
    location: 'Junction Ave K-8',
    status: 'upcoming',
    description: 'Join us at Junction Ave K-8 for an exhilarating Egg Drop challenge! Participants will learn about fundamental physics concepts—such as gravity, air resistance, and impact forces—by designing and building custom protective containers for a raw egg.\n\nWe will provide all the necessary materials to craft your contraptions. Come ready to engineer, test your designs, and enjoy some sweet treats (candy provided) as we see whose egg survives the drop!',
  },
  {
    id: 'science-odyssey',
    title: 'Science Odyssey',
    date: 'February 26, 2026',
    time: '5:00 PM - 7:30 PM',
    location: 'TBD',
    status: 'upcoming',
    description: 'Get ready for an evening of discovery at the annual Science Odyssey! Our team will be showcasing cutting-edge STEM projects and interactive demonstrations. \n\nIt\'s an incredible opportunity for students, parents, and the community to engage with science hands-on and learn more about our robotics and tech initiatives. Don\'t miss out on exploring the future of STEM with us.',
  },
  {
    id: 'wildcat-tank-altamont',
    title: 'Wildcat Tank - Altamont',
    date: 'March 25, 2026',
    time: '2:45 PM - 3:45 PM',
    location: 'Altamont Elementary School (MPR)',
    status: 'upcoming',
    description: 'Welcome to Wildcat Tank! Inspired by the show "Shark Tank," this exciting event encourages elementary students to express their creativity, entrepreneurship, and public speaking skills. Students will brainstorm, design, and pitch an original product designed to improve everyday life using STEM.\n\nParticipants will present a multi-view drawing of their product along with its features and purpose to a panel of guest judges (including industry mentors). Winners will receive gift cards, and food will be available for parents and visitors to create a vibrant, community-focused environment.',
    registrationLink: 'https://docs.google.com/forms/d/e/1FAIpQLSdLMcocgTGDRURdTnlY_SGyVXdfmPKi8zTAaTXltXdynhVGoA/viewform',
    registrationNote: '⚠️ THE FORM MUST BE ACCESSED FROM AN LVJUSD STUDENT ACCOUNT!',
  },
  {
    id: 'junk-box-wars-cms',
    title: 'Junk Box Wars - CMS',
    date: 'April 20, 2026',
    time: '2:45 PM - 3:45 PM',
    location: 'Christensen Middle School (CMS)',
    status: 'upcoming',
    description: 'Put your innovation skills to the test at Junk Box Wars! Teams will be presented with a box of assorted recycled materials—like plastic bottle caps, rubber bands, and popsicle sticks—and challenged to build a product that solves a real-world issue.\n\nAfter constructing their prototype, teams will pitch their invention "Shark Tank" style to our panel of judges. Can you think on your feet and defend your design during the Q&A? The team with the highest total score wins a special prize!',
  },
  {
    id: 'family-science-night-altamont',
    title: 'Family Science Night Event - Altamont',
    date: 'April 28, 2026',
    time: 'TBD',
    location: 'Altamont Elementary',
    status: 'upcoming',
    description: 'Pillars of Tech is thrilled to partner with the Pedrozzi Foundation for Altamont\'s Family Science Night! We will be hosting our own interactive engineering table where kids can dive into a hands-on STEM activity. \n\nBring the whole family to explore the wonders of science, tackle fun engineering challenges, and build something amazing together.',
  },
  {
    id: 'career-panel-granada',
    title: 'Career Panel',
    date: 'TBD',
    time: 'TBD',
    location: 'Granada High',
    status: 'upcoming',
    description: 'Explore the limitless possibilities of STEM careers at our exclusive Career Panel! We\'ve invited distinguished scientists and professionals from local laboratories to share their journeys, insights, and advice with students interested in science and technology fields.\n\nThe event will feature a structured panel presentation followed by an open Q&A session. Complimentary drinks and food will be provided. Come get inspired and network with industry experts!',
    guests: ['Distinguished Scientists from local laboratories']
  },
  
  // --- PAST EVENTS (From Old Programs Page) ---
  {
    id: 'foil-boat-stockmens',
    title: 'Science At Stockmens Park',
    date: 'Past Event',
    time: '3 Hours',
    location: 'Stockmens Park',
    status: 'past',
    image: '/SSPResultBG.png',
    description: 'Our Foil Boat Competition brought participants together to test their creativity and engineering skills using one simple material: aluminum foil. Each participant designed and built a foil boat, then put it to the test to see how many pennies their boat could hold before sinking.\n\nThe event provided a fun, hands-on way to explore STEM concepts, especially the science of buoyancy, stability, and design. Participants learned how small changes in structure can make a big difference—while enjoying some friendly competition.',
    stats: [
      { label: 'Participants', value: '400+' },
      { label: 'Total Event Attendees', value: '1,000' },
      { label: 'Hours of Engagement', value: '3' }
    ]
  },
  {
    id: 'pedrozzi-connect-egg-drop',
    title: 'The Pedrozzi CONNECT Youth Egg Drop',
    date: 'Past Event',
    time: '1 Hour',
    location: 'Pedrozzi CONNECT',
    status: 'past',
    image: '/EggDropBG.png',
    description: 'We partnered with the Pedrozzi CONNECT Youth program to host our Egg Drop Competition, bringing participants together to test their creativity and engineering skills by designing protective containers for raw eggs. \n\nThe event provided a fun, hands-on way to explore STEM concepts, especially the science of impact forces, shock absorption, and design. Participants learned how small changes in structure can make a big difference—while enjoying some friendly competition.',
    stats: [
      { label: 'Participants', value: '35+' },
      { label: 'Total Event Attendees', value: '40+' },
      { label: 'Hours of Engagement', value: '1' }
    ]
  }
]
