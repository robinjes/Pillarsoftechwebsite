import type { VolunteerProfile } from '@/lib/volunteerService'
import { LocalMemberQr } from './LocalMemberQr'

export const MemberCardContent = ({ profile }: { profile: VolunteerProfile }) => (
  <article
    id="member-card"
    className="w-full max-w-md border-2 border-[var(--ink)] bg-[var(--cream)] p-5 text-[var(--ink)] shadow-[8px_8px_0_var(--sky)] print:shadow-none sm:p-8"
  >
    <header className="border-b-2 border-[var(--ink)] pb-6 text-center">
      <p className="font-display text-4xl leading-none text-[var(--midnight)]">POT</p>
      <p className="mt-3 font-body text-xs font-bold uppercase tracking-[0.24em] text-[var(--cobalt)]">Pillars of Tech</p>
      <p className="mt-1 font-body text-xs uppercase tracking-[0.18em] text-[var(--ink)]/60">Volunteer member card</p>
    </header>

    <section className="border-b border-[var(--ink)]/20 py-6">
      <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-[var(--cobalt)]">Name</p>
      <h2 className="mt-2 break-words font-display text-2xl leading-tight text-[var(--midnight)]">{profile.fullName}</h2>
      <dl className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="font-body text-xs font-bold uppercase tracking-[0.18em] text-[var(--ink)]/55">Member code</dt>
          <dd className="mt-1 break-all font-body text-lg font-bold tracking-[0.12em] text-[var(--midnight)]">{profile.memberCode}</dd>
        </div>
        <div className="sm:text-right">
          <dt className="font-body text-xs font-bold uppercase tracking-[0.18em] text-[var(--ink)]/55">Status</dt>
          <dd className="mt-1 font-body text-lg font-bold text-[var(--cobalt)]">Active</dd>
        </div>
      </dl>
      <p className="mt-5 break-all font-body text-xs text-[var(--ink)]/60">{profile.email}</p>
    </section>

    <section className="flex flex-col items-center border-b border-[var(--ink)]/20 py-6">
      <LocalMemberQr value={profile.memberCode} size={160} alt={`Membership QR code for ${profile.fullName}`} className="select-none" />
      <p className="mt-4 text-center font-body text-xs leading-5 text-[var(--ink)]/65">
        Show this card at event check-in.
      </p>
    </section>

    <p className="pt-5 text-center font-body text-xs leading-5 text-[var(--ink)]/60">
      Keep your member code private and use the staff check-in route when you arrive.
    </p>
  </article>
)
