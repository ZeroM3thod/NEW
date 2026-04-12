'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import './admin.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/auth/signin')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        if (profile?.role !== 'admin') {
          // Not an admin, redirect to user dashboard
          router.push('/dashboard')
          return
        }

        setIsAdmin(true)
      } catch (err) {
        console.error('Admin check error:', err)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [router, supabase, pathname])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: 'var(--cream)',
        color: 'var(--txt2)'
      }}>
        Loading...
      </div>
    )
  }

  if (!isAdmin) {
    return null // Will redirect
  }

  return <>{children}</>
}
