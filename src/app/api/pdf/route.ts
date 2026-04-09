import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "PDFファイルをアップロードしてください" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const pdfData = await pdfParse(buffer);

    return NextResponse.json({ text: pdfData.text });
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json(
      { error: "PDFの解析に失敗しました" },
      { status: 500 }
    );
  }
}
