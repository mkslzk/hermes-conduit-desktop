// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'


;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const menu = () => ({ open: { x: 10, y: 10 }, setOpen: vi.fn() })

describe('a header menu with a search field', () => {
  it('focuses the field and shows the empty note when nothing matches', async () => {
    const path = '../src/renderer/src/components/HeaderMenu.tsx'
    const { HeaderMenu } = (await import(/* @vite-ignore */ path)) as { HeaderMenu: unknown }
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const change = vi.fn()
    act(() => root.render(createElement(HeaderMenu as never, {
      menu: menu(),
      title: 'New chat in',
      items: [],
      search: { value: 'zz', onChange: change, placeholder: 'Search bots', empty: 'No bots match' }
    })))
    const input = host.querySelector('input')!
    expect(document.activeElement).toBe(input)
    expect(host.textContent).toContain('No bots match')
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, 'curie')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(change).toHaveBeenCalled()
    act(() => root.unmount())
  })
})
