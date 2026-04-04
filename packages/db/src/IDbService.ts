import type { IService, IStoppableService } from '@vibecanvas/runtime';

/**
 * Abstract database service contract.
 *
 * Important: this interface should not know about Drizzle, SQLite, or any
 * concrete persistence technology. Implementation-specific query surfaces live
 * on concrete classes like `DbServiceBunSqlite`.
 */
export interface IDbService extends IService, IStoppableService {}
