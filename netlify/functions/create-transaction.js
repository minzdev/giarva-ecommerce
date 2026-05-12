/**
 * Netlify Function — Create Midtrans Transaction
 *
 * Runs on Netlify free tier. Server Key stays here, never in the browser.
 *
 * Set these in Netlify Dashboard > Site > Environment Variables:
 *   MIDTRANS_SERVER_KEY    = SB-Mid-server-OCnTWnH4dKNIC3msM4PRZIA7
 *   MIDTRANS_IS_PRODUCTION = false
 */

exports.handler = async function (event) {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method not allowed' }) };
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    if (!serverKey) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Payment gateway not configured.' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch {
        return { statusCode: 400, body: JSON.stringify({ message: 'Invalid JSON body.' }) };
    }

    const { orderId, grossAmount, customerDetails, itemDetails = [], paymentMethodId } = body;

    if (!orderId || !grossAmount || !paymentMethodId) {
        return { statusCode: 400, body: JSON.stringify({ message: 'Missing required fields.' }) };
    }

    // Enabled payment methods based on selection
    const enabledPayments = paymentMethodId === 'qris'
        ? ['qris']
        : ['bca_va', 'bni_va', 'bri_va', 'mandiri_bill', 'permata_va'];

    // Ensure item total matches grossAmount (Midtrans strict requirement)
    const itemTotal = itemDetails.reduce(
        (sum, item) => sum + Math.round(item.price) * item.quantity,
        0
    );
    const adjustedItems = [...itemDetails];
    const diff = grossAmount - itemTotal;
    if (diff !== 0) {
        adjustedItems.push({ id: 'adj', name: 'Penyesuaian', price: diff, quantity: 1 });
    }

    const snapUrl = isProduction
        ? 'https://app.midtrans.com/snap/v1/transactions'
        : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const payload = {
        transaction_details: { order_id: orderId, gross_amount: grossAmount },
        customer_details: {
            first_name: customerDetails?.firstName || 'Pelanggan',
            phone: customerDetails?.phone || '',
        },
        item_details: adjustedItems.map((item) => ({
            id: String(item.id),
            name: String(item.name).substring(0, 50),
            price: Math.round(item.price),
            quantity: item.quantity,
        })),
        enabled_payments: enabledPayments,
    };

    try {
        const response = await fetch(snapUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            const errMsg = data.error_messages?.join(', ') || 'Midtrans error';
            return { statusCode: response.status, body: JSON.stringify({ message: errMsg }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ token: data.token, redirect_url: data.redirect_url }),
        };
    } catch (error) {
        console.error('Midtrans API error:', error.message);
        return { statusCode: 500, body: JSON.stringify({ message: 'Gagal menghubungi payment gateway.' }) };
    }
};
