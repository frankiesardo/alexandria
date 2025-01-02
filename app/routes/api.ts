import type { Route } from "./+types/chat";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { head } from "@vercel/blob";

const openai = createOpenAICompatible({
  name: "openai-proxy",
  baseURL: `${process.env.OPENAI_API_BASE_URL}`,
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
});

export const action = async ({ request, params }: Route.ActionArgs) => {
  const { messages } = await request.json();
  const { id } = params;
  const fileName = id + ".txt"
  const { url } = await head(fileName);
  const response = await fetch(url);
  const text = await response.text()

  const systemMessage = {
    role: "system",
    content: `
Answer all questions related to this book.

--- BEGIN BOOK ---
${text}
--- END BOOK ---
    `,
  };

  const result = streamText({
    model: openai("google:gemini-1.5-pro-001"),
    messages: [systemMessage, ...messages],
  });

  return result.toDataStreamResponse();
};