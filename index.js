import express from "express";
import cors from "cors";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---------------- SCRAPE ROUTE ------------------

app.post("/scrape", async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: "Missing URL" });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
        });

        const prompt = `
Você recebe somente a URL de um produto:

${url}

Use Google Search para recuperar:
- Título oficial do produto
- Preço atual e moeda
- Imagem principal
- Imagens adicionais

Retorne APENAS este JSON:

{
  "title": "",
  "price_value": "",
  "price_currency": "",
  "main_image": "",
  "additional_images": []
}

NUNCA retorne texto fora do JSON.
        `;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }]
        });

        const raw = result.response.text();
        const first = raw.indexOf("{");
        const last = raw.lastIndexOf("}");

        const jsonString = raw.substring(first, last + 1);
        
        const data = JSON.parse(jsonString);

        return res.json(data);

    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Extraction failed" });
    }
});

// ---------------- HOME ROUTE ------------------

app.get("/", (req, res) => {
    res.send("Kero backend is running!");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Backend rodando na porta " + port));
