'use client'

import { motion } from 'framer-motion'
import { Fredoka } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'

const fredoka = Fredoka({ subsets: ['latin'] })

export default function Fundraiser() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-dark to-primary">
      {/* Navigation Back Button */}
      <div className="p-4">
        <Link href="/" className="text-white hover:text-blue-200 transition-colors">
          ← Back to Home
        </Link>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className={`${fredoka.className} text-4xl md:text-5xl font-bold text-white mb-6`}>
            Partnering with Action in Africa
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Join us in making a difference through education and community empowerment
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Information Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-blue-800/30 backdrop-blur-sm p-6 rounded-lg"
          >
            <h2 className={`${fredoka.className} text-2xl font-bold text-white mb-4`}>
              About Our Partnership
            </h2>
            <div className="prose prose-invert">
              <p className="text-blue-100 mb-4">
                Action in Africa is a nonprofit organization that provides free educaitonal programs and
                essential resources to the people they support in Uganda. Action in Africa strives to bring
                access to learning and opportunity for the people of Uganda. They run a university to help 
                bring education opportunities to the underpriveleged. Currently, 6 of their university scholarship 
                interns need laptops. These laptops help them complete their studies, participate in other 
                activites, and bridge the gap to gain more opportunities. Through this partnership, Pillars of Tech
                wants to help raise these funds to support these 6 students.
              </p>
              <p className="text-blue-100 mb-4">
                Your donation will help support:
              </p>
              <ul className="list-disc list-inside text-blue-100 space-y-2 mb-4">
                <li>Laptops for these students</li>
                <li>Access to online learning resources</li>
                <li>Tools for their long-term success</li>
                <li>Technological skills for the future</li>
              </ul>
            </div>
          </motion.div>

          {/* Donation Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-blue-800/30 backdrop-blur-sm p-6 rounded-lg"
          >
            <h2 className={`${fredoka.className} text-2xl font-bold text-white mb-4`}>
              Make a Difference Today
            </h2>
            <div className="flex justify-center">
              <div className="gfm-embed" data-url="https://www.gofundme.com/f/action-in-africa-laptop-fundraiser/widget/large?sharesheet=fundraiser sidebar&attribution_id=sl:d87f8b7b-8b6e-43b4-b625-8d59492f5e02"></div>
              <script defer src="https://www.gofundme.com/static/js/embed.js"></script>
            </div>
            <div className="mt-6">
              <a
                href="https://actioninafrica.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-transparent border-2 border-blue-500 hover:border-blue-400 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
              >
                Learn More About Action in Africa
              </a>
            </div>
          </motion.div>
        </div>

        {/* Impact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <h2 className={`${fredoka.className} text-3xl font-bold text-white mb-6`}>
            Our Impact Together
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Through this partnership, we aim to bridge the digital divide and create opportunities for
            students to learn and grow in an increasingly connected world.
          </p>
        </motion.div>
      </main>
    </div>
  )
} 