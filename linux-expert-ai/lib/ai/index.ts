/**
 * AI Module Exports
 */

export { streamChatCompletion, chatCompletion, GeminiError } from './gemini'
export { processMessage, processMessageSync } from './orchestrator'
export type { ProcessMessageOptions, StreamChunk } from './orchestrator'
export {
    getConversation,
    addMessage,
    getContextMessages,
    updateSystemContext,
    getSystemContext,
    clearConversation,
    injectToolResult,
} from './memory'
export type { ConversationState } from './memory'
export { registerTool, getTool, getAllTools, executeTool } from './tools'
export type { Tool, ToolResult } from './tools'
