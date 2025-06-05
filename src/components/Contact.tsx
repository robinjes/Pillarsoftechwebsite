'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import emailjs from '@emailjs/browser'
import { Fredoka } from 'next/font/google'

const fredoka = Fredoka({ subsets: ['latin'] })

// Initialize EmailJS
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || ''
const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || ''
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || ''

emailjs.init(PUBLIC_KEY)

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Debug log on component mount
  useEffect(() => {
    console.log('EmailJS Config:', {
      publicKey: PUBLIC_KEY ? 'Set' : 'Missing',
      serviceId: SERVICE_ID ? 'Set' : 'Missing',
      templateId: TEMPLATE_ID ? 'Set' : 'Missing'
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setErrorMessage('')

    if (!PUBLIC_KEY || !SERVICE_ID || !TEMPLATE_ID) {
      console.error('Missing EmailJS configuration')
      setErrorMessage('Email service not properly configured')
      setStatus('error')
      return
    }

    try {
      console.log('Sending email with config:', {
        serviceId: SERVICE_ID,
        templateId: TEMPLATE_ID,
        publicKey: PUBLIC_KEY ? 'Set' : 'Missing'
      })

      const templateParams = {
        to_name: 'Pillars of Tech',
        from_name: formData.name,
        reply_to: formData.email,
        message: formData.message,
        to_email: 'pillarsoftech@gmail.com'
      }

      console.log('Template params:', templateParams)

      const response = await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        templateParams,
        PUBLIC_KEY
      )

      console.log('EmailJS Response:', response)

      if (!response || response.status !== 200) {
        throw new Error('Failed to send email')
      }

      setStatus('success')
      setFormData({ name: '', email: '', message: '' })
      
      setTimeout(() => {
        setStatus('idle')
      }, 3000)
    } catch (error) {
      console.error('Detailed error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send email')
      setStatus('error')
      
      setTimeout(() => {
        setStatus('idle')
        setErrorMessage('')
      }, 3000)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const getSubmitButtonText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...'
      case 'success':
        return 'Message Sent!'
      case 'error':
        return 'Error - Try Again'
      default:
        return 'Send Message'
    }
  }

  const getSubmitButtonStyle = () => {
    switch (status) {
      case 'sending':
        return 'bg-blue-600 cursor-not-allowed opacity-75'
      case 'success':
        return 'bg-green-600 cursor-default'
      case 'error':
        return 'bg-red-600 hover:bg-red-700'
      default:
        return 'bg-blue-850 hover:bg-blue-800'
    }
  }

  return (
    <section id="contact" className="py-20 bg-gradient-to-br from-primary via-dark to-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className={`${fredoka.className} text-4xl font-bold text-white mb-4`}>Get in Touch</h2>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            Have questions or want to get involved? Send us a message!
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto bg-blue-800/50 backdrop-blur-sm border border-white/20 p-8 rounded-lg"
        >
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-500/50 text-white rounded-md">
              {errorMessage}
            </div>
          )}
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-blue-200 mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-md border border-white/20 bg-blue-700/50 text-white focus:border-blue-300 focus:ring-1 focus:ring-blue-300 placeholder-blue-200/50"
                required
                disabled={status === 'sending'}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-md border border-white/20 bg-blue-700/50 text-white focus:border-blue-300 focus:ring-1 focus:ring-blue-300 placeholder-blue-200/50"
                required
                disabled={status === 'sending'}
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-blue-200 mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-md border border-white/20 bg-blue-700/50 text-white focus:border-blue-300 focus:ring-1 focus:ring-blue-300 placeholder-blue-200/50"
                required
                disabled={status === 'sending'}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'sending'}
              className={`w-full ${getSubmitButtonStyle()} text-white px-6 py-3 rounded-md font-semibold transition-colors border border-white/20`}
            >
              {getSubmitButtonText()}
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  )
} 