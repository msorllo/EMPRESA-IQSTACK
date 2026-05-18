const express = require('express');
const router = express.Router();
const db = require('../../infrastructure/database');

// Middleware auxiliar para obtener el client_id a partir de un user_id
async function getClientId(userId) {
    if (!userId) return null;
    const result = await db.query('SELECT client_id, company_name, client_type FROM clients WHERE user_id = $1', [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

// GET /api/client/dashboard?userId=X -> Datos del panel de control
router.get('/dashboard', async (req, res, next) => {
    try {
        const { userId } = req.query;
        const clientInfo = await getClientId(userId);
        if (!clientInfo) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado para el usuario dado.' });
        }

        // 1. Obtener plan contratado activo
        const planQuery = `
            SELECT cp.final_price_eur, hp.name as plan_name, hp.cpu_cores, hp.ram_gb, hp.ssd_gb
            FROM client_plans cp
            JOIN hosting_plans hp ON cp.plan_id = hp.plan_id
            WHERE cp.client_id = $1 AND cp.is_active = 1
            LIMIT 1
        `;
        const planRes = await db.query(planQuery, [clientInfo.client_id]);
        const activePlan = planRes.rows.length > 0 ? planRes.rows[0] : null;

        // 2. Obtener métricas ecológicas históricas (últimos 4 meses)
        const metricsQuery = `
            SELECT metric_month, kwh_generated, kwh_consumed, kwh_saved, co2_saved_kg, renewable_pct
            FROM ecological_metrics
            WHERE client_id = $1
            ORDER BY metric_month ASC
            LIMIT 4
        `;
        const metricsRes = await db.query(metricsQuery, [clientInfo.client_id]);
        const metrics = metricsRes.rows;

        // 3. Calcular totales acumulados
        const totalsQuery = `
            SELECT 
                SUM(kwh_generated) as total_kwh_generated,
                SUM(kwh_consumed) as total_kwh_consumed,
                SUM(kwh_saved) as total_kwh_saved,
                SUM(co2_saved_kg) as total_co2_saved
            FROM ecological_metrics
            WHERE client_id = $1
        `;
        const totalsRes = await db.query(totalsQuery, [clientInfo.client_id]);
        const totals = totalsRes.rows.length > 0 ? totalsRes.rows[0] : {
            total_kwh_generated: 0,
            total_kwh_consumed: 0,
            total_kwh_saved: 0,
            total_co2_saved: 0
        };

        res.status(200).json({
            success: true,
            data: {
                client: clientInfo,
                plan: activePlan,
                metrics: metrics,
                totals: totals
            }
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/client/invoices?userId=X -> Obtiene todas las facturas del cliente
router.get('/invoices', async (req, res, next) => {
    try {
        const { userId } = req.query;
        const clientInfo = await getClientId(userId);
        if (!clientInfo) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        const query = `
            SELECT i.* 
            FROM invoices i
            WHERE i.client_id = $1
            ORDER BY i.issue_date DESC
        `;
        const result = await db.query(query, [clientInfo.client_id]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// GET /api/client/tickets?userId=X -> Obtiene los tickets de soporte del cliente
router.get('/tickets', async (req, res, next) => {
    try {
        const { userId } = req.query;
        const clientInfo = await getClientId(userId);
        if (!clientInfo) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        const query = `
            SELECT t.*, u.email as tech_email 
            FROM support_tickets t
            LEFT JOIN users u ON t.assigned_to_user_id = u.user_id
            WHERE t.client_id = $1
            ORDER BY t.created_at DESC
        `;
        const result = await db.query(query, [clientInfo.client_id]);
        res.status(200).json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
});

// POST /api/client/tickets -> Crea un nuevo ticket de soporte
router.post('/tickets', async (req, res, next) => {
    try {
        const { userId, title, description, priority } = req.body;
        if (!userId || !title || !description) {
            return res.status(400).json({ success: false, message: ' userId, título y descripción obligatorios' });
        }

        const clientInfo = await getClientId(userId);
        if (!clientInfo) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        // Asignar un técnico de soporte predeterminado (por ejemplo, el usuario con id 3 que es Unai)
        const defaultTechId = 3; 

        const insertQuery = `
            INSERT INTO support_tickets (client_id, assigned_to_user_id, opened_by_user_id, title, description, priority, status, channel)
            VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', 'CHAT')
        `;
        await db.query(insertQuery, [
            clientInfo.client_id,
            defaultTechId,
            userId,
            title,
            description,
            priority || 'MEDIUM'
        ]);

        // Obtener el ID del ticket insertado
        const ticketRes = await db.query('SELECT ticket_id FROM support_tickets WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1', [clientInfo.client_id]);
        const ticketId = ticketRes.rows[0].ticket_id;

        // Crear el mensaje inicial en ticket_messages
        const msgQuery = `
            INSERT INTO ticket_messages (ticket_id, user_id, message_body)
            VALUES ($1, $2, $3)
        `;
        await db.query(msgQuery, [ticketId, userId, description]);

        res.status(201).json({ success: true, message: 'Ticket de soporte creado correctamente', ticket_id: ticketId });
    } catch (err) {
        next(err);
    }
});

// GET /api/client/tickets/:id/messages?userId=X -> Obtiene los mensajes de un ticket
router.get('/tickets/:id/messages', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;
        
        const clientInfo = await getClientId(userId);
        if (!clientInfo) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        // Validar que el ticket pertenece al cliente
        const ticketCheck = await db.query('SELECT client_id FROM support_tickets WHERE ticket_id = $1', [id]);
        if (ticketCheck.rows.length === 0 || ticketCheck.rows[0].client_id !== clientInfo.client_id) {
            return res.status(403).json({ success: false, message: 'No tienes acceso a este ticket' });
        }

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

// POST /api/client/tickets/:id/messages -> Envía un mensaje como cliente
router.post('/tickets/:id/messages', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { userId, message_body } = req.body;
        
        if (!userId || !message_body) {
            return res.status(400).json({ success: false, message: 'userId y message_body requeridos' });
        }

        const clientInfo = await getClientId(userId);
        if (!clientInfo) {
            return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
        }

        // Validar que el ticket pertenece al cliente
        const ticketCheck = await db.query('SELECT client_id FROM support_tickets WHERE ticket_id = $1', [id]);
        if (ticketCheck.rows.length === 0 || ticketCheck.rows[0].client_id !== clientInfo.client_id) {
            return res.status(403).json({ success: false, message: 'No tienes acceso a este ticket' });
        }

        const insertQuery = `
            INSERT INTO ticket_messages (ticket_id, user_id, message_body)
            VALUES ($1, $2, $3)
        `;
        await db.query(insertQuery, [id, userId, message_body]);
        
        // Actualizar fecha del ticket
        await db.query('UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE ticket_id = $1', [id]);

        res.status(201).json({ success: true, message: 'Mensaje enviado correctamente' });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
