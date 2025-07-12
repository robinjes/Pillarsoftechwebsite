'use client'

import { motion } from 'framer-motion'
import { Fredoka } from 'next/font/google'
import Image from 'next/image'

const fredoka = Fredoka({ subsets: ['latin'] })

export default function Programs() {
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
            <h2 className={`${fredoka.className} text-4xl font-bold text-white mb-4`}>Our Current Plans</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Discover our current initiatives and upcoming events to help students excel in STEM
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SSP Flyer Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-blue-800/50 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all p-6"
          >
            <div className="text-center">
              <div className="relative w-full h-64 mb-6">
                <Image
                  src="/SSP_flyer.png"
                  alt="Science @ Stockmen's Park Flyer"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <h3 className={`${fredoka.className} text-2xl font-semibold text-white mb-4`}>
                Find Us at Science @ Stockmen's Park
              </h3>
              <p className="text-blue-100 text-lg">
                Come visit our table at Science @ Stockmen's Park on October 4th! We'll be showcasing our STEM programs and connecting with the community.
              </p>
            </div>
          </motion.div>

          {/* Library Partnership Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="bg-blue-800/50 backdrop-blur-sm border border-white/20 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all p-6"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className={`${fredoka.className} text-2xl font-semibold text-white mb-4`}>
                Library Partnership Initiative
              </h3>
              <p className="text-blue-100 text-lg">
                We are working to partner with the Livermore Public Library and the Rotary READY program to tutor middle schoolers and host workshops in the library. This collaboration will expand our reach and provide valuable educational opportunities to the community.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
} 