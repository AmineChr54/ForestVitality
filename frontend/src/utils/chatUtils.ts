
/**
 * Utility functions for chat message processing
 */

/**
 * Formats chat messages to improve readability, particularly for markdown lists that might be missing newlines from the backend.
 * @param content The raw message content
 * @returns Formatted content with proper spacing
 */
export const formatChatMessage = (content: string): string => {
    if (!content) return '';

    let formatted = content;

    // fix: Ensure newlines before numbered lists (e.g., "details: 1. **Scene")
    // Look for a number followed by a dot, space, and bold text, preceded by non-newline characters
    formatted = formatted.replace(/([^\n])\s+(\d+\.\s+\*\*)/g, '$1\n\n$2');

    // fix: Ensure newlines before bullet points (e.g., "ID: ABC - **Date")
    // Look for a hyphen, space, and bold text, usually following other text
    formatted = formatted.replace(/([^\n])\s+(-\s+\*\*)/g, '$1\n$2');

    // fix: Ensure "Here are the details:" is followed by a newline
    formatted = formatted.replace(/(Here are the details:)/g, '$1\n\n');

    return formatted;
};
