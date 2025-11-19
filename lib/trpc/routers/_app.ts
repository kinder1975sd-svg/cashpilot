import { router } from '../trpc'
import { forecastRouter } from './forecast'

export const appRouter = router({
  forecast: forecastRouter,
})

export type AppRouter = typeof appRouter
