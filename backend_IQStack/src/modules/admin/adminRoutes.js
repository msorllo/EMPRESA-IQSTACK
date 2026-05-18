const express = require('express');
const router = express.Router();
const db = require('../../infrastructure/database');
const bcrypt = require('bcrypt');

// GET /api/admin/clients -> Devuelve todos los clientes con su plan y usuario
router.get('/clients', async (req, res, next) => {
    try {
        const query = `
            SELECT c.*, u.email, u.role, cp.final_price_eur, hp.name as plan_name 
            FROM clients c
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN client_plans cp ON c.client_id = cp.client_id AND cp.is_active = 1
            LEFT JOIN hosting_plans hp ON cp.plan_id = hp.plan_id
        `;
        const result = await db.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/admin/clients -> Crea un nuevo cliente con plan
router.post('/clients', async (req, res, next) => {
    try {
        const { email, password, company_name, cif, client_type, phone, address, city, province, plan_id } = req.body;
        
        if (!email || !password || !company_name || !cif) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }

        // 1. Crear usuario
        const hash = await bcrypt.hash(password, 12);
        const userQuery = `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)`;
        await db.query(userQuery, [email, hash, 'Client_PYME']);
        
        // Obtener ID del usuario recién creado
        const user = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
        const userId = user.rows[0].user_id;

        // 2. Crear cliente
        const clientQuery = `
            INSERT INTO clients (user_id, company_name, cif, client_type, phone, address, city, province)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await db.query(clientQuery, [userId, company_name, cif, client_type || 'PYME', phone, address, city, province]);
        
        // Obtener ID del cliente recién creado
        const client = await db.query('SELECT client_id FROM clients WHERE user_id = $1', [userId]);
        const clientId = client.rows[0].client_id;

        // 3. Asignar plan
        const planIdVal = plan_id || 1; // Standard por defecto
        const plan = await db.query('SELECT * FROM hosting_plans WHERE plan_id = $1', [planIdVal]);
        const basePrice = plan.rows[0].price_eur;
        
        // Descuento del 20% si es ONG
        const discount = client_type === 'ONG' ? 20.0 : 0.0;
        const finalPrice = basePrice * (1 - (discount / 100));

        const planContractQuery = `
            INSERT INTO client_plans (client_id, plan_id, discount_pct, final_price_eur, start_date, is_active)
            VALUES ($1, $2, $3, $4, CURRENT_DATE, 1)
        `;
        await db.query(planContractQuery, [clientId, planIdVal, discount, finalPrice]);

        res.status(201).json({ success: true, message: 'Cliente registrado correctamente' });
    } catch (err) {
        next(err);
    }
});

// POST /api/admin/clients/:id/suspend -> Suspende o activa cliente
router.post('/clients/:id/suspend', async (req, res, next) => {
    try {
        const { id } = req.params;
        const clientResult = await db.query('SELECT is_active, user_id FROM clients WHERE client_id = $1', [id]);
        if (clientResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }
        
        const newStatus = clientResult.rows[0].is_active === 1 ? 0 : 1;
        await db.query('UPDATE clients SET is_active = $1 WHERE client_id = $2', [newStatus, id]);
        await db.query('UPDATE users SET is_active = $1 WHERE user_id = $2', [newStatus, clientResult.rows[0].user_id]);

        res.status(200).json({ success: true, message: `Cliente ${newStatus === 1 ? 'activado' : 'suspendido'} correctamente` });
    } catch (err) {
        next(err);
    }
});

// GET /api/admin/tickets -> Devuelve todos los tickets
router.get('/tickets', async (req, res, next) => {
    try {
        const query = `
            SELECT t.*, c.company_name, u.email as client_email 
            FROM support_tickets t
            JOIN clients c ON t.client_id = c.client_id
            JOIN users u ON c.user_id = u.user_id
            ORDER BY t.created_at DESC
        `;
        const result = await db.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// GET /api/admin/tickets/:id/messages -> Devuelve todos los mensajes de un ticket
router.get('/tickets/:id/messages', async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT tm.*, u.email, u.role 
            FROM ticket_messages tm
            JOIN users u ON tm.user_id = u.user_id
            WHERE tm.ticket_id = $1
            ORDER BY tm.created_at ASC
        `;
        const result = await db.query(query, [id]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/admin/tickets/:id/messages -> Envía un mensaje como soporte/admin
router.post('/tickets/:id/messages', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { message_body, user_id } = req.body;
        
        if (!message_body || !user_id) {
            return res.status(400).json({ success: false, message: 'Cuerpo de mensaje y user_id obligatorios' });
        }

        const insertQuery = `
            INSERT INTO ticket_messages (ticket_id, user_id, message_body)
            VALUES ($1, $2, $3)
        `;
        await db.query(insertQuery, [id, user_id, message_body]);
        
        // Actualizar estado del ticket a IN_PROGRESS
        await db.query('UPDATE support_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE ticket_id = $2', ['IN_PROGRESS', id]);

        res.status(201).json({ success: true, message: 'Mensaje enviado correctamente' });
    } catch (err) {
        next(err);
    }
});

// GET /api/admin/invoices -> Devuelve todas las facturas
router.get('/invoices', async (req, res, next) => {
    try {
        const query = `
            SELECT i.*, c.company_name 
            FROM invoices i
            JOIN clients c ON i.client_id = c.client_id
            ORDER BY i.issue_date DESC
        `;
        const result = await db.query(query);
        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/admin/invoices -> Crea una factura nueva
router.post('/invoices', async (req, res, next) => {
    try {
        const { client_id, description, amount } = req.body;
        if (!client_id || !amount) {
            return res.status(400).json({ success: false, message: 'Client ID y importe requeridos' });
        }

        const client = await db.query('SELECT client_type FROM clients WHERE client_id = $1', [client_id]);
        if (client.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        const vatPct = client.rows[0].client_type === 'ONG' ? 0.0 : 21.0;
        const vatAmount = amount * (vatPct / 100);
        const total = amount + vatAmount;
        
        // Generar número de factura secuencial simulado con aleatoriedad
        const invoiceNum = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        const insertInvoice = `
            INSERT INTO invoices (client_id, invoice_number, issue_date, due_date, subtotal_eur, vat_pct, vat_amount_eur, total_eur, status)
            VALUES ($1, $2, DATE('now'), DATE('now', '+15 days'), $3, $4, $5, $6, 'PENDING')
        `;
        await db.query(insertInvoice, [client_id, invoiceNum, amount, vatPct, vatAmount, total]);
        
        // Obtener la factura recién creada
        const newInvoice = await db.query('SELECT invoice_id FROM invoices WHERE invoice_number = $1', [invoiceNum]);
        const invoiceId = newInvoice.rows[0].invoice_id;

        // Crear línea de detalle
        await db.query(`
            INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_eur, line_total_eur)
            VALUES ($1, $2, 1, $3, $4)
        `, [invoiceId, description || 'Servicios Cloud Adicionales', amount, amount]);

        res.status(201).json({ success: true, message: 'Factura generada exitosamente' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
