'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'

export default function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div className="animate-pulse h-8 w-20 bg-gray-300 rounded-md"></div> // Placeholder while loading
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        {/* Conditionally show Recruiter Dashboard link */} 
        {session.user?.role === 'RECRUITER' && (
          <Link href="/recruit" className="text-sm hover:underline" title="Gå til Rekrutterer Dashboard">
            Dashboard
          </Link>
        )}
        {/* Candidate Links */} 
        {session.user?.role === 'CANDIDATE' && (
          <>
            <Link href="/my-cv" className="text-sm hover:underline" title="Gå til Min CV">
              Min CV
            </Link>
            <Link href="/my-jobs" className="text-sm hover:underline" title="Gå til Mine Jobber">
              Mine Jobber
            </Link>
          </>
        )}
        {/* Existing Account Link */} 
        <Link href="/account" className="text-sm hidden sm:inline hover:underline" title="Gå til Min Konto">
          {session.user?.email} 
        </Link>
        {/* Existing Logout Button */} 
        <button 
          onClick={() => signOut({ callbackUrl: '/' })} 
          className="btn btn-secondary btn-sm"
        >
          Logg ut
        </button>
      </div>
    )
  }

  return (
    <Link href="/auth/signin" className="btn btn-primary btn-sm">
      Logg inn
    </Link>
  )
} 