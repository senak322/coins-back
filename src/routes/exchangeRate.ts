import { Router } from 'express';
import { getLatestExchangeRates } from '../services/exchangeRateService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const latestRates = await getLatestExchangeRates();
    if (latestRates) {
      res.json({
        rates: latestRates.rates,
        timestamp: latestRates.timestamp,
      });
    } else {
      res.status(404).json({ message: 'Exchange rates not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
