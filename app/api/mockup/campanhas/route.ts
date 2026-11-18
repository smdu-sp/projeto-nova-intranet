import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"]);

function getSafeExtension(fileName: string, mimeType: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) return ext;

  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/avif") return ".avif";
  if (mimeType === "image/svg+xml") return ".svg";
  return ".jpg";
}

function resolveUniqueFolderName(
  campaignsDir: string,
  day: number,
  month: number,
  year: string
): string {
  const baseName = `${day}-${month}-${year}`;
  if (!fs.existsSync(path.join(campaignsDir, baseName))) {
    return baseName;
  }

  let suffix = 2;
  while (fs.existsSync(path.join(campaignsDir, `${baseName}--${suffix}`))) {
    suffix += 1;
  }
  return `${baseName}--${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title = String(formData.get("title") ?? "").trim();
    const tag = String(formData.get("tag") ?? "").trim();
    const date = String(formData.get("date") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const captionsRaw = String(formData.get("captions") ?? "[]");
    const accessibleTextsRaw = String(formData.get("accessibleTexts") ?? "[]");
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (!title || !tag || !date || !description || files.length === 0) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios e envie pelo menos uma imagem." },
        { status: 400 }
      );
    }

    const dateMatch = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!dateMatch) {
      return NextResponse.json(
        { error: "Formato de data inválido. Esperado AAAA-MM-DD." },
        { status: 400 }
      );
    }

    const year = dateMatch[1];
    const monthNumber = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);

    if (monthNumber < 1 || monthNumber > 12 || day < 1 || day > 31) {
      return NextResponse.json(
        { error: "Data inválida para publicação da campanha." },
        { status: 400 }
      );
    }

    let captionsList: string[] = [];
    let accessibleTextsList: string[] = [];
    try {
      captionsList = JSON.parse(captionsRaw);
      accessibleTextsList = JSON.parse(accessibleTextsRaw);
    } catch {
      captionsList = [];
      accessibleTextsList = [];
    }

    const campaignsDir = path.join(process.cwd(), "public", "mockup", "campanhas");
    fs.mkdirSync(campaignsDir, { recursive: true });

    const folderName = resolveUniqueFolderName(campaignsDir, day, monthNumber, year);
    const targetDir = path.join(campaignsDir, folderName);
    fs.mkdirSync(targetDir, { recursive: true });

    const captionsMap: Record<number, string> = {};
    const accessibleTextsMap: Record<number, string> = {};
    const savedUrls: string[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const slideNumber = i + 1;
      const ext = getSafeExtension(file.name, file.type);
      const outputFileName = `${slideNumber}${ext}`;
      const outputPath = path.join(targetDir, outputFileName);

      const arrayBuffer = await file.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

      savedUrls.push(`/mockup/campanhas/${folderName}/${outputFileName}`);

      const caption = typeof captionsList[i] === "string" ? captionsList[i].trim() : "";
      if (caption) {
        captionsMap[slideNumber] = caption;
      }

      const accessibleText =
        typeof accessibleTextsList[i] === "string"
          ? accessibleTextsList[i].trim()
          : "";
      if (accessibleText) {
        accessibleTextsMap[slideNumber] = accessibleText;
      }
    }

    const metadataPayload = {
      tag,
      title,
      description,
      captions: captionsMap,
      accessibleTexts: accessibleTextsMap,
    };

    fs.writeFileSync(
      path.join(targetDir, "metadata.json"),
      JSON.stringify(metadataPayload, null, 2),
      "utf-8"
    );

    revalidatePath("/mockup/campanhas");
    revalidatePath("/mockup");

    return NextResponse.json(
      {
        folderName,
        coverUrl: savedUrls[0],
        savedUrls,
        metadata: metadataPayload,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/mockup/campanhas] Erro ao salvar campanha:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar a campanha no servidor." },
      { status: 500 }
    );
  }
}

