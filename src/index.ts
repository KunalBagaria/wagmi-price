import express, { Request, Response} from 'express';
import rateLimit from "express-rate-limit";
import axios from 'axios'

const app = express();

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100
});

const coinPrices: any[] = []

const getSavedPrice = (coin: string) => {
    const foundCoin = coinPrices.find(c => c.coin === coin)
    return foundCoin
}

const fetchAndSavePrice = async (coin: string, res: Response) => {
    console.log(`Fetching ${coin} price`)
    try {
        const fetchResponse = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin}`)
        const price = fetchResponse.data.market_data.current_price.usd
        if (!price) return
        coinPrices.push({ coin, price, time: new Date().toISOString() })
    } catch (e: any) {
        res.json(e)
    }
}

const checkOld = (saved: any) => {
    const now = Date.now()
    const savedTime = new Date(saved.time).getTime()
    const diff = (now - savedTime) / 1000
    if (diff > 30) {
        coinPrices.splice(coinPrices.indexOf(saved), 1)
        return true
    } else return false
}

app.get('/:coin', apiLimiter, async (req, res) => {
    const coin = req.params.coin;
    const savedPrice = getSavedPrice(coin);
    if (savedPrice && !checkOld(savedPrice)) {
        res.status(200).json(savedPrice);
    } else {
        const saving = await fetchAndSavePrice(coin, res)
        const newPrice = getSavedPrice(coin)
        if (newPrice) {
            res.status(200).json(newPrice)
            return
        }
    }
})

const port = process.env['PORT'] || 3000;

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})