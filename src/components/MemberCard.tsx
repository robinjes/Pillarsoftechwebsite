import { VolunteerProfile } from '@/lib/volunteerService'
import { Fredoka, Space_Grotesk } from 'next/font/google'

const fredoka = Fredoka({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export const MemberCardContent = ({ profile }: { profile: VolunteerProfile }) => (
  <div
    id="member-card"
    className="w-full max-w-md mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-5 sm:p-8 text-white shadow-2xl border border-white/20 print:shadow-none"
  >
    {/* Header */}
    <div className="text-center mb-8">
      <div className={`${fredoka.className} text-3xl font-bold mb-2`}>POT</div>
      <p className={`${spaceGrotesk.className} text-xs tracking-widest opacity-90`}>
        Pillars of Tech
      </p>
      <p className={`${spaceGrotesk.className} text-xs tracking-widest opacity-90`}>
        Volunteer Member Card
      </p>
    </div>

    {/* Member Info */}
    <div className="bg-white/10 backdrop-blur rounded-2xl p-4 sm:p-6 mb-6">
      <p className={`${spaceGrotesk.className} text-xs opacity-75 mb-1`}>Name</p>
      <h3 className={`${fredoka.className} text-xl sm:text-2xl font-bold mb-6 break-words`}>{profile.fullName}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <p className={`${spaceGrotesk.className} text-xs opacity-75 mb-1`}>Member Code</p>
          <p className={`${fredoka.className} text-lg sm:text-xl font-bold tracking-wider`}>
            {profile.memberCode}
          </p>
        </div>
        <div className="sm:text-right">
          <p className={`${spaceGrotesk.className} text-xs opacity-75 mb-1`}>Status</p>
          <p className={`${fredoka.className} text-lg font-bold`}>🟢 Active</p>
        </div>
      </div>

      <p className={`${spaceGrotesk.className} text-xs opacity-60 break-all`}>{profile.email}</p>
    </div>

    {/* QR Code */}
    <div className="bg-white p-4 rounded-2xl flex justify-center mb-6">
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(profile.memberCode)}`}
        alt="QR Code"
        width={160}
        height={160}
        className="select-none"
      />
    </div>

    {/* Footer */}
    <div className="text-center">
      <p className={`${spaceGrotesk.className} text-xs opacity-75 leading-relaxed`}>
        Show this card at event check-in to log your volunteer hours and earn badges!
      </p>
    </div>
  </div>
)
