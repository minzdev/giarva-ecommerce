/**
 * Netlify Function — Midtrans Payment Notification (Webhook)
 *
 * Midtrans calls this endpoint automatically when payment status changes.
 *
 * Setup in Midtrans Dashboard:
 *   Settings → Configuration → Payment Notification URL:
 *   https://susugiarva.netlify.app/.netlify/functions/midtrans-notification
 *
 * Required env vars (already set in Netlify):
 *   MIDTRANS_SERVER_KEY
 *   VITE_FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL      ← service account email
 *   FIREBASE_PRIVATE_KEY       ← service account private key
 */

const crypto = require('crypto');

// Get Firebase access token using service account JWT
async function getFirebaseToken(clientEmail, privateKey) {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/datastore',
    })).toString('base64url');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(privateKey.replace(/\\n/g, '\n'), 'base64url');
    const jwt = `${header}.${payload}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    const data = await res.json();
    return data.access_token;
}

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!serverKey || !projectId) {
        console.error('Missing env vars');
        return { statusCode: 500, body: 'Server configuration error' };
    }

    let notification;
    try {
        notification = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, body: 'Invalid JSON' };
    }

    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = notification;

    // Verify Midtrans signature
    const expectedSignature = crypto
        .createHash('sha512')
        .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
        .digest('hex');

    if (signature_key !== expectedSignature) {
        console.error('Invalid signature for order:', order_id);
        return { statusCode: 403, body: 'Invalid signature' };
    }

    // Map transaction status to app status
    let newStatus = null;
    if (transaction_status === 'capture') {
        newStatus = fraud_status === 'accept' ? 'paid' : 'pending';
    } else if (transaction_status === 'settlement') {
        newStatus = 'paid';
    } else if (transaction_status === 'pending') {
        newStatus = 'pending';
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
        newStatus = 'cancelled';
    }

    if (!newStatus || !order_id) {
        return { statusCode: 200, body: 'No action needed' };
    }

    console.log(`Updating order ${order_id} to status: ${newStatus}`);

    try {
        let accessToken = null;

        // Try service account auth if credentials available
        if (clientEmail && privateKey) {
            try {
                accessToken = await getFirebaseToken(clientEmail, privateKey);
            } catch (e) {
                console.error('Service account auth failed:', e.message);
            }
        }

        // Build update fields
        const fields = {
            status: { stringValue: newStatus },
            midtransOrderId: { stringValue: order_id },
            updatedAt: { timestampValue: new Date().toISOString() },
        };
        if (newStatus === 'paid') {
            fields.paidAt = { timestampValue: new Date().toISOString() };
        }

        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${order_id}`;
        const updateMask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');

        const headers = { 'Content-Type': 'application/json' };
        let url = `${firestoreUrl}?${updateMask}`;

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        } else {
            // Fallback: use API key (works if Firestore rules allow writes)
            url += `&key=${process.env.VITE_FIREBASE_API_KEY}`;
        }

        const res = await fetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ fields }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('Firestore update failed:', err);
            return { statusCode: 500, body: 'Firestore update failed' };
        }

        console.log(`Order ${order_id} successfully updated to: ${newStatus}`);
        return { statusCode: 200, body: JSON.stringify({ ok: true, orderId: order_id, status: newStatus }) };
    } catch (error) {
        console.error('Error:', error.message);
        return { statusCode: 500, body: 'Internal error' };
    }
};
