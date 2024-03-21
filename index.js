// utilizing puppeteerExtra for the stealthPlugin, which prevents bot detection
// @sparticuz/chromium to run Chromium on AWS Lambda in headless mode
import puppeteerExtra from 'puppeteer-extra'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'
import chromium from '@sparticuz/chromium'
// import aws-sdk to initialize AWS services
import AWS from 'aws-sdk'
// create an s3 bucket
const s3 = new AWS.S3({})

// SCRAPE sets the browser (chromium configs) and page to access our desired page URL
const scrape = async url => {
  try {
    puppeteerExtra.use(stealthPlugin())
    // BROWSER ---------------------
    const browser = await puppeteerExtra.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    })

    // PAGE ---------------------
    const page = await browser.newPage()
    await page.goto(url)

    // evaluatePage - create parent array of classes, then map to drill further into desired data
    const evaluatePage = await page.evaluate(() => {
      // array of selected classes
      const pageHeadlines = Array.from(document.querySelectorAll('.css-11jjg'))
      // map headlines to drill further
      const headlines = pageHeadlines.map(item => ({
        title: item.querySelector('.css-1u3p7j1').innerText,
        link: item.querySelector('a').href,
      }))
      // return array of our custom objects
      return headlines
    })
    // return evaluatePage which in effect returns our array of custom objects
    return evaluatePage

    // CLOSE PAGES ---------------------
    await browser.close()
    const pages = await browser.pages()
    await Promise.all(pages.map(async page => page.close()))
  } catch (error) {
    console.log('ERROR at scrape', error.message)
  }
}
// const data = await scrape('https://www.nytimes.com/section/world')
// console.log('DATA', data)

// LAMBDA HANDLER ---------------------
export const handler = async (event, context) => {
  // DATA variable from calling scrape()
  const data = await scrape('https://www.nytimes.com/section/world')

  // timeStamp used for object keys
  const timeStamp = new Date().toLocaleString('en-US')

  // PARAMS OBJECT to target bucket, set object key/name and payload
  const params = {
    Bucket: 'testscrapingbucket27',
    Key: timeStamp,
    Body: JSON.stringify(data),
  }
  // CREATE action that actually loads bucket
  const bucketData = await s3.putObject(params).promise()

  // RETURN
  return bucketData
}

// EXECUTE LOCAL
// const browser = await puppeteerExtra.launch({
//   headless: false,
//   // devtools: true
//   executablePath:
//     '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
// })
