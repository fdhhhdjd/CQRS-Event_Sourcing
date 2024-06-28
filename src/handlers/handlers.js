const { v4: uuidv4 } = require("uuid");
const { saveEvent } = require("../events/eventStore");
const {
  ORDER_CREATED,
  PAYMENT_PROCESSED,
  PRODUCT_RESERVED,
  NOTIFICATION_SENT,
} = require("../events/eventTypes");
const rabbitConnection = require("../dbs/init.rabbit");
const Order = require("../models/orderModel");
const Payment = require("../models/PaymentModel");
const Product = require("../models/productModel");

const createOrder = async (orderData) => {
  const orderId = uuidv4();
  const event = await saveEvent(orderId, ORDER_CREATED, orderData);

  await Order.create({ id: uuidv4(), ...orderData });

  await rabbitConnection.publish("OrderQueue", JSON.stringify(event));
  return event;
};

const processPayment = async (paymentData) => {
  const paymentId = uuidv4();
  const event = await saveEvent(paymentId, PAYMENT_PROCESSED, paymentData);
  await Payment.create({ id: paymentId, ...paymentData });

  await rabbitConnection.publish("PaymentQueue", JSON.stringify(event));
  return event;
};

const reserveProduct = async (productId, productData) => {
  const product = await Product.findOne({ where: { id: productId } });
  if (product) {
    product.stock -= 1; // Decrease stock by 1
    await product.save();
    const event = await saveEvent(productId, PRODUCT_RESERVED, productData);
    await rabbitConnection.publish("ProductQueue", JSON.stringify(event));
    return event;
  } else {
    throw new Error("Product not found");
  }
};

const sendNotification = async (notificationId, notificationData) => {
  const event = await saveEvent(
    notificationId,
    NOTIFICATION_SENT,
    notificationData
  );
  await rabbitConnection.publish("NotificationQueue", JSON.stringify(event));
  return event;
};

module.exports = {
  createOrder,
  processPayment,
  reserveProduct,
  sendNotification,
};
