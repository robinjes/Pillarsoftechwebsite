'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Fredoka } from 'next/font/google'
import { ArrowUpRight, GraduationCap, MapPin, Sparkles, Users } from 'lucide-react'

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
    description: 'Bringing new partnerships to Pillars of Tech and innovating ideas to create stronger relationships and efficient nonprofit work',
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
      major: 'Aerospace Engineer'
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
  const useUnoptimizedImage = member.name === 'Yashas Jeedi' || member.name === 'Michael Nolan McClung'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-700/20 to-blue-900/20 backdrop-blur-md hover:border-cyan-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-6">
        {/* Image - Square */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/15 to-blue-600/15 shadow-inner shadow-black/10">
          <div className="relative aspect-[3/4] w-full">
            <Image
              src={member.image}
              alt={member.name}
              fill
              className="h-full w-full object-cover"
              priority={index < 3}
              quality={100}
              unoptimized={useUnoptimizedImage}
            />
          </div>
        </div>

        {/* Info */}
        <div>
          <h3 className={`${fredoka.className} text-xl font-bold text-white mb-1`}>{member.name}</h3>
          <p className="text-sm font-semibold text-cyan-300 mb-4">{member.position}</p>
          
          {/* Details Grid */}
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Grade</p>
                <p className="text-blue-100 mt-1">{member.details.grade}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">From</p>
                <p className="text-blue-100 mt-1">{member.details.from}</p>
              </div>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">School</p>
              <p className="text-blue-100 mt-1">{member.details.school}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Hobby</p>
                <p className="text-blue-100 mt-1">{member.details.hobby}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Favorite App</p>
                <p className="text-blue-100 mt-1">{member.details.favoriteApp}</p>
              </div>
            </div>
            
            <div>
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Planned Major</p>
              <p className="text-blue-100 mt-1">{member.details.major}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Team() {
  return (
    <section id="team" className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 pt-20 pb-20">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-blue-900/45 to-blue-700/50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_45%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Subtle Join Banner */}
        <motion.div
          className="mb-12 rounded-lg border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-6 py-3 backdrop-blur-sm"
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-cyan-100">Want to join us? We're always looking for passionate students!</p>
            <a
              href={teamJoinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              Apply Now →
            </a>
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 mb-6">
            <Users className="h-4 w-4" />
            Meet Our Team
          </div>
          <h1 className={`${fredoka.className} text-5xl md:text-6xl font-bold text-white mb-4`}>
            The People Behind Pillars of Tech
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Meet the passionate students dedicated to making STEM education accessible to everyone.
          </p>
        </motion.div>

        {/* Team Grid */}
        <div className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <MemberCard key={member.name} member={member} index={index} />
            ))}
          </div>
        </div>

        {/* Join CTA */}
        <motion.div
          className="group relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 p-8 md:p-12 backdrop-blur-md hover:border-cyan-400/50 transition-all duration-300 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 mb-4">
              <Sparkles className="h-4 w-4" />
              Join Us
            </div>
            <h2 className={`${fredoka.className} text-3xl md:text-4xl font-bold text-white mb-3`}>
              Interested in Joining?
            </h2>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-6">
              We're always looking for passionate students who want to help grow STEM education in our community.
            </p>
            <a
              href={teamJoinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              Apply Now
              <ArrowUpRight className="h-5 w-5" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
