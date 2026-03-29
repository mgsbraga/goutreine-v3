import { useEffect } from 'react'
import Chart from 'chart.js/auto'

export { Chart }

export function useChart(canvasRef, config, deps) {
  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const chart = new Chart(ctx, config)
    return () => chart.destroy()
  }, deps)
}
