'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Fredoka } from 'next/font/google'
import { ArrowDown, GraduationCap, MapPin, Sparkles, Users } from 'lucide-react'

const fredoka = Fredoka({ subsets: ['latin'] })

type TeamMember = {
  name: string
  position: string
  image: string
  description: string
  accent: string
  details: {
    grade: string
    from: string
    school: string
    hobby: string
    favoriteApp: string
    major: string
  }
}

const teamMembers: TeamMember[] = [
  {
    name: 'Robin Jeshua Deepak',
    position: 'Founder & President',
    image: '/robin.jpg',
    description: 'Leading our technical initiatives, building partnerships, and guiding the organization’s overall direction.',
    accent: 'from-sky-300/14 via-blue-200/8 to-transparent',
    details: {
      grade: '11',
      from: 'Livermore, CA',
      school: 'Livermore High School',
      hobby: 'Playing Basketball',
      favoriteApp: 'Clash Royale',
      major: 'Applied Math'
    }
  },
  {
    name: 'Yashas Jeedi',
    position: 'Vice President',
    image: '/yashas.jpg',
    description: 'Helping lead the organization and supporting the next wave of programs and community initiatives.',
    accent: 'from-cyan-300/16 via-blue-200/8 to-transparent',
    details: {
      grade: '11',
      from: 'Livermore, CA',
      school: 'Livermore High School',
      hobby: 'Playing Basketball and video games',
      favoriteApp: 'Youtube/Instagram',
      major: 'Applied Math'
    }
  },
  {
    name: 'Rahul Eapen',
    position: 'Vice President',
    image: '/rahul.jpg',
    description: 'Managing partnerships and strengthening how we connect with the wider community.',
    accent: 'from-indigo-300/16 via-sky-200/8 to-transparent',
    details: {
      grade: '11',
      from: 'Livermore, CA',
      school: 'Livermore High School',
      hobby: 'Playing video games and going on hikes',
      favoriteApp: 'Tiktok',
      major: 'Biology'
    }
  },
  {
    name: 'Jaden Jirasevijinda',
    position: 'Vice President',
    image: '/jaden.jpg',
    description: 'Supporting long-term planning and helping keep the organization aligned around future goals.',
    accent: 'from-violet-300/14 via-blue-200/8 to-transparent',
    details: {
      grade: '11',
      from: 'Livermore, CA',
      school: 'Livermore High School',
      hobby: 'Playing badminton',
      favoriteApp: 'Instagram',
      major: 'Mechanical Engineering'
    }
  },
  {
    name: 'Rohan Munagapati',
    position: 'Vice President',
    image: '/rohan.jpg',
    description: 'Leading chapter development and helping new efforts feel cohesive across the organization.',
    accent: 'from-teal-300/16 via-cyan-200/8 to-transparent',
    details: {
      grade: '11',
      from: 'Livermore, CA',
      school: 'Granada High School',
      hobby: 'Playing basketball',
      favoriteApp: 'Instagram',
      major: 'Biotechnology'
    }
  },
  {
    name: 'Nikhil Madineni',
    position: 'Board Member',
    image: '/nikhil.jpg',
    description: 'Helping shape our technical workshops and the learning experience behind our programs.',
    accent: 'from-blue-300/14 via-cyan-200/8 to-transparent',
    details: {
      grade: '11',
      from: 'Livermore, CA',
      school: 'Livermore High School',
      hobby: 'Watching Sports and Playing Basketball',
      favoriteApp: 'Instagram',
      major: 'Data Science'
    }
  },
  {
    name: 'Nolan Mcclung',
    position: 'Board Member',
    image: '/nolan.jpg',
    description: 'Handling social media and helping our outreach stay active, clear, and community-facing.',
    accent: 'from-slate-200/14 via-blue-200/8 to-transparent',
    details: {
      grade: '11',
      from: 'Livermore, CA',
      school: 'Livermore High School',
      hobby: 'Playing lacrosse',
      favoriteApp: 'Hudl',
      major: 'Mechanical Engineering'
    }
  },
  {
    name: 'Arya Rajavelu',
    position: 'Board Member',
    image: '/arya.jpg',
    description: 'Organizing educational programming and keeping student experiences engaging and well coordinated.',
    accent: 'from-cyan-200/14 via-teal-200/8 to-transparent',
    details: {
      grade: '11',
      from: 'Livermore, CA',
      school: 'Livermore High School',
      hobby: 'Playing volleyball and biking',
      favoriteApp: 'Instagram',
      major: 'Undecided'
    }
  },
  {
    name: 'Shree Manickaraja',
    position: 'Website Developer',
    image: '/shree.jpg',
    description: 'Planning the next website improvements and helping turn ideas into polished updates online.',
    accent: 'from-sky-300/16 via-indigo-200/8 to-transparent',
    details: {
      grade: '9',
      from: 'Livermore, CA',
      school: 'Livermore High School',
      hobby: 'Playing tennis, flying planes, and coding',
      favoriteApp: 'Brawl Stars/Youtube',
      major: 'Computational Engineering/Data Science'
    }
  }
]

