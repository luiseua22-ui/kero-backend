import express from "express";
import cors from "cors";
import { GoogleAI } from "@google/genai";
import playwright from "playwright";

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/scrape", async (req, res) => {
  try {
    const { url } = req.body;

    // ======== 1. ABRIR O SITE COM PLAYWRIGHT (JS RODANDO) ========
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle" });

    // Pega o HTML já renderizado
    const renderedHtml = await page.content();
    await browser.close();

    // ======== 2. MANDAR PARA O GEMINI ========
    const prompt = `
Você recebe o HTML REAL e renderizado de uma página de produto.
Extraia APENAS o JSON abaixo:

{
  "title": "",
  "price_value": "",
  "price_currency": "",
  "main_image": "",
  "additional_images": []
}

Escolha assim:
TÍTULO:
- JSON-LD (product.name)
- og:title
- <h1>

PREÇO:
- JSON-LD offers.price
- Elementos com "price", "preço", "amount"
- Priorize preço perto de "comprar"

IMAGEM:
- JSON-LD image
- og:image
- Primeira imagem REAL do produto
- Ignore logos, banners, thumbnails, placeholders

HTML:
${renderedHtml}
`;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
    });

    const text = result.text();
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    const jsonString = text.substring(jsonStart, jsonEnd + 1);

    const productData = JSON.parse(jsonString);

    res.json(productData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao processar o scraping." });
  }
});

app.get("/", (req, res) => {
  res.send("Kero backend is running!");
});

app.listen(10000, () => {
  console.log("Backend rodando na porta 10000");
});

