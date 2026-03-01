/**
 * Tests for utils/chatUtils.ts
 * =============================
 * Verifies markdown formatting fixes applied to chat messages.
 *
 * Covers:
 *  - Newline insertion before numbered lists
 *  - Newline insertion before bullet points
 *  - Newline after "Here are the details:"
 *  - Empty / falsy input handling
 */

import { describe, it, expect } from 'vitest';
import { formatChatMessage } from '../../src/utils/chatUtils';

describe('formatChatMessage', () => {
  it('inserts newlines before numbered lists', () => {
    const input = 'Summary: 1. **Scene A** 2. **Scene B**';
    const result = formatChatMessage(input);

    expect(result).toContain('\n\n1. **Scene A**');
    expect(result).toContain('\n\n2. **Scene B**');
  });

  it('inserts newline before bullet points', () => {
    const input = 'ID: ABC - **Date** something';
    const result = formatChatMessage(input);

    expect(result).toContain('\n- **Date**');
  });

  it('inserts newline after "Here are the details:"', () => {
    const input = 'Here are the details: some info';
    const result = formatChatMessage(input);

    expect(result).toContain('Here are the details:\n\n');
  });

  it('returns empty string for falsy input', () => {
    expect(formatChatMessage('')).toBe('');
    expect(formatChatMessage(null as unknown as string)).toBe('');
    expect(formatChatMessage(undefined as unknown as string)).toBe('');
  });
});
