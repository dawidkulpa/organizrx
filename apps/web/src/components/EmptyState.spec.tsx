import { describe, it, expect } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders message', () => {
    render(<EmptyState message="No items found" />)
    expect(screen.getByText('No items found')).toBeDefined()
  })

  it('renders action button when actionLabel and onAction provided', () => {
    const onClick = () => {}
    render(<EmptyState message="No items" actionLabel="Add Item" onAction={onClick} />)
    const button = screen.getByText('Add Item')
    expect(button).toBeDefined()
    expect(button.getAttribute('class')).toContain('bg-primary')
  })

  it('does not render button when actionLabel missing', () => {
    render(<EmptyState message="No items" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('does not render button when onAction missing', () => {
    render(<EmptyState message="No items" actionLabel="Add" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('calls onAction when button is clicked', () => {
    let clicked = false
    const onClick = () => {
      clicked = true
    }
    render(<EmptyState message="No items" actionLabel="Add" onAction={onClick} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(clicked).toBe(true)
  })
})
