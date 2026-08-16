import { getCargoConfig, getUfLabel } from "@/lib/cargos";
import type { CandidatoColinha, CargoConfig } from "@/lib/types";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

const COLORS = {
  consoleDeep: "#1c211f",
  console: "#2f3834",
  screen: "#e4eedc",
  screenDeep: "#c9d7c0",
  ink: "#1f2a25",
  muted: "#5b6a62",
  accent: "#176653",
  coral: "#d8795d",
  paper: "#fffdf8",
  white: "#ffffff",
};

export interface ColinhaShareRow {
  cargo: CargoConfig;
  candidato: CandidatoColinha;
}

function fontFamily() {
  if (typeof document === "undefined") {
    return "Arial, sans-serif";
  }

  const body = getComputedStyle(document.body).fontFamily;
  return body || "Arial, sans-serif";
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 3,
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  const last = lines[lines.length - 1];
  if (last && ctx.measureText(last).width > maxWidth) {
    let clipped = last;
    while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    lines[lines.length - 1] = `${clipped}…`;
  }

  return lines;
}

function fitLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight: string,
) {
  let nextSize = size;
  ctx.font = `${weight} ${nextSize}px ${fontFamily()}`;
  while (nextSize > 28 && ctx.measureText(text).width > maxWidth) {
    nextSize -= 2;
    ctx.font = `${weight} ${nextSize}px ${fontFamily()}`;
  }
  return nextSize;
}

function proxiedPhotoUrl(src: string) {
  try {
    const url = new URL(src, window.location.origin);
    if (url.origin === window.location.origin) {
      return src;
    }

    return `/api/foto?src=${encodeURIComponent(url.toString())}`;
  } catch {
    return null;
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    const timer = window.setTimeout(() => resolve(null), 4000);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    image.src = src;
  });
}

async function loadPhoto(src: string | null) {
  if (!src) {
    return null;
  }

  const proxied = proxiedPhotoUrl(src);
  if (!proxied) {
    return null;
  }

  return loadImage(proxied);
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Não foi possível criar a imagem."));
    }, "image/png");
  });
}

function createStoryCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível desenhar a imagem.");
  }
  return { canvas, ctx };
}

function paintBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.consoleDeep;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  ctx.fillStyle = COLORS.coral;
  ctx.fillRect(0, 0, STORY_WIDTH, 12);
}

function paintBrand(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = COLORS.coral;
  ctx.font = `700 28px ${fontFamily()}`;
  ctx.fillText("ELEIÇÕES 2026", 80, y);

  ctx.fillStyle = COLORS.paper;
  ctx.font = `800 54px ${fontFamily()}`;
  ctx.fillText("Colinha Eleitoral", 80, y + 64);
}

function paintFooter(ctx: CanvasRenderingContext2D, line: string) {
  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 26px ${fontFamily()}`;
  ctx.fillText(line, 80, STORY_HEIGHT - 168);
  ctx.fillText("Dados públicos do TSE · não é urna oficial", 80, STORY_HEIGHT - 128);
}

function paintDigits(
  ctx: CanvasRenderingContext2D,
  numero: string,
  y: number,
  box = 128,
) {
  const digits = numero.split("");
  const gap = 18;
  const total = digits.length * box + (digits.length - 1) * gap;
  let x = (STORY_WIDTH - total) / 2;

  digits.forEach((digit) => {
    roundRect(ctx, x, y, box, box + 16, 22);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = COLORS.screenDeep;
    ctx.stroke();

    ctx.fillStyle = COLORS.ink;
    ctx.font = `800 ${box * 0.62}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(digit, x + box / 2, y + (box + 16) / 2 + 4);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    x += box + gap;
  });
}

