import type { Route } from "./+types/chat";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import pdf from "pdf-parse";
import { parseEpub } from '@gxl/epub-parser'
import { head } from "@vercel/blob";

const openai = createOpenAICompatible({
  name: "openai-proxy",
  baseURL: `${process.env.OPENAI_API_BASE_URL}`,
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
});

async function getPdf(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const data = await pdf(buffer);
  return data.text;
}

async function getEpub(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const epubObj = await parseEpub(buffer, {
    type: 'buffer',
  });

  const text = epubObj.sections?.map(section => section.toMarkdown!()).concat("\n\n");
  console.log("foo")
  console.log(text)
  return text;
}

export const action = async ({ request, params }: Route.ActionArgs) => {
  const { messages } = await request.json();
  const { id } = params;
  const isPdf = id.endsWith(".pdf");
  const isEpub = id.endsWith(".epub");

  if (!isPdf && !isEpub) {
    throw new Error(
      "Unsupported file format. Only PDF and EPUB files are supported."
    );
  }

  const { url } = await head(id);
  console.log(url)
  const text = isPdf ? await getPdf(url) : await getEpub(url);

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