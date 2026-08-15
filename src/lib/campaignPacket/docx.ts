import { Document, Packer, Paragraph, HeadingLevel } from 'docx'
import mammoth from 'mammoth'

// The published @types for mammoth omit convertToMarkdown even though it
// exists at runtime (lib/index.js). Narrow to the shape we actually use.
const mammothMarkdown = mammoth as unknown as {
  convertToMarkdown(input: { buffer: Buffer }): Promise<{ value: string }>
}

/**
 * Builds a .docx whose paragraphs mirror the Campaign Packet markdown lines
 * 1:1 — heading lines become real Word heading styles (Heading 1/2/3), every
 * other line (including our literal "- Key: value" bullets) becomes a plain
 * paragraph with that exact text. This isn't meant to look polished in Word;
 * it exists so mammoth's markdown conversion can turn it right back into the
 * same text on import — see docxBufferToMarkdown below.
 */
export async function markdownToDocxBuffer(markdown: string): Promise<Buffer> {
  const paragraphs = markdown.replace(/\r\n/g, '\n').split('\n').map(line => {
    const h1 = /^#\s+(.*)$/.exec(line)
    if (h1) return new Paragraph({ text: h1[1], heading: HeadingLevel.HEADING_1 })
    const h2 = /^##\s+(.*)$/.exec(line)
    if (h2) return new Paragraph({ text: h2[1], heading: HeadingLevel.HEADING_2 })
    const h3 = /^###\s+(.*)$/.exec(line)
    if (h3) return new Paragraph({ text: h3[1], heading: HeadingLevel.HEADING_3 })
    return new Paragraph({ text: line })
  })

  const doc = new Document({ sections: [{ children: paragraphs }] })
  return Packer.toBuffer(doc)
}

/** Converts an uploaded .docx back into the same markdown shape the parser expects. */
export async function docxBufferToMarkdown(buffer: Buffer): Promise<string> {
  const result = await mammothMarkdown.convertToMarkdown({ buffer })
  // mammoth backslash-escapes CommonMark punctuation (\- \. \# ...) even in
  // plain paragraph text that was never meant as markdown syntax — undo that
  // so our parser sees the literal characters it was given at export time.
  return result.value.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~])/g, '$1')
}
