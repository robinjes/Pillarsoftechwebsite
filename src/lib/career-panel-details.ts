import type { PublicEvent } from '@/lib/content-contracts'

type CareerPanelist = {
  id: string
  name: string
  initials: string
  role: string
  bio: string
  photo?: string
}

export const careerPanelists: CareerPanelist[] = [
  {
    id: 'matthew-johnson',
    photo: '/images/events/career-panel-granada/panelists/matthew-johnson.avif',
    name: 'Dr. Matthew S. Johnson',
    initials: 'MJ',
    role: 'Biospheric Science Branch Chief & Research Scientist, NASA Ames Research Center',
    bio: 'Dr. Matthew Johnson is the Biospheric Science Branch Chief and a Research Scientist at NASA Ames Research Center, where he also leads the NASA Earth Exchange (NEX). He uses satellites, ground measurements, and computer models to track air pollution and greenhouse gas emissions, and he has led research projects on several NASA science teams. He earned his PhD in Atmospheric Science from North Carolina State University, interned at NASA Goddard Space Flight Center, and has since worked on major NASA field campaigns, including studies of wildfire smoke. Matthew has received NASA’s Exceptional Scientific Achievement Medal and Early Career Achievement Medal, and he has mentored more than a dozen students and postdoctoral researchers.',
  },
  {
    id: 'anna-winter',
    photo: '/images/events/career-panel-granada/panelists/anna-winter.avif',
    name: 'Dr. Anna Winter',
    initials: 'AW',
    role: 'Postdoctoral Researcher, NASA Ames Research Center',
    bio: 'Dr. Anna Winter is a Postdoctoral Researcher at NASA Ames Research Center, where she studies air quality and atmospheric chemistry. She earned her PhD in Chemistry from UC Berkeley, where she ran a dense network of air quality sensors to map urban pollution at high resolution and developed a new calibration method for low-cost sensors. Before that, she led a NASA DEVELOP team at Goddard Space Flight Center that used satellite data for ecological forecasting. Anna is also an award-winning educator who has spent years mentoring students and bringing hands-on science into Bay Area classrooms.',
  },
  {
    id: 'yolanda-fintschenko',
    photo: '/images/events/career-panel-granada/panelists/yolanda-fintschenko.avif',
    name: 'Yolanda Fintschenko',
    initials: 'YF',
    role: 'Executive Director, i-GATE Innovation Hub & Daybreak Labs',
    bio: 'Dr. Yolanda Fintschenko is the Executive Director of i-GATE Innovation Hub and Daybreak Labs, where she helps science-based startups in the Tri-Valley turn their inventions into real companies, and she also serves as a Livermore Planning Commissioner. She earned her PhD in Bioanalytical Chemistry from the University of Kansas and spent a decade at Sandia National Laboratories, where she managed the Microfluidics Department and holds a patent for particle-manipulation technology. She later moved into industry with leadership roles at Thermo Fisher Scientific and LabSmith before co-founding several marketing firms that help tech startups grow. Outside of work, Yolanda has coached youth track, served on the board of the National Charity League, and led a JDRF One Walk team raising money for Type 1 diabetes research.',
  },
  {
    id: 'russ-walsh',
    photo: '/images/events/career-panel-granada/panelists/russ-walsh.avif',
    name: 'Russ Walsh',
    initials: 'RW',
    role: 'Founder & CEO, The SeaNet Vision',
    bio: 'Russ Walsh is the Founder and CEO of The SeaNet Vision, an engineer, and an author focused on designing breakthrough solutions to global sea level rise. He earned his B.S. in Computer Engineering from the University of South Carolina and studied at the Stanford University Graduate School of Business. Over his career, Russ has advised over 100 organizations—including Google, Apple, Facebook, IBM, and GE—spanning technology, cybersecurity, and sustainability, and he is the author of The SeaNet Vision: Turning a Global Flood Crisis into Humanity’s Golden Opportunity.',
  },
  {
    id: 'amy-aines',
    photo: '/images/events/career-panel-granada/panelists/amy-aines.avif',
    name: 'Amy Aines',
    initials: 'AA',
    role: 'Communications Educator, Corporate Spokesperson, and Author',
    bio: 'Amy Aines is a communications educator, corporate spokesperson, and leadership advisor focused on helping STEM experts, PhDs, and innovators master the art of effective communication. She earned her B.A. from the University of California, Santa Barbara. Over a career spanning nearly five decades in industry and consulting across tech, telecom, and life sciences, Amy has advised technical professionals and leaders on building trust, navigating uncertainty, and engaging communities, and she is the co-author of Championing Science: Communicating Your Ideas to Decision Makers.',
  },
  {
    id: 'mark-dedon',
    photo: '/images/events/career-panel-granada/panelists/mark-dedon.avif',
    name: 'Mark Dedon',
    initials: 'MD',
    role: 'Retired Principal Planner & Wildlife Biologist, Pacific Gas and Electric Company',
    bio: 'Mark Dedon is a conservation pilot, a retired principal planner and wildlife biologist for Pacific Gas and Electric, and a volunteer pilot for LightHawk. Over his career, he has flown small aircraft to support environmental and wildlife efforts—such as transporting an endangered California condor for emergency medical treatment—as well as conducting aerial surveys and wildlife tracking.',
  },
  {
    id: 'roger-aines',
    photo: '/images/events/career-panel-granada/panelists/roger-aines.avif',
    name: 'Roger Aines',
    initials: 'RA',
    role: 'Energy Program Chief Scientist, Lawrence Livermore National Laboratory',
    bio: 'Dr. Roger Aines is the Energy Program Chief Scientist at Lawrence Livermore National Laboratory, where he founded the lab’s Carbon Initiative to develop technologies that remove carbon dioxide from the atmosphere. He earned his PhD in Geochemistry from Caltech and has worked at LLNL since 1984, from nuclear waste disposal to carbon capture. He recently served as the Department of Energy’s Senior Advisor for Carbon Dioxide Removal, helping lead the national Carbon Negative Earthshot. With Amy Aines, he co-wrote Championing Science, a book that helps scientists communicate their work to decision makers.',
  },
  {
    id: 'joel-bowers',
    photo: '/images/events/career-panel-granada/panelists/joel-bowers.png',
    name: 'Joel Bowers',
    initials: 'JB',
    role: 'Retired Engineering Leader & Systems Expert',
    bio: 'Joel Bowers is a retired engineering leader whose career included work with the Livermore National Laboratory, where he led large engineering teams and operations. His expertise spans systems design, manufacturing, and safety—skills that turn big ideas into real, working technology. Over his career, he has helped teams bring complex engineering projects from design all the way through to operation. Today, Joel volunteers with Quest Science Center, where he supports students as they explore STEM pathways and plan their futures.',
  },
  {
    id: 'randy-simpson',
    photo: '/images/events/career-panel-granada/panelists/randy-simpson.avif',
    name: 'Randy Simpson',
    initials: 'RS',
    role: 'Retired Program Leader, Lawrence Livermore National Laboratory',
    bio: 'Randy Simpson is a retired leader from Lawrence Livermore National Laboratory, where he spent decades working on high explosives research and national security programs. He was one of the original members of the lab’s High Explosives Applications Facility (HEAF), a one-of-a-kind center for explosives research, and later served as US/UK Program Leader in the Weapons and Complex Integration directorate. His inventions include safe, non-explosive training materials used to teach bomb-sniffing dogs and to calibrate detection equipment, and he has served as an editor of the journal Propellants, Explosives, Pyrotechnics since 2000. Today, Randy mentors students at Quest Science Center on research projects about ozone, air quality, and respiratory health, connecting them with organizations like Stanford Health Care and NASA.',
  },
]

