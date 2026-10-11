import type { RiskLevel } from './types'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

export function formatINR(value: number) {
  const rounded = Math.round(value)
  return `${rounded < 0 ? '−' : ''}${inr.format(Math.abs(rounded))}`
}

export function formatSignedINR(value: number) {
  const rounded = Math.round(value)
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${inr.format(Math.abs(rounded))}`
}

export function formatCompactINR(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1000) {
    const k = abs / 1000
    return `${sign}₹${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return `${sign}₹${Math.round(abs)}`
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  healthy: 'Healthy',
  tight: 'Tight',
  stretched: 'Stretched',
  critical: 'Critical',
  comfortable: 'Healthy',
  safe: 'Healthy',
  high: 'Stretched',
  deficit: 'Critical',
}

export const RISK_FULL_LABEL: Record<RiskLevel, string> = {
  healthy: 'Healthy / Low risk',
  tight: 'Tight / Moderate risk',
  stretched: 'Stretched / High risk',
  critical: 'Critical / Very high risk',
  comfortable: 'Healthy / Low risk',
  safe: 'Healthy / Low risk',
  high: 'Stretched / High risk',
  deficit: 'Critical / Very high risk',
}
