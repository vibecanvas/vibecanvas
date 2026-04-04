import type { IFilesystemService } from '@vibecanvas/filesystem-service/IFilesystemService';

type TFilesystemApiContext = {
  filesystem: IFilesystemService;
  requestId?: string;
};

export type { TFilesystemApiContext };
