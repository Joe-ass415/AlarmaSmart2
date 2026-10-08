require('dotenv').config();
const express = require('express');
const cors = require('cors');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    const finalAmount = amount && Number(amount) >= 50 ? Number(amount) : 299;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      paymentIntent: paymentIntent.client_secret,
    });
  } catch (e) {
    console.error('❌ Error de Stripe:', e.message);
    res.status(400).json({ error: e.message });
  }
});

app.listen(3000, () => console.log('Servidor de Stripe corriendo en http://localhost:3000'));