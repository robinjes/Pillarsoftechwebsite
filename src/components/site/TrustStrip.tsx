const trustPoints = [
  {
    label: 'Family-friendly',
    icon: <path d="m7 12 3 3 7-7" />,
  },
  {
    label: 'Hands-on learning',
    icon: <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />,
  },
  {
    label: 'No tech experience needed',
    icon: <path d="M5 19V9l7-5 7 5v10H5Zm4 0v-6h6v6" />,
  },
]

export default function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="What families can expect">
      <div className="shell trust-list">
        {trustPoints.map((point) => (
          <p key={point.label}>
            <span className="trust-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                {point.icon}
              </svg>
            </span>
            {point.label}
          </p>
        ))}
      </div>
    </section>
  )
}
