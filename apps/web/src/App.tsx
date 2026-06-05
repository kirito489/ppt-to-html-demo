import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { Tooltip as TooltipPrimitive } from 'radix-ui'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RequireAuth } from '@/components/RequireAuth'
import { Layout } from '@/routes/_layout'
import { LoginPage } from '@/routes/login/page'
import { HomePage } from '@/routes/home/page'
import { ArticlesListPage } from '@/routes/articles/page'
import { ArticleDetailPage } from '@/routes/articles/detail'
import { ConversionJobsPage } from '@/routes/jobs/page'
import { queryClient } from '@/api/query-client'
import { Toaster } from '@/components/ui/sonner'

const TooltipProvider = TooltipPrimitive.Provider

export const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<HomePage />} />
                <Route path="/articles" element={<ArticlesListPage />} />
                <Route path="/articles/:id" element={<ArticleDetailPage />} />
                <Route
                  path="/conversion-jobs"
                  element={<ConversionJobsPage />}
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        <Toaster richColors closeButton />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
