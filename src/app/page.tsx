import { motion } from 'framer-motion'
import Hero from '@/components/Hero'
import About from '@/components/About'
import Programs from '@/components/Programs'
import Contact from '@/components/Contact'
import Navbar from '@/components/Navbar'
import Team from '@/components/Team'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <About />
      <Programs />
      <Team />
      <Contact />
      <Footer />
    </main>
  )
} 