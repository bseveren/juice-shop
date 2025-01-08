import { fetchWithToken } from '../../../../../connector/utils/fetchWithToken'

export default async function handler(req, res) {
  req = await StoreMiddlewares.getStore(req, res)
  if (!req) return res.status(404).json({})

  try {
    const decodedClaims = await checkUserSession(req, res)
    if (isEmpty(decodedClaims)) {
      return res.status(401).json({ error: 'Unauthorized request, Please try login again!' })
    }
    req.user = decodedClaims
    const { storeconfig } = req
    const API_URL = storeconfig?.payfac_api_url || null

    // Check PayFac configuration
    const payfacConfig = await checkPayfacConfig(req)
    if (payfacConfig?.error) {
      return res
        .status(500)
        .json({
          error:
            payfacConfig.error || 'An unexpected error occurred. Please refresh and try again!',
        })
    }
    // Parse request body if needed
    const params = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { order_data, order_id, ...other } = params
    // Validate Order Data
    const validateOrder = await validateOrderData(
      {
        order_data,
        paymentData: {},
        paymentReq: { payment_method: 'payfac', ...params },
      },
      req,
      res
    )
    if (!validateOrder || validateOrder?.error) {
      return res
        .status(500)
        .json({ error: validateOrder?.error || 'Something went wrong while validating the order!' })
    }
    // Initialize final parameters for payment intent
    let final_param = other
    // If no payment method ID is provided, calculate order lines
    if (!other?.payment_method_id) {
      const lines =
        validateOrder?.items?.map((item) => {
          const additionalChargesTotal =
            item.additional_charges?.reduce((sum, charge) => sum + parseFloat(charge.amount), 0) || 0
          const totalAmount =
            parseFloat(item.price) +
            parseFloat(item?.tax?.total || 0) +
            additionalChargesTotal +
            parseFloat(item?.bottledeposit || 0)
          return {
            product_code: item.stockcode.code,
            product_description: item?.name || '',
            quantity: item.quantity,
            unit_of_measure: item?.size || '',
            unit_price: item.price,
            discount_amount: 0,
            tax_amount: item?.tax?.total || 0,
            total_amount: totalAmount,
          }
        }) || []

      const receiptDetails = {
        customer_reference: req.user.user_id,
        shipping_amount: validateOrder?.neworder?.service_charge || 0,
        duty_amount: validateOrder?.neworder?.delivery_fee || 0,
        total_tax_amount: validateOrder?.neworder?.tax || 0,
        ship_to_zip: order_data?.address?.zipcode || '',
        ship_to_two_letter_country_code: order_data?.address?.countryName || 'US',
        ship_to_two_letter_state_province: order_data?.address?.short_statename || '',
        ship_from_zip: storeconfig?.bizpostcode || '',
        ship_from_two_letter_country_code: 'US',
        ship_from_letter_state_province: storeconfig.bizstate,
        order_date: Date.now(),
        lines,
      }
      final_param = { receipt_details: receiptDetails, ...other }
    }
    // Create payment intent
    const result = await fetchWithToken('post', `${API_URL}v2/payment/intent`, final_param)
    if (typeof result === 'string' || !result || result?.error) {
      if (result?.error?.message.includes('external_transaction_id that already exists')) {
        // Check for order existence and update data
        const orderResponse = await createOrder(
          {
            order: validateOrder,
            order_data,
            paymentData: result,
            paymentReq: { payment_method: 'payfac', ...params },
          },
          req,
          res
        )

        await ordersModel.updateOrderPayment(req, {
          request: JSON.stringify({ payment_method: 'payfac', ...params }),
          response: JSON.stringify(result),
          status: 'pending',
          order_id: orderResponse.neworder.id,
        })