function paintPhoto(
  ctx: CanvasRenderingContext2D,
  photo: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  ctx.save();
  roundRect(ctx, x, y, width, height, 28);
  ctx.clip();
  ctx.fillStyle = COLORS.screenDeep;
  ctx.fillRect(x, y, width, height);

  const scale = Math.min(width / photo.width, height / photo.height);
  const drawWidth = photo.width * scale;
  const drawHeight = photo.height * scale;
  ctx.drawImage(
    photo,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  ctx.restore();
}

export async function renderCandidateStory(
  uf: string,
  candidato: CandidatoColinha,
) {
  await document.fonts.ready;

  const { canvas, ctx } = createStoryCanvas();
  const cargoLabel = getCargoConfig(candidato.cargo, uf).label;
  const place = getUfLabel(uf);
  const isLegenda = candidato.tipoVoto === "legenda";
  const photo = isLegenda ? null : await loadPhoto(candidato.fotoUrl);

  paintBackground(ctx);
  paintBrand(ctx, 170);

  roundRect(ctx, 56, 300, STORY_WIDTH - 112, 1280, 44);
  ctx.fillStyle = COLORS.console;
  ctx.fill();

  roundRect(ctx, 80, 324, STORY_WIDTH - 160, 1232, 32);
  ctx.fillStyle = COLORS.screen;
  ctx.fill();

  ctx.fillStyle = COLORS.muted;
  ctx.font = `700 28px ${fontFamily()}`;
  ctx.fillText(isLegenda ? "VOTO SÓ NO PARTIDO" : "SEU VOTO PARA", 120, 400);

  ctx.fillStyle = COLORS.ink;
  const cargoSize = fitLine(ctx, cargoLabel, 840, 72, "800");
  ctx.font = `800 ${cargoSize}px ${fontFamily()}`;
  ctx.fillText(cargoLabel, 120, 480);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 28px ${fontFamily()}`;
  ctx.fillText(
    candidato.cargo === "presidente" ? "Brasil" : place,
    120,
    528,
  );

  if (photo) {
    paintPhoto(ctx, photo, 360, 580, 360, 460);
  }

  const name = isLegenda ? candidato.partido : candidato.nomeUrna;
  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 64px ${fontFamily()}`;
  const nameLines = wrapText(ctx, name, 840, photo ? 2 : 3);
  const nameTop = photo ? 1090 : 700;
  nameLines.forEach((line, index) => {
    ctx.fillText(line, 120, nameTop + index * 74);
  });

  if (!isLegenda) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 32px ${fontFamily()}`;
    ctx.fillText(candidato.partido, 120, nameTop + nameLines.length * 74 + 16);
  } else if (candidato.nomeUrna !== candidato.partido) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `600 32px ${fontFamily()}`;
    ctx.fillText(candidato.nomeUrna, 120, nameTop + nameLines.length * 74 + 16);
  }

  paintDigits(ctx, candidato.numero, 1380, candidato.numero.length > 4 ? 108 : 128);
  paintFooter(ctx, "Confira os dados públicos antes de votar.");

  return canvasToBlob(canvas);
}

export async function renderColinhaStory(uf: string, rows: ColinhaShareRow[]) {
  await document.fonts.ready;

  const { canvas, ctx } = createStoryCanvas();
  const place = getUfLabel(uf);

  paintBackground(ctx);
  paintBrand(ctx, 160);

  ctx.fillStyle = COLORS.paper;
  ctx.font = `800 72px ${fontFamily()}`;
  ctx.fillText("Minha colinha", 80, 320);

  ctx.fillStyle = COLORS.coral;
  ctx.font = `700 30px ${fontFamily()}`;
  ctx.fillText(`${place}  ·  4 de outubro de 2026`, 80, 372);

  roundRect(ctx, 56, 430, STORY_WIDTH - 112, 1180, 40);
  ctx.fillStyle = COLORS.screen;
  ctx.fill();

  const rowHeight = Math.min(176, 1080 / Math.max(rows.length, 1));
  rows.forEach((row, index) => {
    const y = 470 + index * rowHeight;
    const isLegenda = row.candidato.tipoVoto === "legenda";
    const cargoLabel =
      row.cargo.slug === "deputado-estadual" && uf === "DF"
        ? "Deputado Distrital"
        : row.cargo.label;
    const nome = isLegenda ? row.candidato.partido : row.candidato.nomeUrna;

    if (index > 0) {
      ctx.fillStyle = COLORS.screenDeep;
      ctx.fillRect(88, y - 18, STORY_WIDTH - 176, 3);
    }

    ctx.fillStyle = COLORS.muted;
    ctx.font = `700 24px ${fontFamily()}`;
    ctx.fillText(
      isLegenda ? `${cargoLabel.toLocaleUpperCase("pt-BR")} · LEGENDA` : cargoLabel.toLocaleUpperCase("pt-BR"),
      96,
      y + 8,
    );

    ctx.fillStyle = COLORS.ink;
    ctx.font = `800 36px ${fontFamily()}`;
    const nameLine = wrapText(ctx, nome, 620, 1)[0] ?? nome;
    ctx.fillText(nameLine, 96, y + 54);

    ctx.fillStyle = COLORS.accent;
    ctx.font = `800 56px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = "right";
    ctx.fillText(row.candidato.numero, STORY_WIDTH - 96, y + 54);
    ctx.textAlign = "left";
  });

  paintFooter(ctx, "Leve no papel. Celular não entra na cabine.");

  return canvasToBlob(canvas);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
