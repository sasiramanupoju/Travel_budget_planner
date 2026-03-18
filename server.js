const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { require: true }
});

// Get all expenses
app.get('/api/expenses', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC');
        const expenses = result.rows;

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
        res.status(500).json({ error: 'Database error' });
    }
});

// Add new expense
app.post('/api/expenses', async (req, res) => {
    const { payer, amount, description, category, expense_date } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO expenses (payer, amount, description, category, expense_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [payer, amount, description, category, expense_date]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add expense' });
    }
});

// Update an expense (EDIT)
app.put('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const { payer, amount, description, category, expense_date } = req.body;
    try {
        const result = await pool.query(
            'UPDATE expenses SET payer = $1, amount = $2, description = $3, category = $4, expense_date = $5 WHERE id = $6 RETURNING *',
            [payer, amount, description, category, expense_date, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

// Delete an expense
app.delete('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM expenses WHERE id = $1', [id]);
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));