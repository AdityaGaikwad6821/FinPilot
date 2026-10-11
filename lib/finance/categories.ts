import {
  Bus,
  CircleDot,
  Cloud,
  Dumbbell,
  GraduationCap,
  House,
  type LucideIcon,
  Music,
  ReceiptText,
  Repeat,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Ticket,
  Tv,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react'
import type { CategoryId } from './types'

interface CategoryMeta {
  label: string
  icon: LucideIcon
  color: string
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  food: { label: 'Food', icon: UtensilsCrossed, color: 'var(--chart-1)' },
  groceries: { label: 'Groceries', icon: ShoppingBasket, color: 'var(--chart-2)' },
  transport: { label: 'Transport', icon: Bus, color: 'var(--chart-3)' },
  entertainment: { label: 'Entertainment', icon: Ticket, color: 'var(--chart-4)' },
  fitness: { label: 'Fitness', icon: Dumbbell, color: 'var(--chart-2)' },
  shopping: { label: 'Shopping', icon: ShoppingBag, color: 'var(--chart-4)' },
  repairs: { label: 'Repairs', icon: Wrench, color: 'var(--chart-5)' },
  education: { label: 'Education', icon: GraduationCap, color: 'var(--chart-1)' },
  bills: { label: 'Bills', icon: ReceiptText, color: 'var(--chart-3)' },
  housing: { label: 'Housing', icon: House, color: 'var(--chart-5)' },
  utilities: { label: 'Utilities', icon: Smartphone, color: 'var(--chart-3)' },
  music: { label: 'Music', icon: Music, color: 'var(--chart-2)' },
  streaming: { label: 'Streaming', icon: Tv, color: 'var(--chart-5)' },
  cloud: { label: 'Storage', icon: Cloud, color: 'var(--chart-3)' },
  subscriptions: { label: 'Subscriptions', icon: Repeat, color: 'var(--chart-1)' },
  other: { label: 'Other', icon: CircleDot, color: 'var(--muted-foreground)' },
}

export const ALL_CATEGORIES: CategoryId[] = [
  'food',
  'groceries',
  'transport',
  'entertainment',
  'fitness',
  'shopping',
  'repairs',
  'education',
  'bills',
  'housing',
  'utilities',
  'music',
  'streaming',
  'cloud',
  'subscriptions',
  'other',
]

export const SIMULATOR_CATEGORIES: CategoryId[] = [
  'entertainment',
  'food',
  'shopping',
  'fitness',
  'repairs',
  'transport',
  'education',
  'subscriptions',
  'other',
]
