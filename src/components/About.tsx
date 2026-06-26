'use client'

import { motion } from 'framer-motion'
import { Fredoka } from 'next/font/google'
import { GraduationCap, Lightbulb, Users, Target, Heart, Code, Rocket } from 'lucide-react'
import Link from 'next/link'

const fredoka = Fredoka({ subsets: ['latin'] })

const partnerOrganizations = [
  {
    name: 'Hack Club',
    subtitle: 'Fiscal sponsor',
    monogram: 'HC',
  },
  {
    name: 'Pedrozzi Youth Foundation',
    subtitle: 'Community partner',
    monogram: 'PY',
  },
  {
    name: 'QUEST Science Center',
    subtitle: 'STEM collaborator',
    monogram: 'QS',
  },
  {
    name: 'Altamont Creek Elementary',
    subtitle: 'School partner',
    monogram: 'AC',
  },
]

export default function About() {
  const coreValues = [
    {
      title: 'Accessibility',
      description: 'Technology education should be available to everyone, regardless of background or financial status.',
      Icon: Users,
      color: 'from-cyan-400 to-blue-400'
    },
    {
      title: 'Innovation',
      description: 'We foster creativity and problem-solving through hands-on projects and real-world applications.',
      Icon: Lightbulb,
      color: 'from-amber-400 to-orange-400'
    },
    {
      title: 'Community',
      description: 'Building a supportive network of students, mentors, and industry professionals who lift each other up.',
      Icon: Heart,
      color: 'from-rose-400 to-pink-400'
    },
    {
      title: 'Excellence',
      description: 'We strive for quality in everything we do, from our events to our mentorship programs.',
      Icon: Rocket,
      color: 'from-purple-400 to-indigo-400'
    }
  ]

  const achievements = [
    { number: '1000+', label: 'Students Empowered' },
    { number: '100+', label: 'Volunteer Hours' },
    { number: '3', label: 'Partner Organizations' },
    { number: '∞', label: 'Potential Unlocked' }
  ]

  const pillars = [
    {
      title: 'Hands-On Events',
      description: 'From robotics challenges to coding competitions, we create engaging experiences that spark passion for STEM.',
      Icon: Code
    },
    {
      title: 'Mentorship Programs',
      description: 'Connect with experienced professionals and student leaders who guide your journey in tech.',
      Icon: GraduationCap
    },
    {
      title: 'Community Focus',
      description: 'We prioritize underserved communities and ensure technology education reaches those who need it most.',
      Icon: Users
    }
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 pt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-blue-900/45 to-blue-700/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_45%)]" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.h1
            className={`${fredoka.className} text-5xl md:text-6xl font-bold text-white mb-6`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            About Pillars of Tech
          </motion.h1>
          
          <motion.p
            className="text-xl md:text-2xl text-blue-100 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Empowering students to become the STEM leaders of tomorrow
          </motion.p>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-20 bg-gradient-to-br from-blue-800/20 via-blue-750/20 to-blue-800/20 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Mission */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-700/20 to-blue-900/20 p-10 backdrop-blur-md hover:border-blue-300/40 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <Target className="w-12 h-12 text-cyan-400 mb-4" />
                <h3 className={`${fredoka.className} text-3xl font-bold text-white mb-4`}>Our Mission</h3>
                <p className="text-lg text-blue-100 leading-relaxed">
                  To make technology education accessible and engaging for all students, particularly those in underserved communities. We believe every student has the potential to excel in STEM, and we're committed to providing the opportunities, mentorship, and resources to help them succeed.
                </p>
              </div>
            </motion.div>

            {/* Vision */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-700/20 to-blue-900/20 p-10 backdrop-blur-md hover:border-blue-300/40 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <Rocket className="w-12 h-12 text-purple-400 mb-4" />
                <h3 className={`${fredoka.className} text-3xl font-bold text-white mb-4`}>Our Vision</h3>
                <p className="text-lg text-blue-100 leading-relaxed">
                  By 2026, we envision a world where 1000+ students have been empowered through our programs, equipped with the skills, confidence, and networks to pursue careers in technology. We're building a generation of innovators, leaders, and changemakers who will shape the future.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-16 bg-gradient-to-r from-blue-900/30 to-blue-800/30 backdrop-blur-md border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {achievements.map((achievement, index) => (
              <div key={achievement.label} className="text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`${fredoka.className} text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 mb-2`}
                >
                  {achievement.number}
                </motion.div>
                <p className="text-blue-100 text-lg">{achievement.label}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            className="mt-12 rounded-2xl border border-white/10 bg-white/5 px-6 py-6 backdrop-blur-md"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="mb-5 text-center">
              <h3 className={`${fredoka.className} text-2xl md:text-3xl font-bold text-white`}>
                Our Partners
              </h3>
              <p className="mt-2 text-sm md:text-base text-blue-100/90">
                The organizations helping us expand access to STEM education.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {partnerOrganizations.map((partner) => (
                <div
                  key={partner.name}
                  className="group flex min-w-[220px] flex-1 basis-[220px] items-center gap-4 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 opacity-75 transition-all duration-200 ease-in-out hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/10 hover:opacity-100 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black tracking-[0.18em] text-white/70 transition-all duration-200 ease-in-out group-hover:border-cyan-300/40 group-hover:text-cyan-100">
                    {partner.monogram}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white transition-all duration-200 ease-in-out group-hover:text-cyan-100">
                      {partner.name}
                    </p>
                    <p className="text-sm text-blue-100/70 transition-all duration-200 ease-in-out group-hover:text-blue-100">
                      {partner.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-20 bg-gradient-to-br from-blue-800/20 via-blue-750/20 to-blue-800/20 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className={`${fredoka.className} text-4xl md:text-5xl font-bold text-white mb-4`}>
              Our Core Values
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              These principles guide everything we do and define who we are as an organization
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {coreValues.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-700/20 to-blue-900/20 p-8 backdrop-blur-md hover:border-blue-300/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <value.Icon className="w-10 h-10 text-cyan-400 mb-4" />
                  <h3 className={`${fredoka.className} text-2xl font-bold text-white mb-3`}>
                    {value.title}
                  </h3>
                  <p className="text-blue-100 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900/30 via-blue-800/30 to-blue-900/30 backdrop-blur-md border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className={`${fredoka.className} text-4xl md:text-5xl font-bold text-white mb-4`}>
              How We Make an Impact
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Our work is built on three pillars designed to create lasting change in STEM education
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map((pillar, index) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-700/30 to-blue-900/30 p-8 backdrop-blur-md hover:border-blue-300/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <pillar.Icon className="w-12 h-12 text-cyan-400 mb-4" />
                  <h3 className={`${fredoka.className} text-2xl font-bold text-white mb-3`}>
                    {pillar.title}
                  </h3>
                  <p className="text-blue-100 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="py-20 bg-gradient-to-br from-blue-800/20 via-blue-750/20 to-blue-800/20 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className={`${fredoka.className} text-4xl font-bold text-white mb-6`}>
              Who We Are
            </h2>
            <div className="space-y-6 text-lg text-blue-100 leading-relaxed">
              <p>
                We are a passionate collective of high school students, mentors, and volunteers united by a single mission: to democratize access to technology education. Our team comes from diverse backgrounds, but we share a common belief that every student deserves the opportunity to discover their potential in STEM.
              </p>
              <p>
                <span className="text-cyan-300 font-semibold">Fiscally sponsored by Hack Club</span>, a nonprofit organization supporting student technologists worldwide, we operate under their 501(c)(3) status. This partnership means every donation is tax-deductible and goes directly to our programs — no overhead, no bureaucracy, just impact.
              </p>
              <p>
                What sets us apart is our student-led approach. We don't just teach STEM; we create experiences that inspire. Through engaging events, meaningful mentorship, and genuine community support, we're building the next generation of STEM leaders, innovators, and changemakers.
              </p>
              <p>
                Our commitment extends beyond the classroom. We're actively working to bridge the digital divide, ensure equitable access to technology education, and create pathways for students from underrepresented communities to succeed in tech careers.
              </p>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="https://hcb.hackclub.com/pillars-of-tech/transparency"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                View Our Transparency Report
              </a>
              <Link
                href="/contact"
                className="inline-block border-2 border-cyan-400 text-cyan-300 hover:bg-cyan-400/10 px-8 py-3 rounded-lg font-semibold transition-all duration-300"
              >
                Get in Touch
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-700 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className={`${fredoka.className} text-4xl font-bold text-white mb-6`}>
              Join Our Mission
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Whether you're a student looking to learn, an educator wanting to volunteer, or a company interested in supporting tech education, there's a place for you in our community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="https://docs.google.com/forms/d/e/1FAIpQLSdsNmpS2wpikV77wl1ifpD52a0zAepa-b8DhesqFjPTQVoo7w/viewform"
                className="inline-block bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                Join Our Team
              </Link>
              <Link
                href="https://hcb.hackclub.com/donations/start/pillars-of-tech"
                className="inline-block border-2 border-white text-white hover:bg-white/10 px-8 py-3 rounded-lg font-semibold transition-all duration-300"
              >
                Support Our Work
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  )
} 
