require("dotenv").config({ path: "./.env" })

const { getArticleInfo } = require("./scraper")

const { URL } = require("url")
const newsSources = require("./news_sources.json")

const { ObjectId } = require("mongodb")

module.exports = (app, client) => {
  client.connect()
  app.get("/", async (req, res) => {
    try {
      const collection = client.db("NewsNudge").collection("urls")
      const urls = await collection.find({}).toArray()
      res.render("index", { urls })
    } catch (err) {
      res.status(500).json({ error: err.message })
    } finally {
    }
  })

  app.get("/all-urls", async (req, res) => {
    try {
      const collection = client.db("NewsNudge").collection("urls")

      const urls = await collection.find({}).toArray()

      res.json(urls)
    } catch (err) {
      res.status(500).json({ error: err.message })
    } finally {
    }
  })

  app.post("/add-url", async (req, res) => {
    const url = req.body.url
    if (!url) {
      return res.status(400).json({ error: "URL is required" })
    }

    let domain
    try {
      domain = new URL(url).hostname.replace(/^www\./, '')
    } catch (err) {
      return res.status(400).json({ error: "Invalid URL" })
    }

    if (!newsSources.domains.includes(domain)) {
        const email = "thomwilkinson@gmail.com"
        const subject = `${domain} is not included in database`
        const body = `Please add ${domain} to the NewsNudge database.`
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

      return res.status(400).render("error", { domain, mailtoLink })
      }

    try {
      const collection = client.db("NewsNudge").collection("urls")

      // Check if the URL already exists
      const existingUrl = await collection.findOne({ url: url })
      if (existingUrl) {
        const id = existingUrl._id
        console.log(`ID: ${id}`)
        return res.render("exists", { shortUrl: `https://newsnudge.ca/${id}` })
      }

      // Fetch article info
      const article = await getArticleInfo(url)
      const { title, description } = article
      const image_url = article.image_url

      // Insert the new URL into the MongoDB collection
      const result = await collection.insertOne({
        url,
        title,
        description,
        image: image_url,
      })

      res.render("index", {
        shortUrl: `https://newsnudge.ca/${result.insertedId}`,
      })
    } catch (err) {
      res.status(500).json({ error: err.message })
    } finally {
    }
  })

  app.get("/:id", async (req, res) => {
    console.log(req.params.id)
    const id = req.params.id

    try {
      const collection = client.db("NewsNudge").collection("urls")

      // Fetch the URL by its ObjectID
      const urlDocument = await collection.findOne({ _id: new ObjectId(id) })
      if (urlDocument) {
        res.status(200).render("redirect", {
          title: urlDocument.title,
          description: urlDocument.description,
          image: urlDocument.image,
          url: urlDocument.url,
        })
      } else {
        res.status(404).json({ error: "URL not found" })
      }
    } catch (err) {
      res.status(500).json({ error: err.message })
    } finally {
    }
  })
}
