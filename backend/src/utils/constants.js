const STATUS = {
  BOOKED: 'booked',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const QUEUE_STATUS = {
  WAITING: 'waiting',
  CALLED: 'called',
  SERVING: 'serving',
  COMPLETED: 'completed',
  SKIPPED: 'skipped'
};

module.exports = {
  STATUS,
  QUEUE_STATUS
};
