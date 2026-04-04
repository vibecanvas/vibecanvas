import { openConfiguredDb } from './usecases';

const handle = openConfiguredDb();

export const sqlite = handle.sqlite;
export default handle.db;
