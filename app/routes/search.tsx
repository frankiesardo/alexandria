import { Form, redirect, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/search";
import { put, head } from "@vercel/blob";
import { extractText, getDocumentProxy } from "unpdf";
import { parseEpub } from "epub-parser-simple";

export const config = { runtime: "edge" };

let isCold = true;
let initialDate = Date.now();

export function headers() {
  return {
    'x-edge-age': Date.now() - initialDate,
  };
}

function parseVercelId(id: string | null) {
  const parts = id?.split(":").filter(Boolean);
  if (!parts) {
    console.log('"x-vercel-id" header not present. Running on localhost?');
    return { proxyRegion: "localhost", computeRegion:"localhost" }
  }
  const proxyRegion = parts[0];
  const computeRegion = parts[parts.length - 2];
  return { proxyRegion, computeRegion }
}

export async function loader({ request }: Route.LoaderArgs) {
  const wasCold = isCold;
  isCold = false;

  const parsedId = parseVercelId(request.headers.get("x-vercel-id"));

  console.log({wasCold, parsedId})

  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";

  const response = await fetch(
    `https://z-lib.gs/s/${encodeURIComponent(
      query
    )}?extensions%5B0%5D=PDF&extensions%5B1%5D=EPUB`
  );

  const body = await response.text();
  const books = parseBooks(body);
  return books;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const id = formData.get("id")
  const extension = formData.get("extension")
  const textFileName = id + ".txt"

  try {
    const { url } = await head(textFileName); 
    console.log("hit", url);   
    return redirect("/chat/" + id);
  } catch (e) {
    // File not present, download it
  }

  const href = formData.get("href")
  const response = await fetch("https://z-lib.gs" + href);
  const body = await response.text();

  const regex = /href="\/?(dl\/[^\/]+\/[^"]+)"/;
  const match = body.match(regex);
  const downloadPath = match![1];
  const downloadResponse = await fetch("https://z-lib.gs/" + downloadPath);

  // Cache a copy of the original book
  const blob = await put(id + "." + extension, await downloadResponse.arrayBuffer(), { access: "public", addRandomSuffix: false })

  const text = await (extension === "pdf" ? extractPdf(blob.url) : extractEpub(blob.url));
  const { url } = await put(textFileName, text!, { access: "public", addRandomSuffix: false });
  console.log("miss", url);

  return redirect("/chat/" + id);
}

async function extractPdf(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));

  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function extractEpub(url: string) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const epubObj = await parseEpub(buffer);

  const text = epubObj.sections?.map(section => section.parsed_data.map(data => data.value).join("\n")).join("\n\n");
  return text;
}

export default function Search() {
  const books = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isNavigating = Boolean(navigation.location);

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-24">
      {isNavigating && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div className="w-full max-w-md md:max-w-4xl">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Search Results</h2>
          <div className="space-y-4">
            {books.length === 0 ? (
              <div className="rounded-lg border bg-card p-8 text-center shadow-sm">
                <p className="text-muted-foreground">No books found</p>
              </div>
            ) : (
              books.map((book) => (
                <Form key={book.id} method="post" className="block">
                  <input type="hidden" name="id" value={book.id} />
                  <input
                    type="hidden"
                    name="extension"
                    value={book.extension}
                  />
                  <input type="hidden" name="href" value={book.href} />
                  <button type="submit" className="w-full text-left">
                    <div className="rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-4 flex items-start space-x-4">
                        {book.img && (
                          <img
                            src={
                              book.img === "/img/cover-not-exists.png"
                                ? "https://z-lib.gs/img/cover-not-exists.png"
                                : book.img
                            }
                            alt={book.title || "Book cover"}
                            width={80}
                            height={120}
                            className="object-cover rounded-sm"
                          />
                        )}
                        <div className="flex-1 space-y-2">
                          <div>
                            <h3 className="font-semibold">{book.title}</h3>
                            <p className="text-sm text-gray-600">{book.author}</p>
                            <p className="text-sm text-gray-500">
                              {book.publisher} • {book.year !== "0" && book.year}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {book.language && (
                              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors bg-secondary text-secondary-foreground">
                                {book.language}
                              </div>
                            )}
                            {book.filesize && (
                              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors">
                                {book.filesize}
                              </div>
                            )}
                            {book.extension && (
                              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors">
                                {book.extension}
                              </div>
                            )}
                          </div>

                          {book.note && (
                            <p className="text-sm text-muted-foreground">
                              {book.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </Form>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Book {
  id?: string;
  isbn?: string;
  href?: string;
  publisher?: string;
  language?: string;
  year?: string;
  extension?: string;
  filesize?: string;
  rating?: string;
  quality?: string;
  img?: string;
  title?: string;
  author?: string;
  note?: string;
}

function parseBooks(html: string): Book[] {
  const books: Book[] = [];

  // Split the HTML string by z-bookcard opening tags
  const parts = html.split("<z-bookcard");

  // Skip the first part (everything before the first z-bookcard)
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const endIndex = part.indexOf("</z-bookcard>");
    if (endIndex === -1) continue;

    const book: any = {};

    // Extract main attributes
    const attributes = [
      "id",
      "isbn",
      "href",
      "publisher",
      "language",
      "year",
      "extension",
      "filesize",
      "rating",
      "quality",
    ];

    for (const attr of attributes) {
      const match = part.match(new RegExp(`${attr}="([^"]*)"`));
      if (match) book[attr] = unescape(match[1])
    }

    // Extract content fields
    const contentFields = {
      img: 'data-src="([^"]*)"',
      title: '<div slot="title"[^>]*>(.*?)</div>',
      author: '<div slot="author"[^>]*>(.*?)</div>',
      note: '<div slot="note"[^>]*>(.*?)</div>',
    };

    for (const [field, pattern] of Object.entries(contentFields)) {
      const match = part.match(new RegExp(pattern));
      if (match) book[field] = unescape(match[1].trim());
    }

    books.push(book);
  }

  return books;
}

function unescape(s: string) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");;
}