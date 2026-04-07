import type { IService, IStoppableService } from '@vibecanvas/runtime';
import type {
  TPty,
  TPtyAttachArgs,
  TPtyAttachment,
  TPtyCreateBody,
  TPtyUpdateBody,
} from './types';

export interface IPtyService extends IService, IStoppableService {
  list(workingDirectory: string): TPty[];
  get(workingDirectory: string, ptyID: string): TPty | null;
  create(workingDirectory: string, body?: TPtyCreateBody): Promise<TPty>;
  update(workingDirectory: string, ptyID: string, body: TPtyUpdateBody): TPty | null;
  remove(workingDirectory: string, ptyID: string): Promise<boolean>;
  attach(args: TPtyAttachArgs): TPtyAttachment | null;
}