export function publicEventLocation(event: Pick<PublicEvent, 'id' | 'location'>): string {
  return event.id === 'career-panel-granada'
    ? 'Granada High School Student Union'
    : event.location || 'Location to be announced'
}

export const careerPanelAgenda = [
  { time: '5:30–5:45 PM', title: 'Welcome & Opening Remarks', description: 'Kick off the evening with an overview of the event and meet the panelists.' },
  {
    time: '5:45–6:45 PM',
    title: 'Panel 1: Discovering Your Path & The Scientific Horizon',
    panelists: 'Matthew Johnson, Anna Winter, Mark Dedon, Randy Simpson, Joel Bowers',
    description: 'This session focuses on the real-world reality of scientific research, field work, and technical discovery. Panelists will share their individual academic pathways, the "spark" that drew them to their fields, and what a day in the life of a scientist or researcher actually looks like beyond textbooks. We will discuss how to handle experimental setbacks, the importance of curiosity, and emerging frontiers in earth science, atmospheric research, conservation, climate technology, and national security.',
  },
  {
    time: '6:45–7:45 PM',
    title: 'Panel 2: Building Your Future: Career Strategy, Innovation & Impact',
    panelists: 'Amy Aines, Yolanda Fintschenko, Roger Aines, Russ Walsh',
    description: 'This session focuses on translating technical passion into real-world influence and career success. Panelists will share insights on scientific communication, taking discoveries from the lab to market, entrepreneurship, and leadership. We will dive into essential soft skills—such as public speaking, storytelling, and adaptability—that make young applicants stand out, as well as strategies for finding mentors and navigating long-term career choices in STEM.',
  },
  { time: '7:45–8:30 PM', title: 'Open Q&A & Informal Connections', description: 'Ask your questions and connect with the panelists and other attendees.' },
]
