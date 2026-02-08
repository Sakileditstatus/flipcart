import express from "express";
import { chromium } from "playwright";

const app = express();

app.get("/flipkart-price", async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ status: "error", message: "URL missing" });
  }

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const data = await page.evaluate(() => {
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (!jsonLd) return null;
      return JSON.parse(jsonLd.innerText);
    });

    await browser.close();

    if (!data) {
      return res.json({ status: "error", message: "Product data not found" });
    }

    res.json({
      status: "success",
      product: {
        name: data.name,
        brand: data.brand?.name || "Unknown",
        category: data.category,
        price: data.offers?.price,
        currency: data.offers?.priceCurrency,
        rating: data.aggregateRating?.ratingValue,
        ratingCount: data.aggregateRating?.ratingCount,
        availability: data.offers?.availability,
        images: data.image,
        product_url: url
      }
    });

  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
