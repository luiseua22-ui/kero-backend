import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import playwright from "playwright";

const app = express();
app.use(cors());
app.use(express.json());

// Gemini client para Node.js (correto)
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/scrape", async (req, res) => {
  try {
    const { url } = req.body;

    // ======== 1. Renderizar a página com Playwright ========
    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle" });

    const renderedHtml = await page.content();
    await browser.close();

    // ======== 2. Prompt para o Gemini ========
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

REGRAS:
- Título: JSON-LD, og:title, <h1>
- Preço: JSON-LD offers.price, elementos com "preço", "price"
- Imagem: JSON-LD image, og:image, primeira imagem real do produto
- Ignore thumbnails, logos e banners

HTML:
${renderedHtml}
`;

    const model = ai.getGenerativeModel({ model: "gemini-2.5-pro" });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

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

// rota raiz
app.get("/", (req, res) => {
  res.send("Kero backend is running!");
});

app.listen(10000, () => {
  console.log("Backend rodando na porta 10000");
});


