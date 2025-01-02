import type { Route } from "./+types/chat";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { head } from "@vercel/blob";
import { parseEpub } from 'epub-parser-simple'
import { extractText, getDocumentProxy } from 'unpdf'

const openai = createOpenAICompatible({
  name: "openai-proxy",
  baseURL: `${process.env.OPENAI_API_BASE_URL}`,
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
});


async function getPdf(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));

  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function getEpub(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const epubObj = await parseEpub(buffer);

  const text = epubObj.sections?.map(section => section.parsed_data.map(data => data.value).join("\n")).join("\n\n");
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

  console.time(id)
  const text = isPdf ? await getPdf(url) : await getEpub(url);
  console.timeEnd(id)

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