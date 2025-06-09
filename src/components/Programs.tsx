'use client'

import { motion } from 'framer-motion'
import { Fredoka } from 'next/font/google'

const fredoka = Fredoka({ subsets: ['latin'] })

export default function Programs() {
  const programs = [
    {
      title: 'Weekly STEM Programs',
      description: 'Regular hands-on sessions covering various STEM topics, from coding to robotics.'
    },
    {
      title: 'School Chapters',
      description: 'Student-led STEM clubs in schools, fostering peer learning and collaboration.'
    },
    {
      title: 'STEM Competition Hub',
      description: 'We plan to host different STEM competitions for students to participate in and showcase their projects and skills for prizes!'
    },
    {
      title: 'Mentorship Network',
      description: 'Connect with experienced professionals and receive guidance in your STEM journey.'
    }
  ]

  return (
    <section id="programs" className="py-20 bg-gradient-to-br from-secondary via-accent to-blue-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-block bg-blue-800/50 backdrop-blur-sm border border-white/20 px-8 py-4 rounded-lg">
            <h2 className={`${fredoka.className} text-4xl font-bold text-white mb-4`}>Our Future Plans</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Discover our vision and upcoming initiatives to help students excel in STEM
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {programs.map((program, index) => (
            <motion.div
              key={program.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="bg-blue-800/50 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all p-6"
            >
              <h3 className={`${fredoka.className} text-xl font-semibold text-white mb-2`}>{program.title}</h3>
              <p className="text-blue-100">{program.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 