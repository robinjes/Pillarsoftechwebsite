'use client'

import { motion } from 'framer-motion'
import { Fredoka } from 'next/font/google'

const fredoka = Fredoka({ subsets: ['latin'] })

export default function About() {
  const features = [
    {
      title: 'Education',
      description: 'Providing accessible STEM education and resources to students across all communities.',
      icon: '🎓'
    },
    {
      title: 'Mentorship',
      description: 'Connecting students with experienced mentors for personalized guidance and support.',
      icon: '🤝'
    },
    {
      title: 'Innovation',
      description: 'Fostering creativity and problem-solving skills through hands-on STEM projects.',
      icon: '💡'
    },
    {
      title: 'Community',
      description: 'Building a supportive network of students, educators, and industry professionals.',
      icon: '🌟'
    }
  ]

  return (
    <section id="about" className="py-20 bg-gradient-to-br from-blue-800 via-blue-850 to-blue-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className={`${fredoka.className} text-4xl font-bold text-white mb-4`}>
            Helping YOU learn, practice and master STEM
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            We are dedicated to making STEM education accessible and engaging for students of all backgrounds
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="bg-blue-800/50 backdrop-blur-sm border border-white/20 p-8 rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className={`${fredoka.className} text-2xl font-semibold text-white mb-3`}>{feature.title}</h3>
              <p className="text-blue-100">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-20 bg-blue-800/50 backdrop-blur-sm border border-white/20 p-8 rounded-lg"
        >
          <div className="text-center">
            <h3 className={`${fredoka.className} text-2xl font-bold text-white mb-4`}>Partnering with Action in Africa</h3>
            <p className="text-lg text-blue-100 max-w-3xl mx-auto mb-6">
              We're proud to partner with Action in Africa to provide technology resources and support to their student program. Through this collaboration, we're expanding access to technology education and creating opportunities for students in Africa.
            </p>
            <a 
              href="#contact" 
              className="inline-block bg-primary/90 hover:bg-primary text-white px-6 py-3 rounded-md font-semibold transition-colors border border-white/20"
            >
              Support Our Partnership
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 