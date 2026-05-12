/**
 * Netlify Function — Midtrans Payment Notification (Webhook)
 *
 * Midtrans calls this endpoint automatically when payment status changes.
 * This is the reliable way to update order status — not dependent on browser callbacks.
 *
 * Setup in Midtrans Dashboard:
 *   Settings → Configuration → Payment Notification URL:
 *   https://susugiarva.netlify.app/.netlify/functions/midtrans-notification
 */

const crypto = require('crypto');

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
        return { statusCode: 500, body: 'Server key not configured' };
    }

    let notification;
    try {
        notification = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, body: 'Invalid JSON' };
    }

    const {
        order_id,
        status_code,
        gross_amount,
        signature_key,
        transaction_status,
        fraud_status,
    } = notification;

    // Verify signature to ensure request is from Midtrans
    const expectedSignature = crypto
        .createHash('sha512')
        .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
        .digest('hex');

    if (signature_key !== expectedSignature) {
        console.error('Invalid Midtrans signature');
        return { statusCode: 403, body: 'Invalid signature' };
    }

    // Determine order status based on Midtrans transaction_status
    let newStatus = null;

    if (transaction_status === 'capture') {
        newStatus = fraud_status === 'accept' ? 'paid' : 'pending';
    } else if (transaction_status === 'settlement') {
        newStatus = 'paid';
    } else if (transaction_status === 'pending') {
        newStatus = 'pending';
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
        newStatus = 'cancelled';
    } else if (transaction_status === 'refund') {
        newStatus = 'cancelled';
    }

    if (!newStatus || !order_id) {
        return { statusCode: 200, body: 'No action needed' };
    }

    // Update Firestore order document
    // Use Firebase Admin SDK via REST API (no npm install needed in Netlify Functions)
    try {
        const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

        // Get Firebase access token using service account
        // For simplicity, use Firestore REST API with API key
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/orders/${order_id}`;
        const apiKey = process.env.VITE_FIREBASE_API_KEY;

        const updateData = {
            fields: {
                status: { stringValue: newStatus },
                midtransOrderId: { stringValue: order_id },
                updatedAt: { timestampValue: new Date().toISOString() },
            },
        };

        if (newStatus === 'paid') {
            updateData.fields.paidAt = { timestampValue: new Date().toISOString() };
        }

        const res = await fetch(`${firestoreUrl}?updateMask.fieldPaths=status&updateMask.fieldPaths=midtransOrderId&updateMask.fieldPaths=updatedAt${newStatus === 'paid' ? '&updateMask.fieldPaths=paidAt' : ''}&key=${apiKey}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('Firestore update failed:', err);
            return { statusCode: 500, body: 'Firestore update failed' };
        }

        console.log(`Order ${order_id} updated to status: ${newStatus}`);
        return { statusCode: 200, body: JSON.stringify({ ok: true, status: newStatus }) };
    } catch (error) {
        console.error('Error updating order:', error.message);
        return { statusCode: 500, body: 'Internal error' };
    }
};
