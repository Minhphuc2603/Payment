require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto'); // Import crypto library
const config = require('./config/config');

const app = express();

app.use(cors());
app.use(bodyParser.json());

let transactions = {}; // Lưu trữ trạng thái giao dịch

const generateTransactionId = () => {
  return crypto.randomBytes(4).toString('hex').substring(0, 7);
};

// Endpoint để tạo VietQR
app.post('/create-vietqr', (req, res) => {
  const { amount, courseName } = req.body;
  const transactionId = generateTransactionId();

  const qrUrl = `https://img.vietqr.io/image/${config.bankInfo.bankId}-${config.bankInfo.bankAccount}-${config.bankInfo.template}.png?amount=${amount}&addInfo=${encodeURIComponent(courseName + ' Ma giao dich ' + transactionId)}&accountName=${encodeURIComponent(config.bankInfo.accountName)}`;
  transactions[transactionId] = { status: 'pending', amount, courseName };

  res.json({ qrUrl, transactionId });
});
app.get('/check-transaction-status/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  const transaction = transactions[transactionId];

  if (transaction) {
    try {
      const response = await axios.get(`${config.casso.apiUrl}/transactions`, {
        headers: {
          'Authorization': `Apikey ${config.casso.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      console.log(response.data.data.records);
      const transactionsData = response.data.data.records;      
      const updatedTransaction = transactionsData.find(t => t.description.includes(transactionId));
      if (updatedTransaction) {
        // Giả sử nếu tìm thấy, cập nhật trạng thái thành 'success'
        transactions[transactionId].status = 'success';
        res.json({ status: 'success', transaction: updatedTransaction });
      } else {
        res.json({ status: 'pending' });
      }

    } catch (error) {
      console.error('Error checking transaction status:', error.response ? error.response.data : error.message);
      res.status(500).json({ error: 'Error checking transaction status' });
    }
  } else {
    res.status(404).json({ error: 'Transaction not found' });
  }
});
const PORT = process.env.PORT || 9999;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
