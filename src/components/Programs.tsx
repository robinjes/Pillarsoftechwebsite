'use client'

import { motion } from 'framer-motion'
import { Fredoka } from 'next/font/google'

const fredoka = Fredoka({ subsets: ['latin'] })

export default function Programs() {
  return (
    <>
      {/* Past Events Title - Dark Blue Background */}
      <section className="min-h-[40vh] flex items-center justify-center bg-gradient-to-br from-blue-800 via-blue-850 to-blue-800">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className={`${fredoka.className} text-7xl md:text-8xl lg:text-9xl font-bold text-white`}>Past Events</h2>
          </motion.div>
        </div>
      </section>

      {/* Background Image Section */}
      <section id="programs" className="py-32 min-h-screen relative overflow-hidden">
        {/* Scrollable Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/SSPResultBG.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Event Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block bg-blue-800/50 backdrop-blur-sm border border-white/20 px-8 py-4 rounded-lg">
              <h3 className={`${fredoka.className} text-4xl font-bold text-white`}>Science At Stockmens Park</h3>
            </div>
          </motion.div>

        {/* Two Column Layout: Statistics and Event Description */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: What Was The Event */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="bg-blue-800/50 backdrop-blur-sm border border-white/20 rounded-lg p-8"
          >
            <h3 className={`${fredoka.className} text-3xl font-bold text-white mb-6 text-center`}>
              About The Event
            </h3>
            <div className="space-y-4">
              <p className="text-blue-100 text-lg">
                Our Foil Boat Competition brought participants together to test their creativity and engineering skills using one simple material: aluminum foil. Each participant designed and built a foil boat, then put it to the test to see how many pennies their boat could hold before sinking. The boat that supported the most pennies was crowned the winner!
              </p>
              <p className="text-blue-100 text-lg">
                The event provided a fun, hands-on way to explore STEM concepts, especially the science of buoyancy, stability, and design. Participants learned how small changes in structure can make a big difference—while enjoying some friendly competition.
              </p>
              <p className="text-blue-100 text-lg">
                It was an engaging and educational experience that highlighted the power of creativity and science in action.
              </p>
            </div>
          </motion.div>

          {/* Right Side: Statistics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-blue-800/50 backdrop-blur-sm border border-white/20 rounded-lg p-8"
          >
            <h3 className={`${fredoka.className} text-3xl font-bold text-white mb-6 text-center`}>
              Event Statistics
            </h3>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">400+</div>
                <p className="text-blue-100 text-lg">Participants</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">1,000</div>
                <p className="text-blue-100 text-lg">Total Event Attendees</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-white mb-2">3</div>
                <p className="text-blue-100 text-lg">Hours of Engagement</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      </section>

      {/* Second Event: The Pedrozzi CONNECT Youth Egg Drop - Background Image Section */}
      <section className="py-32 min-h-screen relative overflow-hidden">
        {/* Scrollable Background Image */}
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: 'url(/EggDropBG.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 0,
          }}
        >
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Event Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block bg-blue-800/50 backdrop-blur-sm border border-white/20 px-8 py-4 rounded-lg">
              <h3 className={`${fredoka.className} text-4xl font-bold text-white`}>The Pedrozzi CONNECT Youth Egg Drop</h3>
            </div>
          </motion.div>

          {/* Two Column Layout: Statistics and Event Description */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side: What Was The Event */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-blue-800/50 backdrop-blur-sm border border-white/20 rounded-lg p-8"
            >
              <h3 className={`${fredoka.className} text-3xl font-bold text-white mb-6 text-center`}>
                About The Event
              </h3>
              <div className="space-y-4">
                <p className="text-blue-100 text-lg">
                  We partnered with the Pedrozzi CONNECT Youth program to host our Egg Drop Competition, bringing participants together to test their creativity and engineering skills by designing protective containers for raw eggs. Each participant created a device to protect their egg from a drop, then put it to the test to see if their egg would survive the fall. The designs that successfully protected their eggs were crowned the winners!
                </p>
                <p className="text-blue-100 text-lg">
                  The event provided a fun, hands-on way to explore STEM concepts, especially the science of impact forces, shock absorption, and design. Participants learned how small changes in structure can make a big difference—while enjoying some friendly competition.
                </p>
                <p className="text-blue-100 text-lg">
                  It was an engaging and educational experience that highlighted the power of creativity and science in action.
                </p>
              </div>
            </motion.div>

            {/* Right Side: Statistics */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-blue-800/50 backdrop-blur-sm border border-white/20 rounded-lg p-8"
            >
              <h3 className={`${fredoka.className} text-3xl font-bold text-white mb-6 text-center`}>
                Event Statistics
              </h3>
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">35+</div>
                  <p className="text-blue-100 text-lg">Participants</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">40+</div>
                  <p className="text-blue-100 text-lg">Total Event Attendees</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">1</div>
                  <p className="text-blue-100 text-lg">Hour of Engagement</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  )
} 