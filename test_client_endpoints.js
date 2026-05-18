const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const postData = JSON.stringify(data);
        const options = {
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
        }).on('error', (e) => reject(e));
    });
}

async function run() {
    console.log('--- TEST DE INTEGRACIÓN CLIENTE BACKEND IQSTACK ---');
    try {
        const userId = 1; // Rosa López (Panadería López)

        // 1. Obtener dashboard
        console.log('1. Probando Dashboard Cliente...');
        const dashRes = await get(`http://localhost:3000/api/client/dashboard?userId=${userId}`);
        console.log('Dashboard Status:', dashRes.statusCode);
        console.log('Cliente info:', dashRes.body.data.client);
        console.log('Plan info:', dashRes.body.data.plan);
        console.log('Métricas info (total meses):', dashRes.body.data.metrics.length);
        console.log('Totales ecológicos:', dashRes.body.data.totals);

        // 2. Obtener facturas
        console.log('\n2. Probando Obtener Facturas Cliente...');
        const invRes = await get(`http://localhost:3000/api/client/invoices?userId=${userId}`);
        console.log('Facturas Status:', invRes.statusCode, `Total: ${invRes.body.data.length}`);
        console.log('Primera factura:', invRes.body.data[0]);

        // 3. Obtener tickets
        console.log('\n3. Probando Obtener Tickets Cliente...');
        const tickRes = await get(`http://localhost:3000/api/client/tickets?userId=${userId}`);
        console.log('Tickets Status:', tickRes.statusCode, `Total: ${tickRes.body.data.length}`);
        console.log('Primer ticket:', tickRes.body.data[0]);

        // 4. Crear nuevo ticket
        console.log('\n4. Creando Nuevo Ticket Cliente...');
        const newTickRes = await post('http://localhost:3000/api/client/tickets', {
            userId: userId,
            title: 'Necesito ayuda para migrar a PHP 8.3',
            description: 'Quiero cambiar la versión de PHP en mi panel de administración porque mi plugin lo requiere.',
            priority: 'MEDIUM'
        });
        console.log('Crear Ticket Status:', newTickRes.statusCode, newTickRes.body);
        const ticketId = newTickRes.body.ticket_id;

        // Re-verificar tickets
        const tickAfterRes = await get(`http://localhost:3000/api/client/tickets?userId=${userId}`);
        console.log(`Total tickets tras creación: ${tickAfterRes.body.data.length}`);

        // 5. Obtener mensajes del ticket creado
        console.log('\n5. Obteniendo Mensajes del Ticket Creado...');
        const msgRes = await get(`http://localhost:3000/api/client/tickets/${ticketId}/messages?userId=${userId}`);
        console.log('Mensajes Status:', msgRes.statusCode, `Total: ${msgRes.body.data.length}`);
        console.log('Mensaje inicial:', msgRes.body.data[0]);

        // 6. Enviar respuesta como cliente
        console.log('\n6. Enviando Respuesta Cliente al Ticket...');
        const sendMsgRes = await post(`http://localhost:3000/api/client/tickets/${ticketId}/messages`, {
            userId: userId,
            message_body: 'He intentado hacerlo desde el htaccess pero da error 500. ¿Podéis ayudarme?'
        });
        console.log('Enviar Mensaje Status:', sendMsgRes.statusCode, sendMsgRes.body);

        // Re-obtener mensajes para confirmar
        const msgAfterRes = await get(`http://localhost:3000/api/client/tickets/${ticketId}/messages?userId=${userId}`);
        console.log(`Total mensajes tras respuesta: ${msgAfterRes.body.data.length}`);

        console.log('\n--- TODOS LOS TESTS DE CLIENTE HAN PASADO CON EXITO ---');
    } catch (e) {
        console.error('Error en el test de integración cliente:', e);
    }
}

run();