const statCards = [
  {
    label: 'Team Members',
    value: `${teamMembers.length}+`,
    Icon: Users
  },
  {
    label: 'Schools Represented',
    value: `${new Set(teamMembers.map((member) => member.details.school)).size}`,
    Icon: GraduationCap
  },
  {
    label: 'Shared Mission',
    value: 'STEM For All',
    Icon: Sparkles
  }
]

function MemberCard({ member, index }: { member: TeamMember; index: number }) {
  const profileItems = [
    { label: 'Grade', value: member.details.grade },
    { label: 'School', value: member.details.school },
    { label: 'Hobby', value: member.details.hobby },
    { label: 'Favorite App', value: member.details.favoriteApp },
    { label: 'Planned Major', value: member.details.major }
  ]

  const useUnoptimizedImage = member.name === 'Yashas Jeedi' || member.name === 'Nolan Mcclung'

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: index * 0.08 }}
      viewport={{ once: true, amount: 0.2 }}
      className="group relative overflow-hidden rounded-[28px] border border-white/12 bg-[#10285f]/88 shadow-[0_18px_60px_rgba(6,18,49,0.35)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#14316f]/92"
    >
      <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-r ${member.accent}`} />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />

      <div className="relative p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative h-28 w-28 overflow-hidden rounded-3xl border border-white/20 bg-slate-900/40 shadow-lg">
            <Image
              src={member.image}
              alt={member.name}
              fill
              className="object-cover"
              priority={index < 3}
              quality={100}
              sizes="(max-width: 768px) 112px, 112px"
              unoptimized={useUnoptimizedImage}
            />
          </div>

          <div className="flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                {member.position}
              </span>
              <span className="inline-flex items-center gap-1 text-sm text-blue-100/80">
                <MapPin className="h-4 w-4" />
                {member.details.from}
              </span>
            </div>

            <h3 className={`${fredoka.className} text-2xl font-semibold text-white`}>{member.name}</h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/90">{member.description}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {profileItems.map((item) => (
            <div
              key={`${member.name}-${item.label}`}
              className="rounded-2xl border border-white/10 bg-[#091835]/55 px-4 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200/70">{item.label}</p>
              <p className="mt-1 text-sm text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.article>
  )
}

export default function Team() {
  return (
    <section
      id="team"
      className="relative overflow-hidden bg-[linear-gradient(180deg,#10265f_0%,#0c1f4c_48%,#091735_100%)] pb-20 pt-6"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%,transparent_82%,rgba(255,255,255,0.03))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-14 grid gap-8 lg:grid-cols-[1.4fr_0.9fr]"
        >
          <div className="rounded-[32px] border border-white/12 bg-[#143270]/88 p-8 shadow-[0_20px_80px_rgba(4,11,32,0.35)] backdrop-blur-xl sm:p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
              <Users className="h-4 w-4" />
              Meet The People Behind Pillars of Tech
            </div>

            <h2 className={`${fredoka.className} max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl`}>
              A student-led team building welcoming pathways into STEM.
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100/90">
              Our team brings together organizers, program builders, and student developers who care deeply about making technology education more accessible, practical, and inspiring.
            </p>

            <a
              href="#team-groups"
              className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/12 bg-[#0d214f]/70 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-50 transition-colors hover:bg-[#13306d]"
            >
              <ArrowDown className="h-4 w-4" />
              Scroll Down
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: index * 0.12 }}
                viewport={{ once: true }}
                className="rounded-[28px] border border-white/12 bg-[#0f2454]/90 p-6 shadow-[0_14px_50px_rgba(4,11,32,0.28)] backdrop-blur-xl"
              >
                <stat.Icon className="h-8 w-8 text-amber-300" />
                <p className={`${fredoka.className} mt-5 text-3xl text-white`}>{stat.value}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.16em] text-blue-100/70">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          id="team-groups"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.15 }}
          className="rounded-[32px] border border-white/12 bg-[#0e2353]/84 p-6 shadow-[0_18px_70px_rgba(4,11,32,0.28)] backdrop-blur-xl sm:p-8"
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {teamMembers.map((member, index) => (
              <MemberCard key={member.name} member={member} index={index} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
