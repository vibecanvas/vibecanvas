import type { IService, IStoppableService } from '@vibecanvas/runtime';
import type {
  TPty,
  TPtyAttachArgs,
  TPtyAttachment,
  TPtyCreateBody,
  TPtyUpdateBody,
} from './types';

export interface IPtyService extends IService, IStoppableService {
  list(filesystemId: string, workingDirectory: string): TPty[];
  get(filesystemId: string, workingDirectory: string, ptyID: string): TPty | null;
  create(filesystemId: string, workingDirectory: string, body?: TPtyCreateBody): Promise<TPty>;
  update(filesystemId: string, workingDirectory: string, ptyID: string, body: TPtyUpdateBody): TPty | null;
  remove(filesystemId: string, workingDirectory: string, ptyID: string): Promise<boolean>;
  attach(args: TPtyAttachArgs): TPtyAttachment | null;
}
