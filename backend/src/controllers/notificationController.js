const Notification = require('../models/Notification');

// GET /api/notifications — Get notifications for authenticated customer
async function getNotifications(req, res) {
  try {
    const customerId = req.user.sub;
    const notifications = await Notification.find({
      recipient: customerId,
      recipientModel: 'Customer'
    }).sort({ createdAt: -1 }).limit(50);

    const serialized = notifications.map(n => {
      const obj = n.toObject();
      obj.id = obj._id;
      delete obj._id;
      return obj;
    });

    return res.status(200).json({ notifications: serialized });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// GET /api/notifications/unread-count — Get unread notification count
async function getUnreadCount(req, res) {
  try {
    const customerId = req.user.sub;
    const count = await Notification.countDocuments({
      recipient: customerId,
      recipientModel: 'Customer',
      read: false
    });

    return res.status(200).json({ unreadCount: count });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /api/notifications/:id/read — Mark one notification as read
async function markAsRead(req, res) {
  try {
    const customerId = req.user.sub;
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: customerId, recipientModel: 'Customer' },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const obj = notification.toObject();
    obj.id = obj._id;
    delete obj._id;

    return res.status(200).json({ notification: obj });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// PATCH /api/notifications/read-all — Mark all notifications as read
async function markAllAsRead(req, res) {
  try {
    const customerId = req.user.sub;
    await Notification.updateMany(
      { recipient: customerId, recipientModel: 'Customer', read: false },
      { read: true, readAt: new Date() }
    );

    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Helper: Create a notification (used by other controllers)
async function createNotification({ recipientId, type, title, message, data }) {
  try {
    await Notification.create({
      recipient: recipientId,
      recipientModel: 'Customer',
      type,
      title,
      message,
      data
    });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    // Don't throw — notification failure should not break main operations
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification
};
