// lib/utils.js

import { clsx } from 'clsx'

// ─── Class name helper ────────────────────────────────────────────────────────
export function cn(...inputs) {
  return clsx(inputs)
}

// ─── ID Generation ────────────────────────────────────────────────────────────
// Simple collision-resistant ID — no uuid dep needed
export function generateId(prefix = '') {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 8)
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`
}

// ─── Money helpers ────────────────────────────────────────────────────────────
export function centsToDollars(cents) {
  return (cents / 100).toFixed(2)
}

export function dollarsToCents(dollars) {
  return Math.round(parseFloat(dollars) * 100)
}

export function formatMoney(cents) {
  return `$${centsToDollars(cents)}`
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function formatDate(iso, opts = {}) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...opts,
  })
}

export function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function isOverdue(dueDateIso) {
  return new Date(dueDateIso) < new Date()
}

export function daysSince(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ─── Initials ─────────────────────────────────────────────────────────────────
export function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// ─── API fetch helper (client-side) ──────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`)
  return data
}
