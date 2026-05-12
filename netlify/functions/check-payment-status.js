/**
 * Netlify Function — Check Midtrans Payment Status
 *
 * Frontend polls this after Snap closes to get the real payment status.
 * Called with: GET /.netlify/functions/check-payment-status?orderId=xxx
 */

exports.handler = async function (event) {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    const orderId = event.queryStringParameters?.orderId;
    if (!orderId) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Missing orderId' }) };
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    const statusUrl = isProduction
        ? `https://api.midtrans.com/v2/${orderId}/status`
        : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    try {
        const response = await fetch(statusUrl, {
            headers: {
                Authorization: `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
            },
        });

        const data = await response.json();

        // Map Midtrans status to our app status
        let appStatus = 'pending_payment';
        const ts = data.transaction_status;

        if (ts === 'settlement' || (ts === 'capture' && data.fraud_status === 'accept')) {
            appStatus = 'paid';
        } else if (ts === 'pending') {
            appStatus = 'pending';
        } else if (['cancel', 'deny', 'expire'].includes(ts)) {
            appStatus = 'cancelled';
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                orderId,
                midtransStatus: ts,
                appStatus,
                grossAmount: data.gross_amount,
            }),
        };
    } catch (error) {
        console.error('Error checking payment status:', error.message);
        return { statusCode: 500, body: JSON.stringify({ message: 'Failed to check status' }) };
    }
};
