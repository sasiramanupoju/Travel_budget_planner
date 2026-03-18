const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to NeonDB
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { require: true }
});

// Get all expenses and calculate balances
app.get('/api/expenses', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC');
        const expenses = result.rows;

        // Calculate who owes whom
        let sasiTotal = 0;
        let lalithaTotal = 0;

        expenses.forEach(exp => {
            if (exp.payer === 'Sasi') sasiTotal += parseFloat(exp.amount);
            if (exp.payer === 'Lalitha') lalithaTotal += parseFloat(exp.amount);
        });

        const totalSpent = sasiTotal + lalithaTotal;
        const half = totalSpent / 2;
        
        let settlementMessage = "You're all squared up!";
        if (sasiTotal > half) {
            settlementMessage = `Lalitha owes Sasi ₹${(sasiTotal - half).toFixed(2)}`;
        } else if (lalithaTotal > half) {
            settlementMessage = `Sasi owes Lalitha ₹${(lalithaTotal - half).toFixed(2)}`;
        }

        res.json({ expenses, sasiTotal, lalithaTotal, settlementMessage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Add a new expense
app.post('/api/expenses', async (req, res) => {
    const { payer, amount, description, category, expense_date } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO expenses (payer, amount, description, category, expense_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [payer, amount, description, category, expense_date]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add expense' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));