'use client'

import { FinanceProvider } from '@/lib/finance/store'
import { AppShell } from '@/components/finpilot/app-shell'
import { CurrentView } from '@/components/finpilot/views'
import { Toaster } from '@/components/ui/sonner'

export default function Page() {
  return (
    <FinanceProvider>
      <AppShell>
        <CurrentView />
      </AppShell>
      <Toaster position="bottom-right" theme="dark" richColors closeButton />
    </FinanceProvider>
  )
}
