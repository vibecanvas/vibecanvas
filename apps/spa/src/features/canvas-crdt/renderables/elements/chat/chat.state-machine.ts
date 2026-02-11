
export enum CONNECTION_STATE {
  NOT_CONNECTED = 'not_connected', // Initial state, multiplex
  CONNECTING = 'connecting', // Connecting to the chat server
  CONNECTED = 'connected', // Connected to the chat server
  FAILED_TO_CONNECT = 'failed_to_connect', // Failed to connect to the chat server
  RETRYING = 'retrying', // Retrying to connect to the chat server
  READY = 'ready', // Chat instance is ready to receive messages
  STREAMING = 'streaming', // Chat instance is streaming messages
  REQUESTING_HUMAN_INPUT = 'requesting_human_input', // Requesting human input for the chat instance
  PROCESS_REQUEST = 'process_request', // Between processing the request and streaming messages
  FINISHED = 'finished', // Response is delivered but human has not checked it yet
  ERROR = 'error', // Any error after which is not an network error
}

export const ALLOWED_STATE_TRANSITIONS: Record<CONNECTION_STATE, CONNECTION_STATE[]> = {
  [CONNECTION_STATE.NOT_CONNECTED]: [CONNECTION_STATE.CONNECTING],
  [CONNECTION_STATE.CONNECTING]: [CONNECTION_STATE.CONNECTED, CONNECTION_STATE.FAILED_TO_CONNECT],
  [CONNECTION_STATE.CONNECTED]: [CONNECTION_STATE.RETRYING, CONNECTION_STATE.READY],
  [CONNECTION_STATE.FAILED_TO_CONNECT]: [CONNECTION_STATE.RETRYING],
  [CONNECTION_STATE.RETRYING]: [CONNECTION_STATE.CONNECTED, CONNECTION_STATE.FAILED_TO_CONNECT, CONNECTION_STATE.REQUESTING_HUMAN_INPUT],
  [CONNECTION_STATE.READY]: [CONNECTION_STATE.STREAMING, CONNECTION_STATE.REQUESTING_HUMAN_INPUT],
  [CONNECTION_STATE.STREAMING]: [CONNECTION_STATE.FINISHED, CONNECTION_STATE.PROCESS_REQUEST],
  [CONNECTION_STATE.REQUESTING_HUMAN_INPUT]: [CONNECTION_STATE.PROCESS_REQUEST],
  [CONNECTION_STATE.PROCESS_REQUEST]: [CONNECTION_STATE.FINISHED, CONNECTION_STATE.ERROR],
  [CONNECTION_STATE.FINISHED]: [CONNECTION_STATE.CONNECTED],
  [CONNECTION_STATE.ERROR]: [],
}
