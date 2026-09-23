// React Native's abort-controller lacks AbortSignal.throwIfAborted.
export function checkCancelled(signal?:AbortSignal) {
 if(signal?.aborted) {
  const error=new Error('Request cancelled');error.name='AbortError';
  throw signal.reason || error;
 }
}
