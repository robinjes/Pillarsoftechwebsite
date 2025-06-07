'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Fredoka } from 'next/font/google'

const fredoka = Fredoka({ subsets: ['latin'] })

export default function Team() {
  const teamMembers = [
    {
      name: 'Robin Jeshua Deepak',
      position: 'Founder & President',
      image: '/robin.jpg',
      description: 'Leading our technical initiatives, partnering with other organizations, and managing our resources and group.',
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
      position: 'Co-Vice President',
      image: '/yashas.jpg',
      description: 'Focused on developing educational programs and curriculum.',
      details: {
        grade: '11',
        from: 'Livermore, CA',
        school: 'Livermore High School',
        hobby: 'Playing Basketball and video games',
        favoriteApp: 'Youtube/Instagram',
        major: 'Undecided'
      }
    },
    {
      name: 'Nikhil Madineni',
      position: 'Technology Lead',
      image: '/nikhil.jpg',
      description: 'Leading our technical initiatives and workshop content.',
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
      name: 'Rahul Eapen',
      position: 'Co-Vice President',
      image: '/rahul.jpg',
      description: 'Managing partnerships and community engagement.',
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
      name: 'Nolan Mcclung',
      position: 'Communications Director',
      image: '/rohan.jpg',
      description: 'Handling social media and external communications.',
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
      position: 'Program Manager',
      image: '/arya.jpg',
      description: 'Organizing and coordinating our educational programs. ',
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

  return (
    <section id="team" className="py-20 bg-gradient-to-br from-primary via-dark to-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className={`${fredoka.className} text-4xl font-bold text-white mb-4`}>Our Team</h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Meet our dedicated team of high school students working to make a difference
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="bg-blue-800/50 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all"
            >
              <div className="relative h-64 bg-blue-800/50">
                {member.name === 'Yashas Jeedi' ? (
                  <img 
                    src="/yashas.jpg"
                    alt={member.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Error loading image:', e);
                    }}
                  />
                ) : (
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                    priority={true}
                    quality={100}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                )}
              </div>
              <div className="p-6">
                <h3 className={`${fredoka.className} text-xl font-semibold text-white mb-1`}>{member.name}</h3>
                <p className="text-blue-100 font-medium mb-3">{member.position}</p>
                <p className="text-blue-200 mb-4">{member.description}</p>
                {member.details && (
                  <div className="mt-4 space-y-2 text-blue-100">
                    <p><span className="font-semibold">Grade:</span> {member.details.grade}</p>
                    <p><span className="font-semibold">From:</span> {member.details.from}</p>
                    <p><span className="font-semibold">School:</span> {member.details.school}</p>
                    <p><span className="font-semibold">Favorite Hobby:</span> {member.details.hobby}</p>
                    <p><span className="font-semibold">Favorite App:</span> {member.details.favoriteApp}</p>
                    <p><span className="font-semibold">Planned Major:</span> {member.details.major}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 