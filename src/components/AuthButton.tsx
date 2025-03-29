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
        <Link href="/account" className="text-sm hidden sm:inline hover:underline" title="Gå til Min Konto">
          {session.user?.email}
        </Link>
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