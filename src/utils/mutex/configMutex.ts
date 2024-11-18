let configUpdateLock = false;

/**
 * Acquire the lock
 * This function is used to lock the configuration update
 */
export function acquireLock() {
  configUpdateLock = true;
}

/**
 * Release the lock
 * This function is used to release the configuration update lock
 */
export function releaseLock() {
  configUpdateLock = false;
}

/**
 * Check if the lock is acquired
 * This function is used to check if the configuration update lock is acquired
 */
export function isLockAcquired() {
  return configUpdateLock;
}
