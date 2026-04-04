import Image from 'next/image'
import { Fredoka } from 'next/font/google'
import { ArrowDown, ArrowUpRight, GraduationCap, MapPin, Sparkles, Users } from 'lucide-react'

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
      favoriteApp: 'Crossy Road',
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
    name: 'Michael Nolan McClung',
    position: 'Graphics Design Lead',
    image: '/nolan.jpg',
    description: 'Leading graphic design for club materials and helping our visuals stay polished, clear, and recognizable.',
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
    name: 'Nikhil Madineni',
    position: 'Member',
    image: '/nikhil.jpg',
    description: 'Supporting chapter initiatives and contributing across events and programs wherever the team needs help.',
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
    name: 'Arya Rajavelu',
    position: 'Member',
    image: '/arya.jpg',
    description: 'Helping support team projects and contributing to events and chapter efforts wherever needed.',
    accent: 'from-cyan-200/14 via-teal-200/8 to-transparent',
    details: {
      grade: '11',
      from: 'Livermore, CA',
      school: 'Livermore High School',
      hobby: 'Playing volleyball and biking',
      favoriteApp: 'Instagram',
      major: 'Undecided'
    }
  }
]

const teamJoinUrl = 'https://forms.gle/XqeKkMF4cj5W62yL9'

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

  const useUnoptimizedImage = member.name === 'Yashas Jeedi' || member.name === 'Michael Nolan McClung'

  return (
    <article
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
    </article>
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
        <div className="mb-14 grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
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
              <div
                key={stat.label}
                className="rounded-[28px] border border-white/12 bg-[#0f2454]/90 p-6 shadow-[0_14px_50px_rgba(4,11,32,0.28)] backdrop-blur-xl"
              >
                <stat.Icon className="h-8 w-8 text-amber-300" />
                <p className={`${fredoka.className} mt-5 text-3xl text-white`}>{stat.value}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.16em] text-blue-100/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div
          id="team-groups"
          className="rounded-[32px] border border-white/12 bg-[#0e2353]/84 p-6 shadow-[0_18px_70px_rgba(4,11,32,0.28)] backdrop-blur-xl sm:p-8"
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {teamMembers.map((member, index) => (
              <MemberCard key={member.name} member={member} index={index} />
            ))}
          </div>

          <a
            href={teamJoinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-8 block overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(135deg,rgba(19,49,111,0.95),rgba(9,24,53,0.95))] p-7 shadow-[0_18px_60px_rgba(6,18,49,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200/30 hover:shadow-[0_22px_70px_rgba(34,211,238,0.18)] sm:p-8"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                  <Sparkles className="h-4 w-4" />
                  Join Pillars of Tech
                </div>
                <h3 className={`${fredoka.className} mt-4 text-3xl font-bold text-white sm:text-4xl`}>
                  Want to join our team? Sign up here.
                </h3>
                <p className="mt-3 text-base leading-7 text-blue-100/90 sm:text-lg">
                  We are always excited to meet students who want to help with events, outreach, programs, and new ideas across Pillars of Tech.
                </p>
              </div>

              <div className="inline-flex items-center gap-3 self-start rounded-full border border-white/15 bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-blue-900 transition-colors group-hover:bg-cyan-50">
                Apply To Join
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}
