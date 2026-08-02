jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

const queue = require('./RedisQueue');

describe('RedisQueue disconnect', () => {
  afterEach(() => {
    queue.client = null;
    queue.subscriber = null;
    queue.connected = false;
    jest.clearAllMocks();
  });

  test('is idempotent when shutdown handlers disconnect twice', async () => {
    const client = { quit: jest.fn().mockResolvedValue(undefined) };
    const subscriber = { quit: jest.fn().mockResolvedValue(undefined) };

    queue.client = client;
    queue.subscriber = subscriber;
    queue.connected = true;

    await queue.disconnect();
    await queue.disconnect();

    expect(client.quit).toHaveBeenCalledTimes(1);
    expect(subscriber.quit).toHaveBeenCalledTimes(1);
    expect(queue.connected).toBe(false);
    expect(queue.client).toBeNull();
    expect(queue.subscriber).toBeNull();
  });
});
