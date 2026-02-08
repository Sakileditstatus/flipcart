import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 5000;

async function scrapeFlipkartProduct(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });

  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);

  const finalUrl = page.url();

  const jsonLd = await page.$$eval(
    "script[type='application/ld+json']",
    els => (els.length ? els[0].innerText : null)
  );

  await browser.close();
  if (!jsonLd) return null;

  const data = JSON.parse(jsonLd);
  const product = Array.isArray(data) ? data[0] : data;

  const offer = product.offers || {};
  const rating = product.aggregateRating || {};

  return {
    name: product.name,
    brand: product.brand?.name,
    category: product.category,
    price: offer.price,
    currency: offer.priceCurrency,
    rating: rating.ratingValue,
    ratingCount: rating.ratingCount,
    reviewCount: rating.reviewCount,
    availability: offer.availability,
    images: product.image,
    product_url: finalUrl
  };
}

app.get("/flipkart-price", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: "error",
      message: "Missing url parameter"
    });
  }

  try {
    const product = await scrapeFlipkartProduct(url);
    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found"
      });
    }

    res.json({ status: "success", product });
  } catch (e) {
    res.status(500).json({
      status: "error",
      message: e.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("✅ Server running on port", PORT);
});
