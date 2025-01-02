import { useChat } from 'ai/react'
import { useParams } from 'react-router';
import Markdown from 'react-markdown'

export default function ChatInterface() {
  const { id } = useParams();
  const { messages, input, handleInputChange, handleSubmit } = 
    useChat({api: "/api/" + id})

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">AI Chat Interface</h1>
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`p-2 rounded-lg ${
              message.role === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'
            } max-w-[80%]`}
          >
            <p className="text-sm font-semibold mb-1">
              {message.role === 'user' ? 'You' : 'AI'}
            </p>
            <p><Markdown>{message.content}</Markdown></p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="flex-1 p-2 border border-gray-300 rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
        >
        Send
        </button>
      </form>
    </div>
  )
}

