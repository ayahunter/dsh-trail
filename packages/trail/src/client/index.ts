/**
 * dsh-trail client plugin: replaces the `trajectory` conversation view with a
 * new-user-friendly storyline. Reads only top-level snapshot fields, so it is
 * independent of the shipped ui-trajectory plugin.
 */
import type { ReactNode } from 'react'
import { TRAIL_CSS } from './style'
import { TrajectoryView, type TrailViewProps } from './view'

/** The subset of the cordis context this plugin reads. */
export interface TrailCtx {
  get(name: string): unknown
  effect(callback: () => (() => void) | void, label?: string): unknown
}

interface SlotsService {
  inject(name: string, callback: () => void): unknown
  register(options: {
    name: string
    id: string
    order?: number
    label?: () => string
    inject?: (sessionId: string) => Record<string, unknown>
  }, component: (props: TrailViewProps) => ReactNode): unknown
}

interface SessionsService {
  binding(id: string): { session?: { loadOlder(): Promise<unknown> } } | undefined
}

/** Required browser services (hard dependencies like the shipped trajectory plugin). */
export const inject = ['slots', 'sessions']

/**
 * Register the friendly trajectory view. The style tag and the slot
 * contribution both belong to this fiber, so unload removes them.
 * @param ctx - client root context.
 */
export function apply(ctx: TrailCtx): void {
  const slots = ctx.get('slots') as SlotsService | undefined
  if (slots === undefined) return
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-trail'
    tag.textContent = TRAIL_CSS
    document.head.appendChild(tag)
    return () => { tag.remove() }
  })
  const sessions = ctx.get('sessions') as SessionsService | undefined
  slots.inject('conversation.view', () => slots.register({
    name: 'conversation.view',
    id: 'trajectory',
    order: 10,
    label: () => '轨迹',
    inject: (sessionId: string) => ({
      loadOlder: async (): Promise<boolean> => {
        if (sessions === undefined) return false
        const binding = sessions.binding(sessionId)
        if (binding === undefined || binding.session === undefined) return false
        await binding.session.loadOlder()
        return true
      },
    }),
  }, TrajectoryView))
}
